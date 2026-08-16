fn main() {
    // The player lives in this crate rather than a separate plugin package, so
    // its permissions have to be declared here - without them the webview is
    // refused with "Plugin not found" and nothing reaches Kotlin.
    let player = tauri_build::InlinedPlugin::new()
        .commands(&[
            "player_play",
            "player_set_metadata",
            "player_pause",
            "player_resume",
            "player_stop",
            "player_set_volume",
            // Added by the mobile plugin system for events, and ACL-gated the
            // same as any other command.
            "registerListener",
        ])
        .default_permission(tauri_build::DefaultPermissionRule::AllowAllCommands);

    tauri_build::try_build(tauri_build::Attributes::new().plugin("player", player))
        .expect("failed to run tauri build script");
}
