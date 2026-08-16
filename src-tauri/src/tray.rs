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
#[cfg(desktop)]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
#[cfg(desktop)]
use tauri::{AppHandle, Manager, Runtime, WebviewWindow};
#[cfg(desktop)]
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

#[cfg(desktop)]
fn panel<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
    app.get_webview_window(PANEL_LABEL)
}

/// Shows the panel under the tray icon, or hides it if it is already up.
#[cfg(desktop)]
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

#[cfg(desktop)]
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
