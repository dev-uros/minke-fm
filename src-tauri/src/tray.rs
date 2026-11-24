//! Menu bar icon and the panel that drops out of it.
//!
//! Now that the close button hides the window, this is how the radio stays
//! reachable. A plain text menu was tried first and felt wrong for something
//! playing music, so this is a small borderless window anchored under the icon -
//! artwork, what is playing, and round transport buttons.
//!
//! The panel is a separate webview and therefore has none of the player's state.
//! It never gets any: the main window pushes state here, the panel reads it, and
//! the panel's buttons emit actions the main window carries out with the same
//! functions its own controls use. Two webviews holding playback state would be
//! two players.

use std::sync::Mutex;

use serde::{Deserialize, Serialize};

// The menu bar exists only on desktop. `TrayState` and `TrayStore` below are
// plain data and stay available everywhere, so the commands that carry them do
// not need a second definition for mobile.
#[cfg(all(desktop, not(target_os = "linux")))]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
#[cfg(all(desktop, not(target_os = "linux")))]
use tauri::{AppHandle, Manager, Runtime, WebviewWindow};
#[cfg(all(desktop, not(target_os = "linux")))]
use tauri_plugin_positioner::{Position, WindowExt};

pub const PANEL_LABEL: &str = "tray-panel";

/// Everything the panel shows. All of it optional except the genre, because a
/// station may announce nothing at all.
#[derive(Clone, Default, Deserialize, Serialize)]
pub struct TrayState {
    pub station: Option<String>,
    pub track: Option<String>,
    pub artist: Option<String>,
    pub song: Option<String>,
    pub artwork: Option<String>,
    pub genre: String,
    pub playing: bool,
    pub shuffle: bool,
    pub favourite: bool,
}

/// The last state the main window reported, so a freshly opened panel has
/// something to show immediately rather than waiting for the next change.
#[derive(Default)]
pub struct TrayStore(Mutex<TrayState>);

impl TrayStore {
    pub fn set(&self, state: TrayState) {
        if let Ok(mut held) = self.0.lock() {
            *held = state;
        }
    }

    pub fn get(&self) -> TrayState {
        self.0.lock().map(|held| held.clone()).unwrap_or_default()
    }
}

#[cfg(all(desktop, not(target_os = "linux")))]
fn panel<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
    app.get_webview_window(PANEL_LABEL)
}

/// Shows the panel under the tray icon, or hides it if it is already up.
#[cfg(all(desktop, not(target_os = "linux")))]
fn toggle_panel<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = panel(app) else { return };

    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
        return;
    }

    // Positioned before it is shown, so it never appears in the wrong place
    // and jumps.
    let _ = window.move_window(Position::TrayBottomCenter);
    let _ = window.show();
    // Focus matters beyond appearances: losing it is what closes the panel.
    let _ = window.set_focus();
}

#[cfg(all(desktop, not(target_os = "linux")))]
pub fn build(app: &AppHandle) -> tauri::Result<()> {
    TrayIconBuilder::with_id("minke-tray")
        .icon(tauri::image::Image::from_bytes(include_bytes!(
            "../icons/tray.png"
        ))?)
        // Template mode makes macOS recolour it for a light or dark menu bar.
        .icon_as_template(true)
        // No menu: the click opens the panel instead.
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            let app = tray.app_handle();
            // The positioner tracks the icon's location from these events; it
            // cannot place the panel without them.
            tauri_plugin_positioner::on_tray_event(app, &event);

            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_panel(app);
            }
        })
        .build(app)?;

    Ok(())
}

/// Linux has no panel, only a menu.
///
/// The tray there is a StatusNotifierItem (libayatana-appindicator), which never
/// reports clicks or where the icon sits: a click always opens the item's menu,
/// and only the menu. So the panel could neither be opened nor placed. The menu
/// carries the same actions instead, sent the same way the panel sends them, so
/// the main window stays the only player.
#[cfg(target_os = "linux")]
pub mod linux {
    use super::{TrayState, PANEL_LABEL};
    use tauri::image::Image;
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
    use tauri::tray::TrayIconBuilder;
    use tauri::{AppHandle, Emitter, Manager, Wry};

    /// The items whose text follows the player, kept so they can be relabelled.
    pub struct TrayMenu {
        now_playing: MenuItem<Wry>,
        play_pause: MenuItem<Wry>,
        favourite: MenuItem<Wry>,
        shuffle: MenuItem<Wry>,
    }

    /// The macOS icon is a black template that the system recolours. Nothing
    /// recolours it here, and black on a dark panel - the common case on GNOME
    /// and KDE - is invisible. White keeps the shape and reads on both.
    fn white_icon() -> tauri::Result<Image<'static>> {
        let source = Image::from_bytes(include_bytes!("../icons/tray.png"))?;
        let mut rgba = source.rgba().to_vec();
        for pixel in rgba.chunks_exact_mut(4) {
            pixel[0] = 255;
            pixel[1] = 255;
            pixel[2] = 255;
        }
        Ok(Image::new_owned(rgba, source.width(), source.height()))
    }

    pub fn build(app: &AppHandle) -> tauri::Result<()> {
        // Never shown here, so it should not sit around as a hidden webview.
        if let Some(panel) = app.get_webview_window(PANEL_LABEL) {
            let _ = panel.destroy();
        }

        let now_playing = MenuItem::with_id(app, "now-playing", "MinkeFM", false, None::<&str>)?;
        let play_pause = MenuItem::with_id(app, "play-pause", "Play", true, None::<&str>)?;
        let next = MenuItem::with_id(app, "next", "Next station", true, None::<&str>)?;
        let previous = MenuItem::with_id(app, "previous", "Previous station", true, None::<&str>)?;
        let favourite = MenuItem::with_id(app, "favourite", "Add to favourites", true, None::<&str>)?;
        let shuffle = MenuItem::with_id(app, "shuffle", "Shuffle: off", true, None::<&str>)?;
        let show = MenuItem::with_id(app, "show", "Show MinkeFM", true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

        let menu = Menu::with_items(
            app,
            &[
                &now_playing,
                &PredefinedMenuItem::separator(app)?,
                &play_pause,
                &next,
                &previous,
                &PredefinedMenuItem::separator(app)?,
                &favourite,
                &shuffle,
                &PredefinedMenuItem::separator(app)?,
                &show,
                &quit,
            ],
        )?;

        TrayIconBuilder::with_id("minke-tray")
            .icon(white_icon()?)
            .tooltip("MinkeFM")
            .menu(&menu)
            .on_menu_event(|app, event| match event.id().as_ref() {
                id @ ("play-pause" | "next" | "previous" | "favourite" | "shuffle") => {
                    let _ = app.emit_to("main", "tray:action", id);
                }
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.unminimize();
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => app.exit(0),
                _ => {}
            })
            .build(app)?;

        app.manage(TrayMenu {
            now_playing,
            play_pause,
            favourite,
            shuffle,
        });
        Ok(())
    }

    /// Relabels the menu to match what the window reported.
    pub fn update(app: &AppHandle, state: &TrayState) {
        let Some(menu) = app.try_state::<TrayMenu>() else { return };

        let playing = match (&state.artist, &state.song, &state.track, &state.station) {
            (Some(artist), Some(song), _, _) => format!("{artist} - {song}"),
            (_, _, Some(track), _) => track.clone(),
            (_, _, _, Some(station)) => station.clone(),
            _ => "MinkeFM".to_string(),
        };
        // Long titles would stretch the whole menu across the screen.
        let playing = if playing.chars().count() > 48 {
            format!("{}...", playing.chars().take(47).collect::<String>())
        } else {
            playing
        };

        let _ = menu.now_playing.set_text(playing);
        let _ = menu
            .play_pause
            .set_text(if state.playing { "Pause" } else { "Play" });
        let _ = menu.favourite.set_text(if state.favourite {
            "Remove from favourites"
        } else {
            "Add to favourites"
        });
        let _ = menu.shuffle.set_text(if state.shuffle {
            "Shuffle: on"
        } else {
            "Shuffle: off"
        });
    }
}

#[cfg(target_os = "linux")]
pub use linux::build;
