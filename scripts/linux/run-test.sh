#!/bin/bash
# Runs inside the clean container. $1 = path to the .deb
set -u
DEB=$1; R=/out/results; rm -rf $R; mkdir -p $R
echo "== gst plugins before install"; ls /usr/lib/*/gstreamer-1.0 2>/dev/null | wc -l
case "$DEB" in
  *.deb) apt-get update >/dev/null && apt-get install -y "$DEB" > $R/apt.log 2>&1; echo "install exit $?"
         grep -c "^Setting up gstreamer" $R/apt.log; BIN=/usr/bin/minke-fm;;
  *.rpm) dnf install -y "$DEB" > $R/apt.log 2>&1; echo "install exit $?"; grep -i -E "^ (gstreamer|webkit|libayatana)" $R/apt.log | head; BIN=/usr/bin/minke-fm;;
  *.AppImage) export APPIMAGE_EXTRACT_AND_RUN=1; BIN=$DEB;;
esac
echo "binary: $BIN"

export $(dbus-launch | xargs)
Xvfb :99 -screen 0 1400x900x24 >/dev/null 2>&1 & export DISPLAY=:99
pulseaudio -D --exit-idle-time=-1 --system=false 2>/dev/null; sleep 1
pactl load-module module-null-sink sink_name=out >/dev/null; pactl set-default-sink out
python3 /out/sni.py watch > $R/watcher.log 2>&1 &
sleep 1

$BIN > $R/app.log 2>&1 & APP=$!
sleep 15
import -window root $R/01-start.png
echo "== tray"; python3 /out/sni.py info
echo "== second launch (should exit and keep one copy)"; timeout 10 $BIN >/dev/null 2>&1; echo "second exit $?"; pgrep -c -f "$BIN"

echo "== play via tray"; python3 /out/sni.py click Play || echo "(already playing: the app resumes on launch)"
sleep 12
import -window root $R/02-playing.png
python3 /out/sni.py info | tail -12
echo "== audio"; timeout 6 parec -d out.monitor --format=s16le --rate=44100 --channels=2 > $R/rec.raw
python3 - <<'P'
import array, math
a = array.array('h', open('/out/results/rec.raw','rb').read())
rms = math.sqrt(sum(x*x for x in a)/max(len(a),1)); print(f"samples={len(a)} rms={rms:.0f} peak={max(map(abs,a)) if a else 0}")
P
echo "== mpris"; playerctl -l 2>&1; playerctl metadata 2>&1 | head -5
echo "== next via tray"; python3 /out/sni.py click Next; sleep 10; python3 /out/sni.py info | sed -n 7,8p
echo "== pause via tray"; python3 /out/sni.py click Pause; sleep 3
timeout 3 parec -d out.monitor --format=s16le --rate=44100 --channels=2 > $R/rec2.raw
python3 -c "
import array,math;a=array.array('h',open('/out/results/rec2.raw','rb').read());print('after pause rms',round(math.sqrt(sum(x*x for x in a)/max(len(a),1))))"
echo "== quit via tray"; python3 /out/sni.py click Quit; sleep 3; kill -0 $APP 2>/dev/null && echo "STILL RUNNING" || echo "app exited"
echo "== app log"; grep -v "^$" $R/app.log | tail -20
