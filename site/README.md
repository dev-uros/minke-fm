# MinkeFM site

The app's site at https://minkefm.fifthguild.com: what MinkeFM is, its five skins, where to get it, and its privacy policy (`/privacy/`, the URL the App Store and Google Play ask for). Astro, all static, served by Cloudflare.

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # static files in dist/
npm run preview   # serves dist/ on http://localhost:4321
npx astro check   # types
```

## The skins

The whole page wears the skin the phone in the hero shows. `html[data-skin]` is set before the first paint (`src/layouts/Layout.astro`), and tapping the phone or a swatch changes it (`src/components/SkinPhone.astro`). The colours, faces and shapes for each skin are tokens in `src/styles/skins.css`, taken from the app's `src/skins.css`; `src/styles/site.css` only reads them. The choice is kept in `localStorage`, and a link can name one: `/?skin=vinyl`.

Adding a skin to the app means: a shot, an entry in `src/skins.ts`, a block in `src/styles/skins.css`, and its id in the lists of selectors in `SkinPhone.astro`.

## The shots

`src/assets/shots/phone-<skin>.png` are whole screens taken on the iPhone 17 Pro simulator (1206×2622), all five on the same station and song. To take them again:

```sh
xcrun simctl status_bar booted override --time "9:41" --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularMode notSupported
xcrun simctl io booted screenshot src/assets/shots/phone-cassette.png   # and so on, one per skin
npm run og                                                                # the picture for shared links, from the shots
```

Pick a station that shows a song with its album cover, and change skins without changing station, so the five shots match.

The pictures of the country picker (`countries-<skin>.png`) are made by a script instead, from the app's own UI in WebKit at the same size, with the simulator shot's status bar laid over them. Tapping through a simulator for each skin was too unreliable on a busy machine:

```sh
npm run dev                          # in the repository root: the app on :1420
npx playwright install webkit        # once
node scripts/feature-shots.mjs       # in site/
```

## Lighthouse

100 in every category, on mobile and desktop. Two things hold it there:

- **No AVIF.** Five AVIF shots took a throttled phone 4 s of main thread to decode (performance 70). WebP: 0 ms.
- **`sizes` matches the screen inside the phone frame**, not the frame, or the browser picks the next size up.

Only the cassette's faces are preloaded; the other skins' faces download when a skin is picked.

## Deploying

`wrangler.jsonc` serves `dist/` as static assets on the custom domain. Connect the repository in Cloudflare (Workers → Create → Import a repository) with root directory `site`, build command `npm run build`, deploy command `npx wrangler deploy`. Or by hand: `npm run deploy`.

The store links are `STORES` in `src/constants.ts`; an empty one turns its button back into "coming soon".

The privacy page lists every server the app talks to. When the app starts talking to a new one, change `src/pages/privacy.astro` and its date in the same commit.
