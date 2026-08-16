#!/usr/bin/env bash
#
# Pushes the built APK to a connected phone or emulator.
#
# Prefers the release APK and falls back to debug, so it installs whatever the
# last build produced without having to be told which.

set -euo pipefail

APP_ID="com.fifthguild.minkefm"
OUT="src-tauri/gen/android/app/build/outputs/apk/universal"

APK=""
for build in release debug; do
    candidate="$OUT/$build/app-universal-$build.apk"
    if [ -f "$candidate" ]; then
        APK="$candidate"
        break
    fi
done

if [ -z "$APK" ]; then
    echo "Nema APK-a. Napravi ga prvo: npm run tauri:build:android" >&2
    exit 1
fi

if ! adb get-state >/dev/null 2>&1; then
    echo "Nijedan uredjaj nije povezan (adb ga ne vidi)." >&2
    echo "Ukljuci USB debugging na telefonu, ili pokreni emulator." >&2
    exit 1
fi

echo "instaliram: $APK"

if OUTPUT=$(adb install -r "$APK" 2>&1); then
    echo "$OUTPUT" | tail -1
    exit 0
fi

echo "$OUTPUT" >&2

# Debug and release are signed with different keys, and Android refuses to
# replace an app with one signed by another key. Uninstalling is the only way
# through - and it takes the saved stations with it, so it is left to be done
# deliberately rather than done here.
if echo "$OUTPUT" | grep -q "SIGNATURE\|UPDATE_INCOMPATIBLE"; then
    echo >&2
    echo "Na telefonu je verzija potpisana drugim kljucem (debug vs release)." >&2
    echo "Android ne dozvoljava zamenu, pa staru treba skinuti:" >&2
    echo >&2
    echo "    adb uninstall $APP_ID" >&2
    echo >&2
    echo "PAZI: time se brisu i sacuvane stanice (favoriti)." >&2
fi

exit 1
