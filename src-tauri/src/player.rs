//! Bridge to the Android playback service.
//!
//! Android cannot use the webview `<audio>` element the desktop build relies on:
//! the system suspends webview media once the app is backgrounded, and a radio
//! that stops at the lock screen is useless. Playback there lives in a
//! MediaSessionService (`PlaybackService.kt`), and this carries commands to it.
//!
//! On desktop this module is absent entirely - `useAudioEngine.ts` is still the
//! player there.

use serde::{Deserialize, Serialize};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{AppHandle, Manager, Wry};

/// Matches `PlayArgs` in `PlayerPlugin.kt`.
///
/// Deserialized on the way in from the webview, serialized again on the way out
/// to Kotlin, so it needs both.
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

#[derive(Deserialize)]
struct Empty {}

/// Held as managed state so the commands below can reach the Kotlin side.
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
fn player_play(
    request: PlayRequest,
    player: tauri::State<'_, Player>,
) -> Result<(), String> {
    player.call("play", request)
}

#[tauri::command]
fn player_set_metadata(
    request: PlayRequest,
    player: tauri::State<'_, Player>,
) -> Result<(), String> {
    player.call("setMetadata", request)
}

#[tauri::command]
fn player_pause(player: tauri::State<'_, Player>) -> Result<(), String> {
    player.call("pause", ())
}

#[tauri::command]
fn player_resume(player: tauri::State<'_, Player>) -> Result<(), String> {
    player.call("resume", ())
}

#[tauri::command]
fn player_stop(player: tauri::State<'_, Player>) -> Result<(), String> {
    player.call("stop", ())
}

#[tauri::command]
fn player_set_volume(
    volume: f32,
    player: tauri::State<'_, Player>,
) -> Result<(), String> {
    player.call("setVolume", VolumeRequest { volume })
}

pub fn init() -> TauriPlugin<Wry> {
    Builder::new("player")
        .invoke_handler(tauri::generate_handler![
            player_play,
            player_set_metadata,
            player_pause,
            player_resume,
            player_stop,
            player_set_volume
        ])
        .setup(|app: &AppHandle<Wry>, api| {
            // The Kotlin class lives in the app's own package rather than a
            // separate plugin project - there is only one app that will ever
            // want it.
            let handle = api.register_android_plugin("com.fifthguild.minkefm", "PlayerPlugin")?;
            app.manage(Player(handle));
            Ok(())
        })
        .build()
}
