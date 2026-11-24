#!/bin/bash
# Builds the Linux packages in Docker and proves each one works on a clean system:
# the .deb on Ubuntu 22.04, the .rpm and the AppImage on Fedora 41. Each test
# installs the package (so the dependency list is checked too), starts the app
# headless, drives it through the tray menu over D-Bus, records the sound card
# and checks there is real audio, then pause, MPRIS, single instance and quit.
#
#   bash scripts/linux/test-linux.sh            # arm64 - native on Apple silicon
#   bash scripts/linux/test-linux.sh amd64      # x86_64 - emulated, much slower
#
# Packages and screenshots land in scripts/linux/out/ (git-ignored).
set -euo pipefail
ARCH=${1:-arm64}
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$HERE/../.." && pwd); OUT=$HERE/out/$ARCH
mkdir -p "$OUT"; cp "$HERE/sni.py" "$HERE/run-test.sh" "$OUT/"
P="--platform linux/$ARCH"

docker build $P -q -t minke-build-$ARCH -f "$HERE/Dockerfile.build" "$HERE" >/dev/null
docker build $P -q -t minke-ubuntu-$ARCH -f "$HERE/Dockerfile.ubuntu" "$HERE" >/dev/null
docker build $P -q -t minke-fedora-$ARCH -f "$HERE/Dockerfile.fedora" "$HERE" >/dev/null

docker run --rm $P -v "$REPO":/src:ro -v minke-work-$ARCH:/work -v minke-cargo-$ARCH:/root/.cargo/registry -v "$OUT":/out \
  minke-build-$ARCH bash -c '
set -e
rsync -a --delete --exclude node_modules --exclude src-tauri/target --exclude dist --exclude dist-appstore \
  --exclude site --exclude "*.mov" --exclude src-tauri/gen/android --exclude src-tauri/gen/apple --exclude scripts/linux/out /src/ /work/app/
cd /work/app && npm ci --no-audit --no-fund >/dev/null 2>&1
rm -f /out/*.deb /out/*.rpm /out/*.AppImage
GSTREAMER_INCLUDE_BAD_PLUGINS=1 npx tauri build 2>&1 | grep -E "Finished|Bundling|rror"
cp src-tauri/target/release/bundle/{deb/*.deb,rpm/*.rpm,appimage/*.AppImage} /out/'

run() { echo; echo "######## $2 on $1"; docker run --rm $P --shm-size=1g -v "$OUT":/out "$1" /out/run-test.sh "/out/$2"; cp "$OUT/results/02-playing.png" "$OUT/${2}.png"; }
run minke-ubuntu-$ARCH "$(cd "$OUT" && ls *.deb)"
run minke-fedora-$ARCH "$(cd "$OUT" && ls *.rpm)"
run minke-fedora-$ARCH "$(cd "$OUT" && ls *.AppImage)"
