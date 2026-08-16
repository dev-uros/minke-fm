import { defineConfig, Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from '@tailwindcss/vite';
import { rmSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const mobile = !!process.env.MINKE_MOBILE;

/**
 * The phone build has no backdrop video, but `public/videos` is 54MB and Tauri
 * embeds the whole frontend inside the Android library - so without this the
 * APK carries every clip for nothing.
 */
function dropBackdropVideos(): Plugin {
  return {
    name: "minke-drop-videos",
    apply: "build",
    closeBundle() {
      if (!mobile) return;
      rmSync(resolve(__dirname, "dist/videos"), { recursive: true, force: true });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [tailwindcss(), vue(), dropBackdropVideos()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
