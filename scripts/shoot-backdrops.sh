#!/usr/bin/env bash
# Screenshots backdrops via headless Chrome, using the running vite dev server.
#   scripts/shoot-backdrops.sh <out.png> <query>   e.g. "scene=lofi&t=6"
set -euo pipefail
out="$1"; query="${2:-all=1&t=6}"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --user-data-dir="$(mktemp -d)" --hide-scrollbars --window-size=1000,1800 --virtual-time-budget=15000 \
  --screenshot="$out" "http://localhost:1420/backdrop-preview.html?$query" >/dev/null 2>&1
echo "$out"
