mod icy;
pub mod lyrics;
// Playback lives in Kotlin on Android; on desktop `useAudioEngine.ts` is still
// the player and this module does not exist.
#[cfg(target_os = "android")]
mod player;
pub mod text;
pub mod track;
mod tray;
pub mod video;

use icy::IcyProxy;
use lyrics::{Lyrics, LyricsCache};
use tauri::{Emitter, Manager};
use track::{TrackCache, TrackInfo};
use tray::{TrayState, TrayStore};
use video::VideoLibrary;

/// Register a station URL with the metadata proxy and get back the local URL to
/// play. Falls back to the station URL itself if the proxy is not running, so a
/// proxy problem costs metadata, never playback.
#[tauri::command]
fn prepare_stream(url: String, proxy: tauri::State<'_, Option<IcyProxy>>) -> String {
    match proxy.inner() {
        Some(proxy) => proxy.prepare(url),
        None => url,
    }
}

/// Album for a track, or nothing at all if it cannot be confirmed.
#[tauri::command]
async fn lookup_track(
    artist: String,
    song: String,
    cache: tauri::State<'_, TrackCache>,
) -> Result<Option<TrackInfo>, String> {
    // The lookup is blocking, and the UI thread must not wait on the network.
    let cache = cache.inner().clone();
    tauri::async_runtime::spawn_blocking(move || cache.lookup(&artist, &song))
        .await
        .map_err(|error| error.to_string())
}

/// Lyrics for a track, timed when the database has them that way.
#[tauri::command]
async fn lookup_lyrics(
    artist: String,
    song: String,
    cache: tauri::State<'_, LyricsCache>,
) -> Result<Option<Lyrics>, String> {
    let cache = cache.inner().clone();
    tauri::async_runtime::spawn_blocking(move || cache.lookup(&artist, &song))
        .await
        .map_err(|error| error.to_string())
}

/// A backdrop clip for this search query, downloaded and cached on demand.
///
/// `Ok(None)` is an ordinary answer - no API key, no network, nothing found -
/// and means the caller should use a bundled video.
#[tauri::command]
async fn background_video(
    scene: String,
    queries: Vec<String>,
    recent: Vec<String>,
    library: tauri::State<'_, std::sync::Arc<VideoLibrary>>,
) -> Result<Option<String>, String> {
    let library = std::sync::Arc::clone(library.inner());

    // Searching and downloading are blocking; the UI thread must not wait.
    let chosen = tauri::async_runtime::spawn_blocking({
        let library = std::sync::Arc::clone(&library);
        let (scene, queries) = (scene.clone(), queries.clone());
        move || {
            library
                .clip_for(&scene, &queries, &recent)
                .and_then(|path| path.to_str().map(str::to_string))
        }
    })
    .await
    .map_err(|error| error.to_string())?;

    // Grow the pool in the background so later changes are instant. Detached
    // on purpose: the caller has its clip and should not wait for this.
    if library.needs_more(&scene) {
        tauri::async_runtime::spawn_blocking(move || library.top_up(&scene, &queries));
    }

    Ok(chosen)
}

/// Whether fetched backdrops are available at all, so the UI can credit Pexels
/// only when it is actually showing their footage.
#[tauri::command]
fn backgrounds_enabled(library: tauri::State<'_, std::sync::Arc<VideoLibrary>>) -> bool {
    library.has_key()
}

/// Whether this build runs on a phone.
///
/// Answered at compile time rather than sniffed from the user agent, and it is
/// what decides which root component mounts - the desktop layout and the mobile
/// one are different enough to be separate components.
#[tauri::command]
fn is_mobile() -> bool {
    cfg!(any(target_os = "android", target_os = "ios"))
}

/// Pushes the current player state into the menu bar.
///
/// Called by the frontend whenever anything visible there changes, so the menu
/// can never drift out of step with the window.
#[tauri::command]
fn update_tray(state: TrayState, app: tauri::AppHandle, store: tauri::State<'_, TrayStore>) {
    store.set(state.clone());
    // Only an open panel cares, and it is cheap enough not to bother checking.
    let _ = app.emit_to(tray::PANEL_LABEL, "tray:state", state);
}

/// The panel asks for this on open, since it may have missed every update
/// that happened while it was closed.
#[tauri::command]
fn tray_state(store: tauri::State<'_, TrayStore>) -> TrayState {
    store.get()
}

/// Panel buttons that are the app's own business rather than the player's.
#[tauri::command]
fn tray_command(action: String, app: tauri::AppHandle) {
    match action.as_str() {
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                // Mobile windows have no concept of being minimised.
                #[cfg(desktop)]
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
            if let Some(panel) = app.get_webview_window(tray::PANEL_LABEL) {
                let _ = panel.hide();
            }
        }
        "hide-panel" => {
            if let Some(panel) = app.get_webview_window(tray::PANEL_LABEL) {
                let _ = panel.hide();
            }
        }
        "quit" => app.exit(0),
        _ => {}
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Registered before every other plugin, as this one requires: a second copy
    // has to be turned away before anything else gets a chance to start. Without
    // it a second launch would open its own window, its own ICY proxy and its
    // own stream, and the two would fight over the same cache directory.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        // The user asked for the app - show them the copy already running
        // rather than doing nothing visible.
        let window = app
            .get_webview_window("main")
            .or_else(|| app.webview_windows().into_values().next());

        if let Some(window) = window {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }));

    #[cfg(target_os = "android")]
    let builder = builder.plugin(player::init());

    builder
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let proxy = match IcyProxy::start(app.handle().clone()) {
                Ok(proxy) => Some(proxy),
                Err(error) => {
                    eprintln!("ICY proxy failed to start, playing streams direct: {error}");
                    None
                }
            };
            app.manage(proxy);
            app.manage(TrackCache::default());
            app.manage(LyricsCache::default());

            let paths = app.path();
            let cache_dir = paths
                .app_cache_dir()
                .unwrap_or_else(|_| std::env::temp_dir())
                .join("backgrounds");
            let config_dir = paths
                .app_config_dir()
                .unwrap_or_else(|_| std::env::temp_dir());
            let _ = std::fs::create_dir_all(&config_dir);

            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_positioner::init())?;
                app.manage(TrayStore::default());
                tray::build(app.handle())?;
            }

            let api_key = video::read_api_key(&config_dir);
            if api_key.is_none() {
                println!(
                    "No Pexels key - using bundled backgrounds. Add one at {}",
                    config_dir.join("pexels.key").display()
                );
            }
            app.manage(std::sync::Arc::new(VideoLibrary::new(cache_dir, api_key)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            prepare_stream,
            lookup_track,
            lookup_lyrics,
            background_video,
            backgrounds_enabled,
            is_mobile,
            update_tray,
            tray_state,
            tray_command
        ])
        .on_window_event(|window, event| {
            // The panel behaves like a menu: clicking away puts it back.
            if window.label() == tray::PANEL_LABEL {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = window.hide();
                }
                return;
            }

            // macOS convention: the red button puts the window away, it does not
            // quit the app - which for a radio matters, since the point is to
            // keep listening with the window out of the way. Cmd+Q still exits,
            // because that arrives through the app menu rather than as a window
            // close request.
            #[cfg(target_os = "macos")]
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {
            // Clicking the dock icon once the window is hidden has to bring it
            // back, or the app would be running with no way to reach it.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = _event {
                if let Some(window) = _app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });
}
