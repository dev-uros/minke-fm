// swift-tools-version:5.5

import PackageDescription

// The iOS half of the `player` plugin. Built and linked into the Rust library
// by `build.rs`, the same way a published Tauri plugin's `ios` folder would be;
// `.tauri/tauri-api` is copied in there from the `tauri` crate on every build.
let package = Package(
  name: "minke-player",
  platforms: [
    .iOS(.v15),
  ],
  products: [
    .library(
      name: "minke-player",
      type: .static,
      targets: ["minke-player"])
  ],
  dependencies: [
    .package(name: "Tauri", path: ".tauri/tauri-api")
  ],
  targets: [
    .target(
      name: "minke-player",
      dependencies: [
        .byName(name: "Tauri")
      ],
      path: "Sources")
  ]
)
