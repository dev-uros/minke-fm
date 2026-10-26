//! Bridge to the native players on Android and iOS.
//!
//! A phone cannot use the webview `<audio>` element the desktop build relies on:
//! the system suspends webview media once the app is backgrounded, and a radio
//! that stops at the lock screen is useless. Playback lives in a
//! MediaSessionService on Android (`PlaybackService.kt`) and in AVPlayer on iOS
//! (`ios/Sources/PlayerPlugin.swift`); this carries commands to whichever it is.
//! Both answer the same commands and raise the same events.
//!
//! On desktop this module is absent entirely - `useAudioEngine.ts` is still the
//! player there.

use serde::{Deserialize, Serialize};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{AppHandle, Manager, Wry};

/// Matches `PlayArgs` in `PlayerPlugin.kt` and `PlayerPlugin.swift`.
///
/// Deserialized on the way in from the webview, serialized again on the way out
/// to the native side, so it needs both.
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayRequest {
    pub url: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub artwork: Option<String>,
}

#[derive(Serialize)]
struct VolumeRequest {
    volume: f32,
}

/// Matches `SleepArgs` in both native plugins. Zero turns the timer off.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SleepRequest {
    duration_ms: u64,
}

#[derive(Deserialize)]
struct Empty {}

/// Held as managed state so the commands below can reach the native side.
///
/// Tied to `Wry` rather than generic over the runtime: a generic parameter here
/// cannot be inferred inside `generate_handler!`, and this app has exactly one
/// runtime anyway.
pub struct Player(tauri::plugin::PluginHandle<Wry>);

impl Player {
    fn call<A: Serialize>(&self, command: &str, args: A) -> Result<(), String> {
        self.0
            .run_mobile_plugin::<Empty>(command, args)
            .map(|_| ())
            .map_err(|error| error.to_string())
    }
}

#[tauri::command]
async fn player_play(
    request: PlayRequest,
    player: tauri::State<'_, Player>,
) -> Result<(), String> {
    player.call("play", request)
}

#[tauri::command]
async fn player_set_metadata(
    request: PlayRequest,
    player: tauri::State<'_, Player>,
) -> Result<(), String> {
    player.call("setMetadata", request)
}

#[tauri::command]
async fn player_pause(player: tauri::State<'_, Player>) -> Result<(), String> {
    player.call("pause", ())
}

#[tauri::command]
async fn player_resume(player: tauri::State<'_, Player>) -> Result<(), String> {
    player.call("resume", ())
}

#[tauri::command]
async fn player_stop(player: tauri::State<'_, Player>) -> Result<(), String> {
    player.call("stop", ())
}

#[tauri::command]
async fn player_set_volume(
    volume: f32,
    player: tauri::State<'_, Player>,
) -> Result<(), String> {
    player.call("setVolume", VolumeRequest { volume })
}

/// The sleep timer, which has to run in the service: the webview's own timers
/// stop with the screen locked, which is exactly when it is needed.
#[tauri::command]
async fn player_set_sleep_timer(
    duration_ms: u64,
    player: tauri::State<'_, Player>,
) -> Result<(), String> {
    player.call("setSleepTimer", SleepRequest { duration_ms })
}

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_player);

// Every command above is `async` for iOS's sake. A synchronous command runs on
// the main thread there, and blocks it waiting for Swift's reply - which Swift
// sends from the main thread. The app sat on a blank screen until this changed.

pub fn init() -> TauriPlugin<Wry> {
    Builder::new("player")
        .invoke_handler(tauri::generate_handler![
            player_play,
            player_set_metadata,
            player_pause,
            player_resume,
            player_stop,
            player_set_volume,
            player_set_sleep_timer
        ])
        .setup(|app: &AppHandle<Wry>, api| {
            // Both halves live in the app itself rather than a separate plugin
            // project - there is only one app that will ever want them.
            #[cfg(target_os = "android")]
            let handle = api.register_android_plugin("com.fifthguild.minkefm", "PlayerPlugin")?;
            #[cfg(target_os = "ios")]
            let handle = api.register_ios_plugin(init_plugin_player)?;
            app.manage(Player(handle));
            Ok(())
        })
        .build()
}
