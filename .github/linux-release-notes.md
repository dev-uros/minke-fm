MinkeFM for Linux. Pick one file for your system:

| System | File | Install |
|---|---|---|
| Ubuntu, Debian, Mint, Pop!_OS | `MinkeFM_*_amd64.deb` | `sudo apt install ./MinkeFM_*_amd64.deb` |
| Fedora, openSUSE | `MinkeFM-*.x86_64.rpm` | `sudo dnf install ./MinkeFM-*.x86_64.rpm` |
| Any distribution | `MinkeFM_*_amd64.AppImage` | `chmod +x` it, then run it |

ARM machines (Raspberry Pi 4/5, ARM laptops): use the `arm64` / `aarch64` files instead.

The tray icon on GNOME needs the "AppIndicator and KStatusNotifierItem Support" extension (Ubuntu ships it on). If the window stays blank on an NVIDIA card, start it with `WEBKIT_DISABLE_DMABUF_RENDERER=1 minke-fm`.
