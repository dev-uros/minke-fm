import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from '@tailwindcss/vite';
// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

/**
 * Fontsource lists a .woff after every .woff2, for browsers that cannot read woff2.
 * Every webview the app runs in (WKWebView, Android's Chromium, WebView2, WebKitGTK)
 * reads woff2, so the .woff copies would only be a megabyte of dead weight in the app.
 */
const woff2Only = {
  name: 'minke:woff2-only',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.includes('@fontsource/') || !id.endsWith('.css')) return null;
    return code.replace(/,\s*url\([^)]+\.woff\) format\('woff'\)/g, '');
  },
};

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [woff2Only, tailwindcss(), vue()],

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
