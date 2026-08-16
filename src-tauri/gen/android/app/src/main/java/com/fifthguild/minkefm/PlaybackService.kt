package com.fifthguild.minkefm

import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.MediaItem
import androidx.media3.common.Metadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy
import androidx.media3.exoplayer.upstream.LoadErrorHandlingPolicy
import androidx.media3.extractor.metadata.icy.IcyHeaders
import androidx.media3.extractor.metadata.icy.IcyInfo
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/**
 * Holds the player, outside the activity.
 *
 * This is the whole reason Android does not simply reuse the webview <audio>
 * element the desktop build uses: a foreground MediaSessionService keeps
 * playing when the app is backgrounded or the screen is locked, and gives the
 * lock screen its transport controls. A webview gets suspended instead.
 *
 * Reconnection lives here for the same reason. The desktop keeps that logic in
 * JavaScript, but a backgrounded webview is throttled or suspended - which is
 * exactly when a radio most needs to recover on its own.
 */
class PlaybackService : MediaSessionService() {

    private var session: MediaSession? = null
    private var player: ExoPlayer? = null

    /**
     * Whether the current station has ever produced sound.
     *
     * Patience is worth spending on a stream that worked and dropped; on one
     * that never connected it is just a wait before moving to the next station.
     */
    @Volatile
    private var hasPlayed = false
    private var lastUri: String? = null

    private val handler = Handler(Looper.getMainLooper())
    private var retryDelay = FIRST_RETRY_MS
    private var retryPending = false

    private var connectivity: ConnectivityManager? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    override fun onCreate() {
        super.onCreate()
        instance = this

        // ExoPlayer does not ask for Icecast metadata on its own: without this
        // header the station simply never sends track titles, so nothing
        // downstream - artist, album, artwork, lyrics - can ever appear.
        val http = DefaultHttpDataSource.Factory()
            .setUserAgent("minke-fm/0.1")
            .setDefaultRequestProperties(
                mapOf(
                    IcyHeaders.REQUEST_HEADER_ENABLE_METADATA_NAME to
                        IcyHeaders.REQUEST_HEADER_ENABLE_METADATA_VALUE
                )
            )
            // Stations redirect between http and https constantly; ExoPlayer
            // refuses to follow that by default and the stream just fails.
            .setAllowCrossProtocolRedirects(true)
            .setReadTimeoutMs(15_000)

        /*
         * The connect timeout is the whole cost of a broken station, and it is
         * paid twice before moving on - measured at 8s each against a host that
         * accepts packets and never completes the handshake. So it is chosen
         * per situation: short while hunting for something that plays, patient
         * once a station has earned it. The factory is re-configured on each
         * load rather than fixed up front, since the answer changes.
         */
        val sources = DefaultMediaSourceFactory(
            DataSource.Factory {
                http.setConnectTimeoutMs(
                    if (hasPlayed) RECONNECT_TIMEOUT_MS else CONNECT_TIMEOUT_MS
                )
                http.createDataSource()
            }
        ).setLoadErrorHandlingPolicy(LivePolicy())

        val exo = ExoPlayer.Builder(this)
            .setMediaSourceFactory(sources)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .build(),
                // true: let ExoPlayer handle audio focus, so a phone call pauses
                // us and a notification ducks us without any work here.
                true
            )
            // Unplugging headphones should pause, not blast out of the speaker.
            .setHandleAudioBecomingNoisy(true)
            .build()

        exo.addListener(object : Player.Listener {
            // In-band Icecast titles are an ExoPlayer-level callback: a
            // MediaController does not receive `onMetadata`, because the
            // MediaSession protocol does not carry it. Listening here, on the
            // real player, is the only place it arrives.
            override fun onMetadata(metadata: Metadata) {
                for (i in 0 until metadata.length()) {
                    val entry = metadata.get(i)
                    if (entry is IcyInfo) {
                        entry.title?.takeIf { it.isNotBlank() }?.let { onIcyTitle?.invoke(it) }
                    }
                }
            }

            override fun onMediaItemTransition(item: MediaItem?, reason: Int) {
                val uri = item?.localConfiguration?.uri?.toString()
                // `replaceMediaItem`, used to refresh the notification's track
                // info, fires this with the same URI. Only a real station
                // change starts the patience over.
                if (uri != lastUri) {
                    lastUri = uri
                    hasPlayed = false
                    resetBackoff()
                }
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                // Sound is coming out, so whatever went wrong is behind us.
                if (isPlaying) {
                    hasPlayed = true
                    resetBackoff()
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                // The load policy's own retries are already spent by the time
                // this fires. Going idle here is what would leave a station
                // silently dead until someone opened the app; instead the
                // service keeps trying on its own schedule, indefinitely.
                scheduleRetry()
            }
        })

        player = exo
        session = MediaSession.Builder(this, StationPlayer(exo)).build()

        watchNetwork()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo) = session

    /**
     * Retry policy for a live stream, and it depends entirely on whether the
     * station has played yet.
     *
     * Once a stream is established a load error is nearly always the network
     * wobbling, and the default three attempts give up long before a lift or a
     * tunnel is over. Before the first byte of audio it is the opposite: the
     * station is most likely simply broken, and every retry here is multiplied
     * by the outer backoff and by the JS attempt counter above it - which is
     * what made a dead station take minutes to be skipped instead of seconds.
     */
    private inner class LivePolicy : DefaultLoadErrorHandlingPolicy() {
        override fun getMinimumLoadableRetryCount(dataType: Int): Int =
            if (hasPlayed) LOAD_RETRIES_PLAYING else LOAD_RETRIES_CONNECTING

        override fun getRetryDelayMsFor(info: LoadErrorHandlingPolicy.LoadErrorInfo): Long {
            // 1s, 2s, 4s... rather than the default's flat short waits.
            val step = (info.errorCount - 1).coerceIn(0, 4)
            return (FIRST_RETRY_MS shl step).coerceAtMost(MAX_RETRY_MS)
        }
    }

    /** Queues another attempt, backing off so a dead host is not hammered. */
    private fun scheduleRetry() {
        if (retryPending) return
        retryPending = true

        handler.postDelayed({
            retryPending = false
            val target = player ?: return@postDelayed
            // Only if playback is still wanted: a user pause must not be undone
            // by a reconnect that was already in flight.
            if (target.playWhenReady) target.prepare()
        }, retryDelay)

        retryDelay = (retryDelay * 2).coerceAtMost(MAX_RETRY_MS)
    }

    private fun resetBackoff() {
        retryDelay = FIRST_RETRY_MS
        handler.removeCallbacksAndMessages(null)
        retryPending = false
    }

    /**
     * Recover the moment the network comes back.
     *
     * Without this the stream would sit out whatever backoff it had reached -
     * up to half a minute of silence after the signal returned. It also covers
     * the handover between wifi and mobile data, which has no desktop
     * equivalent: the old connection dies and a different one appears.
     */
    private fun watchNetwork() {
        val manager = getSystemService(ConnectivityManager::class.java) ?: return

        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                handler.post {
                    val target = player ?: return@post
                    if (target.playerError != null && target.playWhenReady) {
                        resetBackoff()
                        target.prepare()
                    }
                }
            }
        }

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        runCatching { manager.registerNetworkCallback(request, callback) }
            .onSuccess {
                connectivity = manager
                networkCallback = callback
            }
    }

    /**
     * A radio has no playlist, so the notification's next/previous buttons must
     * mean "next station". Media3 hides those buttons unless the player claims
     * the commands, so they are advertised here and the actual seek is replaced
     * by a callback the plugin turns into an event.
     */
    private inner class StationPlayer(player: Player) : ForwardingPlayer(player) {

        override fun getAvailableCommands(): Player.Commands =
            super.getAvailableCommands()
                .buildUpon()
                .addAll(COMMAND_SEEK_TO_NEXT, COMMAND_SEEK_TO_PREVIOUS)
                .build()

        override fun isCommandAvailable(command: Int): Boolean = when (command) {
            COMMAND_SEEK_TO_NEXT, COMMAND_SEEK_TO_PREVIOUS -> true
            else -> super.isCommandAvailable(command)
        }

        override fun seekToNext() {
            onStationChange?.invoke(true)
        }

        override fun seekToNextMediaItem() {
            onStationChange?.invoke(true)
        }

        override fun seekToPrevious() {
            onStationChange?.invoke(false)
        }

        override fun seekToPreviousMediaItem() {
            onStationChange?.invoke(false)
        }
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        networkCallback?.let { callback ->
            runCatching { connectivity?.unregisterNetworkCallback(callback) }
        }
        networkCallback = null
        connectivity = null

        session?.run {
            player.release()
            release()
        }
        session = null
        player = null
        if (instance === this) instance = null
        super.onDestroy()
    }

    companion object {
        /**
         * Waiting on a first connect. A radio server that cannot complete a TCP
         * handshake in five seconds is not going to stream well, and every
         * second here is silence while hunting for a station that works.
         */
        private const val CONNECT_TIMEOUT_MS = 5_000

        /**
         * Waiting on a station that has already played. Worth more patience:
         * this is a phone on a bad connection, not a dead host.
         */
        private const val RECONNECT_TIMEOUT_MS = 12_000

        /** How long the first retry waits; each further one doubles it. */
        private const val FIRST_RETRY_MS = 1_000L

        /** Ceiling on the backoff. The network callback usually beats it. */
        private const val MAX_RETRY_MS = 30_000L

        /**
         * Load retries once the stream is running: these ride out a blip inside
         * a connected stream, while riding out a real outage is the retry
         * loop's job.
         */
        private const val LOAD_RETRIES_PLAYING = 3

        /**
         * And none at all before the first sound. The layer above already
         * allows a second attempt, so a station still gets two chances to
         * connect - it just gets them in seconds rather than minutes.
         */
        private const val LOAD_RETRIES_CONNECTING = 0

        /**
         * Set by the plugin. `true` means next station, `false` previous.
         * Lives here because the notification's buttons reach the service, not
         * the activity, and the activity may not even exist.
         */
        @Volatile
        var onStationChange: ((Boolean) -> Unit)? = null

        /** Set by the plugin. Carries the station's announced track title. */
        @Volatile
        var onIcyTitle: ((String) -> Unit)? = null

        @Volatile
        private var instance: PlaybackService? = null

        /**
         * Ends playback for good.
         *
         * `stopService` alone does nothing while a controller is bound, so the
         * caller releases that first; this then silences the player and lets
         * the service go, taking the notification with it.
         */
        fun shutdown() {
            instance?.let { service ->
                service.resetBackoff()
                service.session?.player?.stop()
                service.stopSelf()
            }
        }
    }
}
