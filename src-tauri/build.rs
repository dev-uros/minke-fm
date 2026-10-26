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
            "player_set_sleep_timer",
            // Added by the mobile plugin system for events, and ACL-gated the
            // same as any other command.
            "registerListener",
        ])
        .default_permission(tauri_build::DefaultPermissionRule::AllowAllCommands);

    tauri_build::try_build(tauri_build::Attributes::new().plugin("player", player))
        .expect("failed to run tauri build script");

    #[cfg(target_os = "macos")]
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") {
        link_ios_player();
    }
}

/// Builds `ios/` - the Swift player - into the Rust library.
///
/// This is what `tauri-plugin`'s build helper does for a plugin crate's `ios`
/// folder, done by hand because the player lives in the app itself, just as its
/// Kotlin half does. The package imports `Tauri`, which it finds in a copy of
/// the API package the `tauri` crate ships.
#[cfg(target_os = "macos")]
fn link_ios_player() {
    use std::path::{Path, PathBuf};

    fn copy_dir(from: &Path, to: &Path) {
        std::fs::create_dir_all(to).expect("failed to create tauri-api copy");
        for entry in std::fs::read_dir(from).expect("failed to read tauri-api") {
            let entry = entry.unwrap();
            let name = entry.file_name();
            // Build products and lockfiles of the original would only confuse
            // SwiftPM; its tests are not ours to build.
            if [".build", "Package.resolved", "Tests"].contains(&name.to_str().unwrap_or_default()) {
                continue;
            }
            let target = to.join(&name);
            if entry.file_type().unwrap().is_dir() {
                copy_dir(&entry.path(), &target);
            } else {
                std::fs::copy(entry.path(), target).expect("failed to copy tauri-api");
            }
        }
    }

    let manifest = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let package = manifest.join("ios");
    let api = std::env::var("DEP_TAURI_IOS_LIBRARY_PATH")
        .expect("`tauri` did not report its iOS API package");

    let copy = package.join(".tauri").join("tauri-api");
    let _ = std::fs::remove_dir_all(&copy);
    copy_dir(Path::new(&api), &copy);

    println!("cargo:rerun-if-changed=ios/Sources");
    println!("cargo:rerun-if-changed=ios/Package.swift");

    // SwiftPM picks the SDK itself; an inherited SDKROOT from Xcode points it
    // at the wrong one. `tauri-utils` clears it for the same reason.
    let sdk_root = std::env::var_os("SDKROOT");
    unsafe { std::env::remove_var("SDKROOT") };
    swift_rs::SwiftLinker::new("10.13")
        .with_ios(&std::env::var("IPHONEOS_DEPLOYMENT_TARGET").unwrap_or_else(|_| "15.0".into()))
        .with_package("minke-player", &package)
        .link();
    if let Some(root) = sdk_root {
        unsafe { std::env::set_var("SDKROOT", root) };
    }
}
