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
  na tom spisku. Od 2026-11-19 se osvežava sam: GitHub Actions svakog ponedeljka pravi novi
  spisak (žanrovi i, po 10, zemlje; `.github/workflows/fallback-stations.yml`) i commituje
  ga; sajt ga objavljuje na `/stations.json`, a aplikacija ga preuzima jednom nedeljno
  (`useRemoteFallback.ts`). Spakovani fajl ostaje za prvo pokretanje bez interneta.

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

## 4. Objava u prodavnicama (produkcija)

Plan od 2026-11-19. Stanje: TestFlight build 5 i Play internal testing 1003 rade; sajt i
privacy (https://minkefm.fifthguild.com/privacy/) su živi. App Store ID: 6827227577.

### A. Odluke pre svega (5 min)
- [x] **Verzija za objavu: 1.0.0**, prva produkcijska (odlučeno 2026-11-19). Menja se
      `version` u `src-tauri/tauri.conf.json` i `CFBundleShortVersionString` u
      `gen/apple/minke-fm_iOS/Info.plist` (Android versionName ide iz tauri.conf). Build
      brojevi nastavljaju da rastu: iOS 11, Android 1009.
- [x] **iPad**: samo iPhone za prvu verziju (`TARGETED_DEVICE_FAMILY = 1`, postavljeno
      2026-11-19). Telefonski raspored se na iPadu razvuče; iPad i dalje instalira aplikaciju
      u iPhone veličini. Prava iPad verzija kasnije.
- [x] **Web Analytics na sajtu**: ne treba; rečenica sklonjena sa privacy strane.
- [x] **Google Play nalog**: organizacioni (Fifth Guild, sa D-U-N-S brojem), pa zatvoreno
      testiranje sa 12 testera / 14 dana **ne treba**; produkcija ide direktno.

### B. Priprema (radim ja, ti pregledaš)
- [ ] Tekstovi za prodavnice (engleski): naziv, podnaslov (iOS, 30 znakova), kratak opis
      (Play, 80), pun opis (do 4000), ključne reči (iOS, 100), promo tekst, "What's new".
- [ ] Slike za App Store: iPhone 6.9" (1320×2868, iPhone 17 Pro Max simulator), 3–6 komada
      (+ iPad 13" ako ostaje iPad).
- [ ] Slike za Play: telefon (9:16, Android emulator), 2–8 komada; ikonica 512×512;
      feature graphic 1024×500.
- [ ] Verzija 1.0.0, novi iOS build (6) i AAB (1004), commit + push.

### C. App Store Connect (radiš ti, idemo zajedno)
1. [ ] App Information: kategorija **Music**, Content Rights: aplikacija pušta tuđe javne
       radio strimove (ne snima i ne skida) → odgovor "Yes" uz kratko objašnjenje.
2. [ ] Pricing: besplatno, sve zemlje.
3. [ ] App Privacy: **Data Not Collected**; Privacy Policy URL = privacy strana.
4. [ ] Age Rating upitnik (radio može da pusti pesme sa psovkama → "Infrequent/Mild").
5. [ ] Verzija 1.0.0: slike, opis, ključne reči, Support URL (https://minkefm.fifthguild.com/),
       kontakt za review, napomena za reviewer-a (nema naloga, sve radi bez prijave).
6. [ ] Izabrati build 6 → **Add for Review** → Submit. Izdavanje: ručno ili automatski po odobrenju.
       Enkripcija je već odgovorena u Info.plist (`ITSAppUsesNonExemptEncryption = false`).

### D. Google Play Console (radiš ti, idemo zajedno)
1. [ ] Store listing: naziv, kratak i pun opis, ikonica, feature graphic, slike telefona,
       kategorija **Music & Audio**, kontakt email, website.
2. [ ] App content: Privacy policy URL; Ads: ne; App access: sve dostupno bez prijave;
       Content rating (IARC upitnik); Target audience: 13+ (ne deca); News app: ne;
       **Data safety**: ništa se ne prikuplja ni ne deli, saobraćaj je šifrovan (HTTPS gde stanica podržava).
3. [ ] **Foreground service** deklaracija: `mediaPlayback` – opis "plays the radio station the
       user started, with controls in the notification"; možda traže kratak video (snimiću ga sa emulatora).
4. [ ] Production → Create release → AAB 1004 (ili promote iz internal testing-a) → release notes
       → zemlje → Review and roll out.

### STANJE (2026-11-19 uveče): poslato na review, čekamo

| | Build | Status | Izlazak |
|---|---|---|---|
| App Store | 1.0.0 (11), samo iPhone | Waiting for Review | **ručno**: posle odobrenja klikni *Release this version* |
| Google Play | 1.0.0 (1011) | Changes in review | **sam**, čim Google odobri (Managed publishing nije moglo pre prve objave) |
| Mac App Store | 1.0.0 (1), universal | Waiting for Review (poslato 2026-11-24) | **ručno** |

**2026-11-24:** iOS 1.0.0 je odobren ("Ready for Distribution"). Mac verzija je dodata kao
platforma u isti App Store Connect zapis: sandbox (`src-tauri/macos/Entitlements.plist`),
build `scripts/build-mac-appstore.sh` (konfiguracija `src-tauri/tauri.appstore.conf.json`,
build broj podići pre svakog upload-a), upload preko Transporter-a. Tekstovi i notes su u
`store/LISTING.md`, a screenshotovi u `store/mac-app-store/`.
Primećeno: Yurd FM (Azerbejdžan) prikazuje reklamu "Reklam — Yerləşdirmək üçün (+994) …"
kao naslov pesme; `classifyTitle` treba da je odbije.

Urađeno: B (tekstovi i slike u `store/`, `store/LISTING.md`), C i D u celosti. Tag `v1.0.0`
je na commitu 1.0.0 (iOS 11); Android je posle toga morao na 1010 (16 KB poravnanje,
`src-tauri/build.rs`) pa 1011 (portrait nije obavezan, AndroidManifest).

**Kad stigne mail:**
- Odbijanje ili pitanje (Apple: App Store Connect → App Review; Google: Inbox / Policy status)
  → nalepiti tekst, rešavamo. Spremni odgovori: prava na sadržaj i napomena za recenzenta
  (Apple), foreground service `mediaPlayback` (Google), sve u `store/LISTING.md`.
- Odobreno → korak E ispod.

**Usput, nije hitno:**
- Ime prodavca na App Store-u je "Uro Mini" (sistem je izbacio š/ć): zatražiti od Apple
  podrške promenu u "Uros Minic" (Contact Us → Membership and Account).
- Android: prikaz ostane na "Connecting..." ako se webview ponovo učita dok servis već svira
  (viđeno samo veštački, pri slikanju); proveriti posle objave.
- Provera pre objave (skripta): poravnanje .so, manifest (portrait, AD_ID, cleartext),
  brojevi verzija, potpis, da sledeći update prođe bez vraćanja.
- Do aprila 2027: macOS Tahoe 26.6+ i Xcode 27 (Apple traži iOS 27 SDK).

### E. Posle odobrenja
- [ ] Linkovi u sajtu (`site/src/constants.ts` → `STORES`): App Store
      `https://apps.apple.com/app/id6827227577`, Play
      `https://play.google.com/store/apps/details?id=com.fifthguild.minkefm` → push (sajt se sam deployuje).
- [ ] Zvanični App Store / Google Play bedževi na sajtu umesto "Coming soon" dugmadi.

## 5. Održavanje

- [ ] **README** – zameniti Tauri šablon pravim opisom (šta je, kako se pokreće, Android build).
- [ ] **`Cargo.toml` metapodaci** – `description = "A Tauri App"`, `authors = ["you"]`.
- [ ] **Testovi na frontendu** (Vitest) – bar `classifyTitle` iz `useNowPlaying.ts` i
  `skipDeadStation` iz `useStream.ts` (indeksi posle `splice`).
- [ ] **CSP** – `"csp": null` u `src-tauri/tauri.conf.json`; postaviti pre deljenja aplikacije.
- [ ] **Auto-update** (`tauri-plugin-updater`) – samo ako aplikacija ide drugima.
