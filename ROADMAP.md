# MinkeFM – plan poboljšanja

Predlozi iz pregleda koda (2026-10-23). Poređano po odnosu korist / trud.

## 1. Sitnice koje se primete svaki dan

- [x] **Pamćenje poslednje stanice i jačine zvuka**
  `streamVolume` uvek kreće od `1`, a `getStations()` na svakom pokretanju pušta
  `DEFAULT_GENRE`. Sačuvati poslednju stanicu i jačinu u localStorage (kao
  `useFavorites.ts`) i na startu nastaviti od njih. Mesto: `src/services/useStream.ts`.

- [x] **Media tasteri na desktopu (F7/F8/F9, slušalice, Control Center)**
  Android ima MediaSession, desktop nema. U webview-u dodati `navigator.mediaSession`:
  `setActionHandler('play' | 'pause' | 'nexttrack' | 'previoustrack')` i metadata iz
  `nowPlaying` (pesma, izvođač, omot) ili ime stanice kad pesma nije potvrđena.

- [x] **"Previous" kao istorija, ne jedan korak**
  `previousStation` čuva samo jednu stanicu, pa dva "previous" zaredom skaču tamo-vamo.
  Zameniti malim stekom (10–20 stanica).

## 2. Nove funkcije

- [x] **Sleep timer** – taster T (15 / 30 / 60 / 90 min), stišavanje zadnjih 30 s, klikabilan indikator. Na telefonu dugme ☾, tajmer radi u Kotlin servisu.

- [x] **Istorija pesama** – lista potvrđenih `Artist – Song` (sa albumom/omotom gde postoji),
  uz kopiranje ili link. Ulaze samo pesme koje su prošle `classifyTitle`, da ostane
  pravilo "tačno ili ništa".

- [ ] **Prijavljivanje klikova radio-browser-u** – poziv na `/json/url/{stationuuid}` kad
  stanica krene da svira. Pomaže njihovom `clickcount` rangiranju, na koje se oslanjamo.

- [ ] **Izvoz / uvoz favorita** (JSON fajl) – sada su samo u localStorage-u; reset webview-a
  ili nova mašina ih briše. Omogućava i prenos desktop ↔ telefon.

## 3. Održavanje

- [ ] **README** – zameniti Tauri šablon pravim opisom (šta je, kako se pokreće, Android build).
- [ ] **`Cargo.toml` metapodaci** – `description = "A Tauri App"`, `authors = ["you"]`.
- [ ] **Testovi na frontendu** (Vitest) – bar `classifyTitle` iz `useNowPlaying.ts` i
  `skipDeadStation` iz `useStream.ts` (indeksi posle `splice`).
- [ ] **CSP** – `"csp": null` u `src-tauri/tauri.conf.json`; postaviti pre deljenja aplikacije.
- [ ] **Auto-update** (`tauri-plugin-updater`) – samo ako aplikacija ide drugima.
