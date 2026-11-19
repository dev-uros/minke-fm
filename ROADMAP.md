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

- [x] **Rezervni spisak: favoriti + top 20 stanica po žanru, spakovan uz aplikaciju**
  `src/assets/fallback-stations.json`, pravi se sa `npm run fallback:stations` (proverava
  da stanice stvarno sviraju). Žanr koji nije keširan odmah krene sa favoritima iz tog
  žanra + spiskom, pa se pun spisak zameni kad stigne. Ako radio-browser ne radi, ostaje
  na tom spisku. Spisak povremeno osvežiti, jer stanice umiru.

- [ ] **Prijavljivanje klikova radio-browser-u** – poziv na `/json/url/{stationuuid}` kad
  stanica krene da svira. Pomaže njihovom `clickcount` rangiranju, na koje se oslanjamo.

- [ ] **Deljenje omiljenih ("mikstejp")** – napravljeno pa skinuto 2026-11-19 na zahtev, za
  kasnije. Ideja: omiljene kao link + QR (ime trake i uuid-ovi stanica iza `#`, bez servera),
  uvoz lepljenjem linka. Bez deep linka (Universal Links / App Links / `minkefm://`) je
  nezgrapno: link se otvara u browseru, pa se ručno lepi u aplikaciju; kad se vrati, ide
  zajedno sa deep linkom. Kod nije sačuvan (nikad nije commitovan).

- [ ] **Izvoz / uvoz favorita** (JSON fajl) – sada su samo u localStorage-u; reset webview-a
  ili nova mašina ih briše.

- [x] **Radio po zemljama** (2026-11-19) – kartica "Countries" u izboru žanra, sa
  "Spin the globe". Zemlja je "žanr" sa ključem `country:rs` (`src/services/useCountries.ts`),
  pa keš, rezervni spisak, next/previous i omiljeni rade bez izmena.

## 3. Sajt + privacy policy (preduslov za App Store i Google Play)

- [ ] **Promo sajt u `site/`, po uzoru na `fifth-notebook/site`** – *napravljen lokalno
  2026-11-19 (vidi `site/README.md`), Lighthouse 100 svuda; ostaje deploy na Cloudflare,
  Web Analytics, linkovi ka prodavnicama i privacy URL u App Store Connect / Play Console.* – Astro (statičan),
  Cloudflare Workers sa static assets, deploy na push. Stilizovan u duhu aplikacije
  (fontovi i skinovi iz `style.css`, pixel backdrop animacije kao pozadina), ne generički
  šablon. App Store Connect i Play Console traže URL privacy policy-ja, pa ovo blokira
  objavu.

  **Plan:**
  1. **Kostur** – `site/` sa `astro.config.ts` (`site` iz `SITE_URL`, sitemap,
     `inlineStylesheets: 'always'`, `scopedStyleStrategy: 'class'`), `wrangler.jsonc`
     (samo `assets`, bez Worker-a, jer nema waitliste), `public/_headers`, favicon iz
     `app-icon.png`. `src/constants.ts` za ime, tagline, opis, kontakt, linkove ka prodavnicama.
  2. **Izgled** – izabrati jedan skin kao lice sajta (ili smenu skinova kao "probaj"
     element); pozadina je pravi canvas backdrop iz aplikacije, ne video.
  3. **Strane:**
     - `index.astro` – hero (ime, tagline, telefon), šta radi (žanrovi, hiljade
       stanica, "tačno ili ništa" naslovi pesama, istorija, sleep timer, kontrole sa
       zaključanog ekrana, skinovi), dugmad za App Store i Google Play, footer.
       Promovišu se **samo mobilne verzije** – desktop se za sada ne pominje.
     - `privacy.astro` – politika **aplikacije** (i sajta).
     - `og.astro` – slika za deljenje linka (1200×630).
  4. **Screenshotovi iz same aplikacije** – Playwright `shots.config.ts` kao u
     fifth-notebook-u, samo telefon (430×932 @3x), po jedan za svaki skin, upis u
     `src/assets/shots`. Ništa crtano rukom.
  5. **Cloudflare** – projekat `minke-fm-site`, custom domain `minkefm.fifthguild.com`,
     Web Analytics bez kolačića, Git integracija za deploy.
  6. **Povezivanje** – privacy URL u App Store Connect i Play Console, link na sajt u
     README-u i `Cargo.toml`/`tauri.conf.json` metapodacima.

  **Šta privacy tekst mora tačno da kaže** (provereno u kodu 2026-11-19; uz ovo i
  iTunes Search API za omot i LRCLIB za tekstove, oba dobijaju izvođača i naslov):
  - Nema naloga, analitike ni reklama u aplikaciji; ništa se ne šalje nama.
  - Lokalno (localStorage/IndexedDB, samo na uređaju): favoriti, poslednja stanica i
    jačina, istorija pesama, keš stanica i žanrova, izabrani skin.
  - Treće strane koje uređaj kontaktira direktno: radio-browser.info API (spisak stanica;
    vidi njihovu IP adresu), sami radio serveri dok svira (IP, kao bilo koji stream).
    Google Fonts više ne: fontovi su od 2026-11-19 spakovani u aplikaciju (`src/fonts.ts`).
  - Ako uradimo "prijavljivanje klikova" iz sekcije 2, dodati i to.
  - Sajt: samo Cloudflare Web Analytics i logovi hosta.

  **Odlučeno (2026-11-19):**
  - Domen: `minkefm.fifthguild.com`
  - Kontakt (sajt i privacy): `uros.minic@fifthguild.com`
  - Jezik: samo engleski
  - Sajt promoviše samo iOS i Android. Desktop dolazi kasnije, kao posebna sekcija.

## 4. Održavanje

- [ ] **README** – zameniti Tauri šablon pravim opisom (šta je, kako se pokreće, Android build).
- [ ] **`Cargo.toml` metapodaci** – `description = "A Tauri App"`, `authors = ["you"]`.
- [ ] **Testovi na frontendu** (Vitest) – bar `classifyTitle` iz `useNowPlaying.ts` i
  `skipDeadStation` iz `useStream.ts` (indeksi posle `splice`).
- [ ] **CSP** – `"csp": null` u `src-tauri/tauri.conf.json`; postaviti pre deljenja aplikacije.
- [ ] **Auto-update** (`tauri-plugin-updater`) – samo ako aplikacija ide drugima.
