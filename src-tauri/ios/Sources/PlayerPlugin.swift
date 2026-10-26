import AVFoundation
import MediaPlayer
import Network
import SwiftRs
import Tauri
import UIKit
import WebKit

struct PlayArgs: Decodable {
  let url: String
  let title: String?
  let artist: String?
  let artwork: String?
}

struct VolumeArgs: Decodable {
  let volume: Float
}

struct SleepArgs: Decodable {
  /// How long until playback pauses; 0 turns the timer off.
  let durationMs: Double
}

/// The iOS player, answering the same commands and raising the same events as
/// `PlayerPlugin.kt` + `PlaybackService.kt` on Android, so `useNativePlayer.ts`
/// cannot tell the two apart.
///
/// Playback is AVPlayer in the app process rather than the webview's <audio>:
/// it keeps going with the screen locked, it owns the lock screen controls, and
/// the webview's own timers stop in the background anyway. Reconnection and the
/// sleep timer live here for that same reason, as they do in the Kotlin service.
///
/// Everything runs on the main queue. Commands are hopped onto it, and every
/// observer and timer is registered there, so no state is shared across threads.
class PlayerPlugin: Plugin, AVPlayerItemMetadataOutputPushDelegate {

  private let player = AVPlayer()

  /// The station being played, or nil once stopped.
  private var currentURL: URL?
  private var title: String?
  private var artist: String?
  private var artworkURL: String?
  private var artwork: MPMediaItemArtwork?

  /// Whether playback is wanted - the same thing as ExoPlayer's `playWhenReady`.
  /// The page reads a pause from the lock screen out of this.
  private var wantsPlay = false

  /// Whether the current station has ever produced sound. A stream that worked
  /// and dropped deserves patience; one that never connected is likely broken.
  private var hasPlayed = false

  private var retryDelay = PlayerPlugin.firstRetry
  private var retry: DispatchWorkItem?
  /// Gives up on an attempt that neither plays nor fails. AVPlayer can sit
  /// waiting on a dead host for a very long time without reporting anything.
  private var watchdog: DispatchWorkItem?
  /// Waiting out a backoff after a failed attempt.
  private var failed = false
  private var pausedAt: Date?
  /// A phone call or another app took the audio session.
  private var interrupted = false

  private var volume: Float = 1
  private var sleepEndsAt: Date?
  private var sleepTimer: Timer?
  /// The volume before the fade began, to put back afterwards; nil until then.
  private var volumeBeforeFade: Float?

  private let network = NWPathMonitor()
  private var networkUp = true
  private var statusObservation: NSKeyValueObservation?
  private var itemObservation: NSKeyValueObservation?

  @objc public override func load(webview: WKWebView) {
    player.automaticallyWaitsToMinimizeStalling = true

    statusObservation = player.observe(\.timeControlStatus, options: [.new]) { [weak self] _, _ in
      DispatchQueue.main.async { self?.timeControlChanged() }
    }

    let center = NotificationCenter.default
    center.addObserver(
      self, selector: #selector(itemFailed(_:)),
      name: .AVPlayerItemFailedToPlayToEndTime, object: nil)
    // A live stream has no end; reaching one means the connection closed.
    center.addObserver(
      self, selector: #selector(itemEnded(_:)),
      name: .AVPlayerItemDidPlayToEndTime, object: nil)
    center.addObserver(
      self, selector: #selector(audioInterrupted(_:)),
      name: AVAudioSession.interruptionNotification, object: nil)
    center.addObserver(
      self, selector: #selector(routeChanged(_:)),
      name: AVAudioSession.routeChangeNotification, object: nil)

    setUpRemoteCommands()
    watchNetwork()

  }

  // MARK: - Commands

  @objc public func play(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(PlayArgs.self)
    DispatchQueue.main.async {
      guard let url = URL(string: args.url) else {
        invoke.reject("invalid url")
        return
      }

      self.title = args.title
      self.artist = args.artist
      self.setArtwork(args.artwork)

      // Already on this station - starting it over would only cut the sound
      // for a moment. The page has just switched to "connecting" and waits to
      // hear otherwise.
      if self.wantsPlay && self.currentURL == url {
        self.updateNowPlaying()
        self.reportState()
        invoke.resolve()
        return
      }

      if url != self.currentURL {
        self.hasPlayed = false
      }
      self.currentURL = url
      self.wantsPlay = true
      self.resetBackoff()
      self.activateSession()
      self.load()
      self.player.play()
      self.updateNowPlaying()
      self.reportState()
      invoke.resolve()
    }
  }

  /// Changes what the lock screen shows without touching the stream.
  @objc public func setMetadata(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(PlayArgs.self)
    DispatchQueue.main.async {
      if self.currentURL != nil {
        self.title = args.title
        self.artist = args.artist
        self.setArtwork(args.artwork)
        self.updateNowPlaying()
      }
      invoke.resolve()
    }
  }

  @objc public func pause(_ invoke: Invoke) {
    DispatchQueue.main.async {
      self.pausePlayback()
      invoke.resolve()
    }
  }

  @objc public func resume(_ invoke: Invoke) {
    DispatchQueue.main.async {
      self.resumePlayback()
      invoke.resolve()
    }
  }

  @objc public func stop(_ invoke: Invoke) {
    DispatchQueue.main.async {
      self.wantsPlay = false
      self.currentURL = nil
      self.resetBackoff()
      self.cancelWatchdog()
      self.unload()
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
      self.reportState()
      invoke.resolve()
    }
  }

  @objc public func setVolume(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(VolumeArgs.self)
    DispatchQueue.main.async {
      self.volume = args.volume
      // Mid-fade the fade owns the volume; it is put back to this afterwards.
      if self.volumeBeforeFade != nil {
        self.volumeBeforeFade = args.volume
      } else {
        self.player.volume = args.volume
      }
      invoke.resolve()
    }
  }

  @objc public func setSleepTimer(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(SleepArgs.self)
    DispatchQueue.main.async {
      if args.durationMs > 0 {
        self.startSleep(args.durationMs / 1000)
      } else {
        self.cancelSleep()
      }
      invoke.resolve()
    }
  }

  // MARK: - Playback

  /// A fresh connection to the current station.
  private func load() {
    guard let url = currentURL else { return }
    failed = false

    let item = AVPlayerItem(url: url)
    // Icecast track titles. AVPlayer asks for them and parses them itself;
    // they only have to be collected.
    let output = AVPlayerItemMetadataOutput(identifiers: nil)
    output.setDelegate(self, queue: .main)
    item.add(output)

    itemObservation = item.observe(\.status, options: [.new]) { [weak self] item, _ in
      guard item.status == .failed else { return }
      DispatchQueue.main.async {
        guard let self = self, self.player.currentItem === item else { return }
        self.fail(item.error)
      }
    }

    player.replaceCurrentItem(with: item)
    armWatchdog()
  }

  private func unload() {
    itemObservation = nil
    player.replaceCurrentItem(with: nil)
  }

  private func pausePlayback() {
    wantsPlay = false
    pausedAt = Date()
    resetBackoff()
    cancelWatchdog()
    player.pause()
    updateNowPlaying()
    reportState()
  }

  private func resumePlayback() {
    guard currentURL != nil else { return }
    wantsPlay = true
    interrupted = false
    activateSession()

    // A radio resumes live, not from wherever it was paused. After a short
    // pause the buffer is still worth playing; after a long one the connection
    // has most likely been dropped by the server anyway.
    let stale = pausedAt.map { Date().timeIntervalSince($0) > PlayerPlugin.staleAfter } ?? true
    if player.currentItem == nil || failed || stale {
      resetBackoff()
      load()
    } else {
      armWatchdog()
    }
    pausedAt = nil
    player.play()
    updateNowPlaying()
    reportState()
  }

  private func timeControlChanged() {
    switch player.timeControlStatus {
    case .playing:
      // Sound is coming out, so whatever went wrong is behind us.
      hasPlayed = true
      resetBackoff()
      cancelWatchdog()
    case .waitingToPlayAtSpecifiedRate:
      // A stall in a stream that was playing: give it as long as a reconnect
      // would get before treating it as a failure.
      if wantsPlay && watchdog == nil { armWatchdog() }
    default:
      break
    }
    updateNowPlaying()
    reportState()
  }

  @objc private func itemFailed(_ note: Notification) {
    DispatchQueue.main.async {
      guard (note.object as? AVPlayerItem) === self.player.currentItem else { return }
      self.fail(note.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error)
    }
  }

  @objc private func itemEnded(_ note: Notification) {
    DispatchQueue.main.async {
      guard (note.object as? AVPlayerItem) === self.player.currentItem else { return }
      self.fail(nil, code: "ENDED")
    }
  }

  /// An attempt is over. Report it, and keep trying on a backoff - going idle
  /// here would leave a station silently dead until someone opened the app.
  /// Giving up on a station altogether is the page's decision, not this one.
  private func fail(_ error: Error?, code: String? = nil) {
    guard wantsPlay, !failed else { return }
    failed = true
    cancelWatchdog()
    unload()

    let nsError = error as NSError?
    trigger(
      "error",
      data: [
        "code": code ?? nsError.map { "\($0.domain):\($0.code)" } ?? "UNKNOWN",
        "message": error?.localizedDescription ?? "",
      ])
    reportState()
    scheduleRetry()
  }

  private func scheduleRetry() {
    retry?.cancel()
    let work = DispatchWorkItem { [weak self] in
      guard let self = self else { return }
      self.retry = nil
      // Only if playback is still wanted: a user pause must not be undone by a
      // reconnect that was already queued.
      guard self.wantsPlay else { return }
      self.load()
      self.player.play()
    }
    retry = work
    DispatchQueue.main.asyncAfter(deadline: .now() + retryDelay, execute: work)
    retryDelay = min(retryDelay * 2, PlayerPlugin.maxRetry)
  }

  private func resetBackoff() {
    retry?.cancel()
    retry = nil
    retryDelay = PlayerPlugin.firstRetry
  }

  /// Short while hunting for a station that plays at all, patient once one has.
  private func armWatchdog() {
    cancelWatchdog()
    let work = DispatchWorkItem { [weak self] in
      guard let self = self else { return }
      self.watchdog = nil
      guard self.wantsPlay, !self.interrupted, self.player.timeControlStatus != .playing else {
        return
      }
      self.fail(nil, code: "TIMEOUT")
    }
    watchdog = work
    let timeout = hasPlayed ? PlayerPlugin.reconnectTimeout : PlayerPlugin.connectTimeout
    DispatchQueue.main.asyncAfter(deadline: .now() + timeout, execute: work)
  }

  private func cancelWatchdog() {
    watchdog?.cancel()
    watchdog = nil
  }

  /// Recover the moment the network comes back, rather than sitting out
  /// whatever the backoff had reached - up to half a minute of silence.
  private func watchNetwork() {
    network.pathUpdateHandler = { [weak self] path in
      DispatchQueue.main.async {
        guard let self = self else { return }
        let up = path.status == .satisfied
        defer { self.networkUp = up }
        guard up, !self.networkUp, self.failed, self.wantsPlay else { return }
        self.resetBackoff()
        self.load()
        self.player.play()
      }
    }
    network.start(queue: DispatchQueue(label: "minkefm.network"))
  }

  private func activateSession() {
    let session = AVAudioSession.sharedInstance()
    try? session.setCategory(.playback, mode: .default)
    try? session.setActive(true)
  }

  /// A phone call or an alarm: stop, then pick up where the user expects.
  @objc private func audioInterrupted(_ note: Notification) {
    guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: raw)
    else { return }
    let options = (note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt)
      .map(AVAudioSession.InterruptionOptions.init(rawValue:)) ?? []

    DispatchQueue.main.async {
      switch type {
      case .began:
        guard self.wantsPlay else { return }
        // Still wanted - only suspended, as ExoPlayer's audio focus does it.
        self.interrupted = true
        self.cancelWatchdog()
        self.pausedAt = Date()
      case .ended:
        guard self.interrupted else { return }
        self.interrupted = false
        if options.contains(.shouldResume) {
          self.resumePlayback()
        } else {
          self.pausePlayback()
        }
      @unknown default:
        break
      }
    }
  }

  /// Unplugging headphones pauses, rather than blasting out of the speaker.
  @objc private func routeChanged(_ note: Notification) {
    guard let raw = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
      AVAudioSession.RouteChangeReason(rawValue: raw) == .oldDeviceUnavailable
    else { return }
    DispatchQueue.main.async {
      if self.wantsPlay { self.pausePlayback() }
    }
  }

  // MARK: - Reporting

  private func reportState() {
    let playing = player.timeControlStatus == .playing
    let state: String
    if currentURL == nil {
      state = "idle"
    } else if playing || !wantsPlay || interrupted {
      state = "ready"
    } else {
      state = "buffering"
    }
    trigger("state", data: ["playing": playing, "playWhenReady": wantsPlay, "state": state])
  }

  func metadataOutput(
    _ output: AVPlayerItemMetadataOutput,
    didOutputTimedMetadataGroups groups: [AVTimedMetadataGroup],
    from track: AVPlayerItemTrack?
  ) {
    for item in groups.flatMap({ $0.items }) {
      let isTitle =
        item.identifier?.rawValue == "icy/StreamTitle" || item.commonKey == .commonKeyTitle
      guard isTitle, let value = item.stringValue?.trimmingCharacters(in: .whitespaces),
        !value.isEmpty
      else { continue }
      trigger("title", data: ["title": value])
    }
  }

  // MARK: - Lock screen

  private func setUpRemoteCommands() {
    let commands = MPRemoteCommandCenter.shared()

    commands.playCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      self.wakeIfFading()
      self.resumePlayback()
      return .success
    }
    commands.pauseCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      self.wakeIfFading()
      self.pausePlayback()
      return .success
    }
    commands.togglePlayPauseCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      self.wakeIfFading()
      if self.wantsPlay { self.pausePlayback() } else { self.resumePlayback() }
      return .success
    }
    // A radio has no playlist, so these mean "next station" - which only the
    // page knows, since it holds the station list.
    commands.nextTrackCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      self.wakeIfFading()
      self.trigger("station", data: ["forward": true])
      return .success
    }
    commands.previousTrackCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      self.wakeIfFading()
      self.trigger("station", data: ["forward": false])
      return .success
    }

    // Nothing to seek in a live stream.
    commands.changePlaybackPositionCommand.isEnabled = false
    commands.skipForwardCommand.isEnabled = false
    commands.skipBackwardCommand.isEnabled = false
    commands.seekForwardCommand.isEnabled = false
    commands.seekBackwardCommand.isEnabled = false
  }

  private func updateNowPlaying() {
    guard currentURL != nil else { return }
    var info: [String: Any] = [
      MPMediaItemPropertyTitle: title ?? "",
      MPMediaItemPropertyArtist: artist ?? "",
      MPNowPlayingInfoPropertyIsLiveStream: true,
      MPNowPlayingInfoPropertyPlaybackRate: player.timeControlStatus == .playing ? 1.0 : 0.0,
    ]
    if let artwork = artwork {
      info[MPMediaItemPropertyArtwork] = artwork
    }
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }

  /// The lock screen wants an image, not a URL, so the cover is fetched here.
  private func setArtwork(_ url: String?) {
    guard url != artworkURL else { return }
    artworkURL = url
    artwork = nil
    guard let url = url, let remote = URL(string: url) else { return }

    URLSession.shared.dataTask(with: remote) { [weak self] data, _, _ in
      guard let data = data, let image = UIImage(data: data) else { return }
      DispatchQueue.main.async {
        guard let self = self, self.artworkURL == url else { return }
        self.artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
        self.updateNowPlaying()
      }
    }.resume()
  }

  // MARK: - Sleep timer

  /*
   * Runs here rather than in the webview for the same reason as on Android:
   * it matters most with the screen locked, which is when the page's timers
   * are suspended. The app itself keeps running while it plays audio.
   */
  private func startSleep(_ seconds: TimeInterval) {
    restoreFadedVolume()
    sleepTimer?.invalidate()
    sleepEndsAt = Date().addingTimeInterval(seconds)
    sleepTick()
  }

  /// Off, with the sound back where it was. Returns whether a timer was running.
  @discardableResult
  private func cancelSleep() -> Bool {
    guard sleepEndsAt != nil else { return false }
    sleepTimer?.invalidate()
    sleepTimer = nil
    sleepEndsAt = nil
    restoreFadedVolume()
    return true
  }

  private func restoreFadedVolume() {
    if let before = volumeBeforeFade { player.volume = before }
    volumeBeforeFade = nil
  }

  private func sleepTick() {
    guard let endsAt = sleepEndsAt else { return }
    let left = endsAt.timeIntervalSinceNow

    if left <= 0 {
      // Paused before the volume goes back, or the last instant of the station
      // would come back at full volume.
      pausePlayback()
      cancelSleep()
      trigger("sleep", data: ["paused": true])
      return
    }

    if left < PlayerPlugin.sleepFade {
      let base = volumeBeforeFade ?? player.volume
      volumeBeforeFade = base
      player.volume = base * Float(left / PlayerPlugin.sleepFade)
    }

    let next =
      left < PlayerPlugin.sleepFade
      ? PlayerPlugin.sleepFadeTick
      : max(min(left - PlayerPlugin.sleepFade, PlayerPlugin.sleepIdleTick), PlayerPlugin.sleepFadeTick)
    let timer = Timer(timeInterval: next, repeats: false) { [weak self] _ in self?.sleepTick() }
    RunLoop.main.add(timer, forMode: .common)
    sleepTimer = timer
  }

  /// A lock screen or headphone button during the fade: someone is awake.
  private func wakeIfFading() {
    guard volumeBeforeFade != nil else { return }
    if cancelSleep() { trigger("sleep", data: ["paused": false]) }
  }

  // MARK: - Constants

  /// Waiting on a first connect - every second here is silence while hunting
  /// for a station that works. Matches the Android service.
  private static let connectTimeout: TimeInterval = 5
  /// A station that has already played gets more patience: this is a phone on
  /// a bad connection, not a dead host.
  private static let reconnectTimeout: TimeInterval = 12
  private static let firstRetry: TimeInterval = 1
  private static let maxRetry: TimeInterval = 30
  /// How long a pause may last before resuming reconnects to the live stream.
  private static let staleAfter: TimeInterval = 30
  private static let sleepFade: TimeInterval = 30
  private static let sleepFadeTick: TimeInterval = 0.25
  private static let sleepIdleTick: TimeInterval = 60
}

@_cdecl("init_plugin_player")
func initPlugin() -> Plugin {
  return PlayerPlugin()
}
