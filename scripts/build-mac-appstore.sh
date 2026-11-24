#!/usr/bin/env bash
# Builds the signed, sandboxed Mac App Store package: dist/MinkeFM-<version>-<build>.pkg
#
# Needs in the login keychain: "Apple Distribution" (signs the app) and
# "3rd Party Mac Developer Installer" (signs the pkg), both team HQA7G6K35G.
# Bump bundle.macOS.bundleVersion in src-tauri/tauri.appstore.conf.json per upload.
set -euo pipefail
cd "$(dirname "$0")/.."

INSTALLER_ID="3rd Party Mac Developer Installer: Uro Mini (HQA7G6K35G)"
VERSION=$(node -p "require('./src-tauri/tauri.conf.json').version")
BUILD=$(node -p "require('./src-tauri/tauri.appstore.conf.json').bundle.macOS.bundleVersion")

npx tauri build --target universal-apple-darwin --bundles app \
  --config src-tauri/tauri.appstore.conf.json

APP=src-tauri/target/universal-apple-darwin/release/bundle/macos/MinkeFM.app
OUT=dist-appstore/MinkeFM-$VERSION-$BUILD.pkg
mkdir -p dist-appstore

productbuild --sign "$INSTALLER_ID" --component "$APP" /Applications "$OUT"

codesign --verify --deep --strict "$APP"
pkgutil --check-signature "$OUT" | head -3
echo "Built $OUT"
