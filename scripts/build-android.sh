#!/usr/bin/env bash
#
# Builds the APK for sideloading onto a phone - copy it across, no store.
#
# The environment is pinned here rather than left to whatever the shell happens
# to hold, because three things on this machine break the Gradle build:
#
#   - the default JDK is 25, which this project's Gradle cannot run under.
#     Android Studio ships a 21 that can.
#   - ANDROID_HOME and ANDROID_SDK_ROOT are both set and spelled `Sdk`, while
#     the directory is `sdk`. Having both set with a mismatched spelling is what
#     made the NDK lookup fail.
#   - NDK_HOME is not set at all, and the Rust targets need it.
#
# Each can be overridden: MINKE_JAVA_HOME, MINKE_ANDROID_HOME, MINKE_NDK_HOME.
# Pass a target as the first argument (default aarch64, which is every phone
# made in the last decade); `all` builds every ABI and a much larger APK.
# Pass `debug` as the second argument to force an unminified build.

set -euo pipefail

TARGET="${1:-aarch64}"
MODE="${2:-auto}"

JAVA_HOME="${MINKE_JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
ANDROID_HOME="${MINKE_ANDROID_HOME:-$HOME/Library/Android/sdk}"
KEY_PROPERTIES="${MINKE_KEY_PROPERTIES:-$HOME/.minke-fm/key.properties}"

if [ ! -x "$JAVA_HOME/bin/java" ]; then
    echo "Nema JDK-a na: $JAVA_HOME" >&2
    echo "Instaliraj Android Studio ili postavi MINKE_JAVA_HOME." >&2
    exit 1
fi

if [ ! -d "$ANDROID_HOME" ]; then
    echo "Nema Android SDK-a na: $ANDROID_HOME" >&2
    echo "Postavi MINKE_ANDROID_HOME." >&2
    exit 1
fi

# Picking the newest installed NDK rather than pinning a version, so this does
# not quietly break the next time the NDK is updated.
NDK_HOME="${MINKE_NDK_HOME:-$(ls -d "$ANDROID_HOME"/ndk/*/ 2>/dev/null | sort -V | tail -1)}"
NDK_HOME="${NDK_HOME%/}"

if [ -z "$NDK_HOME" ] || [ ! -d "$NDK_HOME" ]; then
    echo "Nema NDK-a u $ANDROID_HOME/ndk." >&2
    echo "Instaliraj ga kroz Android Studio (SDK Manager -> SDK Tools -> NDK)." >&2
    exit 1
fi

# A release APK is only worth building when it can be signed: an unsigned one is
# refused by the phone outright, so falling back to debug is the useful failure.
if [ "$MODE" = "debug" ]; then
    BUILD="debug"
elif [ -f "$KEY_PROPERTIES" ]; then
    BUILD="release"
else
    BUILD="debug"
fi

# Both being set, with one misspelled, is the clash. One wins.
unset ANDROID_SDK_ROOT
export JAVA_HOME ANDROID_HOME NDK_HOME MINKE_KEY_PROPERTIES="$KEY_PROPERTIES"

echo "JDK : $("$JAVA_HOME/bin/java" -version 2>&1 | head -1)"
echo "SDK : $ANDROID_HOME"
echo "NDK : $(basename "$NDK_HOME")"
echo "cilj: $TARGET"
if [ "$BUILD" = "release" ]; then
    echo "vrsta: release, potpisan kljucem iz $KEY_PROPERTIES"
else
    echo "vrsta: debug (nema $KEY_PROPERTIES, pa release ne bi mogao da se potpise)"
fi
echo

FLAGS=()
[ "$BUILD" = "debug" ] && FLAGS+=(--debug)
[ "$TARGET" != "all" ] && FLAGS+=(--target "$TARGET")

npx tauri android build "${FLAGS[@]}"

APK="src-tauri/gen/android/app/build/outputs/apk/universal/$BUILD/app-universal-$BUILD.apk"

if [ ! -f "$APK" ]; then
    echo >&2
    echo "Build je prosao ali APK nije tu gde se ocekivao:" >&2
    echo "  $APK" >&2
    ls -1 "src-tauri/gen/android/app/build/outputs/apk/universal/$BUILD/" 2>/dev/null >&2 || true
    exit 1
fi

APK_ABS="$(cd "$(dirname "$APK")" && pwd)/$(basename "$APK")"

echo
echo "APK:      $APK_ABS"
echo "velicina: $(du -h "$APK" | cut -f1)"

# An APK that turns out to be unsigned only fails once it is already on the
# phone, which is a slow way to find out.
APKSIGNER="$(ls -d "$ANDROID_HOME"/build-tools/*/apksigner 2>/dev/null | sort -V | tail -1)"
if [ -n "$APKSIGNER" ]; then
    if SIG=$("$APKSIGNER" verify --print-certs "$APK_ABS" 2>/dev/null | grep -m1 "DN:"); then
        echo "potpis:   ${SIG#*: }"
    else
        echo "potpis:   NEMA - telefon ce odbiti da ga instalira" >&2
    fi
fi

echo
echo "Prebaci ga na telefon i otvori, ili sa kablom: npm run android:install"
