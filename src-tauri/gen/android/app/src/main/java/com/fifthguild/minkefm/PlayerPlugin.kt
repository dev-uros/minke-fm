package com.fifthguild.minkefm

import android.app.Activity
import android.content.ComponentName
import android.net.Uri
import android.webkit.WebView
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Metadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.common.util.concurrent.MoreExecutors

@InvokeArg
class PlayArgs {
    var url: String = ""
    var title: String? = null
    var artist: String? = null
    var artwork: String? = null
}

@InvokeArg
class VolumeArgs {
    var volume: Float = 1.0f
}

/**
 * The frontend's window onto the playback service.
 *
 * Deliberately thin: it owns no playback state of its own. Which station plays
 * next is decided in the webview, exactly as on desktop - this only carries the
 * instruction across and reports back what the player did.
 */
@TauriPlugin
class PlayerPlugin(private val activity: Activity) : Plugin(activity) {

    companion object {
        /** Set on load, called by MainActivity when the user chooses to exit. */
        @Volatile
        var releaseController: (() -> Unit)? = null
    }

    private var controller: MediaController? = null
    /** Volume survives until a controller exists to apply it to. */
    private var pendingVolume: Float? = null

    override fun load(webView: WebView) {
        val token = SessionToken(activity, ComponentName(activity, PlaybackService::class.java))
        val future = MediaController.Builder(activity, token).buildAsync()

        future.addListener({
            val media = future.get()
            controller = media
            pendingVolume?.let { media.volume = it }
            media.addListener(listener)
        }, MoreExecutors.directExecutor())

        // A connected controller keeps the service bound, and a bound service
        // survives `stopService`. Explicitly closing the app has to let go
        // first, or the radio plays on with no UI left to stop it.
        releaseController = {
            controller?.release()
            controller = null
        }

        // Lock screen and notification buttons arrive at the service, which has
        // no idea what the station list looks like. Hand them to the webview.
        PlaybackService.onStationChange = { forward ->
            trigger("station", JSObject().put("forward", forward))
        }

        // Track titles come from the service for the same reason: the
        // controller never sees `onMetadata`.
        PlaybackService.onIcyTitle = { title ->
            trigger("title", JSObject().put("title", title))
        }
    }

    private val listener = object : Player.Listener {
        override fun onPlaybackStateChanged(state: Int) = reportState()
        override fun onIsPlayingChanged(isPlaying: Boolean) = reportState()

        override fun onPlayerError(error: PlaybackException) {
            trigger(
                "error",
                JSObject()
                    .put("code", error.errorCodeName)
                    .put("message", error.message ?: "")
            )
        }

    }

    private fun reportState() {
        val media = controller ?: return
        trigger(
            "state",
            JSObject()
                .put("playing", media.isPlaying)
                .put(
                    "state",
                    when (media.playbackState) {
                        Player.STATE_IDLE -> "idle"
                        Player.STATE_BUFFERING -> "buffering"
                        Player.STATE_READY -> "ready"
                        Player.STATE_ENDED -> "ended"
                        else -> "unknown"
                    }
                )
        )
    }

    @Command
    fun play(invoke: Invoke) {
        val args = invoke.parseArgs(PlayArgs::class.java)
        val media = controller ?: run {
            invoke.reject("player not ready")
            return
        }

        // The metadata is what the lock screen and notification display, so it
        // is attached to the item rather than pushed separately.
        val metadata = MediaMetadata.Builder()
            .setTitle(args.title ?: "")
            .setArtist(args.artist ?: "")
            .setIsBrowsable(false)
            .setIsPlayable(true)
            .apply { args.artwork?.let { setArtworkUri(Uri.parse(it)) } }
            .build()

        media.setMediaItem(MediaItem.Builder().setUri(args.url).setMediaMetadata(metadata).build())
        media.prepare()
        media.play()
        invoke.resolve()
    }

    /**
     * Changes what the lock screen shows without interrupting playback.
     *
     * Media3 keeps playing when an item is replaced by one with the same URI,
     * which is the point: re-issuing `play` would restart the stream every time
     * the station announced a new track.
     */
    @Command
    fun setMetadata(invoke: Invoke) {
        val args = invoke.parseArgs(PlayArgs::class.java)
        val media = controller
        val current = media?.currentMediaItem
        if (media == null || current == null) {
            invoke.resolve()
            return
        }

        val metadata = MediaMetadata.Builder()
            .setTitle(args.title ?: "")
            .setArtist(args.artist ?: "")
            .setIsBrowsable(false)
            .setIsPlayable(true)
            .apply { args.artwork?.let { setArtworkUri(Uri.parse(it)) } }
            .build()

        media.replaceMediaItem(
            media.currentMediaItemIndex,
            current.buildUpon().setMediaMetadata(metadata).build()
        )
        invoke.resolve()
    }

    @Command
    fun pause(invoke: Invoke) {
        controller?.pause()
        invoke.resolve()
    }

    @Command
    fun resume(invoke: Invoke) {
        controller?.play()
        invoke.resolve()
    }

    @Command
    fun stop(invoke: Invoke) {
        controller?.stop()
        invoke.resolve()
    }

    @Command
    fun setVolume(invoke: Invoke) {
        val args = invoke.parseArgs(VolumeArgs::class.java)
        val media = controller
        if (media == null) pendingVolume = args.volume else media.volume = args.volume
        invoke.resolve()
    }
}
