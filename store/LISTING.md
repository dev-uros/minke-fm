# MinkeFM 1.0.0: store listings

Everything to paste into App Store Connect and Google Play Console, field by field.
Character limits are each store's own; every text below fits (checked by `store/check-lengths.mjs`).

Screenshots are in `store/app-store/` and `store/google-play/`, ready to upload in the order of their file names.

---

## Shared

| Field | Value |
|---|---|
| Developer / seller | Fifth Guild |
| Support email | uros.minic@fifthguild.com |
| Website / Marketing URL | https://minkefm.fifthguild.com/ |
| Support URL | https://minkefm.fifthguild.com/ |
| Privacy Policy URL | https://minkefm.fifthguild.com/privacy/ |
| Price | Free, all countries |
| Copyright (App Store) | 2026 Uroš Minić (Fifth Guild) |

---

## App Store Connect

### App Information

**Name** (30)
```
MinkeFM: World Radio
```

**Subtitle** (30)
```
Internet radio on retro decks
```

**Primary category:** Music
**Secondary category:** Entertainment

### Version 1.0.0

**Promotional Text** (170)
```
Radio from everywhere: 172 genres, nearly 200 countries and five retro decks to play them on. Free, with no account and no ads.
```

**Keywords** (100, comma-separated, no spaces after commas)
```
fm,stations,music,lofi,jazz,rock,classical,cassette,turntable,vinyl,hifi,tuner,sleep timer,live
```

**Description** (4000): the same text as Google Play's full description, below.

**What's New in This Version**
```
The first release of MinkeFM.
```

### App Review Information

**Sign-in required:** No

**Notes**
```
MinkeFM is an internet radio player. No account or sign-in is needed; everything works as soon as the app opens.

Stations come from radio-browser.info, a free public directory. Each station is streamed directly from the broadcaster's own public stream. The app does not record, download or rebroadcast any audio.

To try it: the app starts playing a lofi station. Tap the genre on the cassette's label to change genre, or open the Countries tab there and tap Spin the globe. The moon (top right) sets a sleep timer, the half circle (top left) changes the deck's look, and ? explains every feature.

Audio keeps playing in the background and with the screen locked (UIBackgroundModes: audio).
```

**Contact:** Uroš Minić, uros.minic@fifthguild.com

### Content Rights
"Does your app contain, show, or access third-party content?" **Yes.** It plays radio streams that broadcasters publish openly for listening; MinkeFM links to them as a player and does not host, record or redistribute them. Confirm that you have the rights needed (Apple asks you to confirm before submitting).

### App Privacy
**Data Not Collected.** MinkeFM has no account, analytics or ads, and sends nothing about the user to Fifth Guild. (The station directory, the stations, Apple's iTunes Search and LRCLIB see the phone's IP address and what was asked, as any server does; that is not collection by the developer.)

### Age Rating (questionnaire)
Radio plays whatever the stations play, so answer:
- Profanity or crude humor: **Infrequent / Mild**
- Mature or suggestive themes: **Infrequent / Mild**
- Everything else (violence, gambling, drugs, horror, medical, contests): **None**
- Unrestricted web access: **No** (no browser in the app)
- User-generated content / messaging: **No**

### Export compliance
Already answered in the build (`ITSAppUsesNonExemptEncryption = NO`); App Store Connect will not ask.

### Screenshots
`store/app-store/6.3-inch/` – iPhone with Dynamic Island, medium display (1206 x 2622): the slot App Store Connect asks for now. Upload all six, in order. (`6.9-inch/` holds 1320 x 2868 copies in case the 6.9" slot is asked for.) No iPad screenshots: the app is iPhone only.

---

## Google Play Console

### Main store listing

**App name** (30)
```
MinkeFM: World Radio
```

**Short description** (80)
```
Thousands of radio stations by genre and country, on a retro deck you choose.
```

**Full description** (4000)
```
MinkeFM plays internet radio from all over the world, on a deck you can hold.

Pick a genre or a country and press play. MinkeFM finds the stations, shows what's playing and moves on by itself when a station goes quiet.

FIVE DECKS
Play your radio on a cassette deck, a walnut transistor, a turntable, a nineties hi-fi tuner or a pocket LCD. Pick one and the whole app changes with it.

172 GENRES AND NEARLY 200 COUNTRIES
From lofi and deep house to bossa nova and black metal. Or tune into Japan, Brazil or Iceland, or tap Spin the globe and let MinkeFM choose for you.

SONG TITLES YOU CAN TRUST
When a station says what it's playing, you see the artist and the title, with the album cover when it can be matched for certain. If a station sends an ad or a slogan instead, you see the station's name rather than a wrong guess.

MADE FOR LISTENING
• Lyrics, where they exist, and a history of the songs you've heard
• Sleep timer: 15, 30, 60 or 90 minutes, with a gentle fade at the end
• Keeps playing with the screen off, with controls on the lock screen and your headphones
• Favourites, kept on your phone
• Search that forgives typos and accents, and knows countries by their own names
• Stations that stop answering are skipped by themselves

PRIVATE BY DESIGN
No account, no ads, no tracking. Your favourites and your history never leave your phone.

Stations come from radio-browser.info, a free directory kept up by listeners. MinkeFM plays each station straight from the broadcaster's own stream.
```

**App icon:** `store/google-play/icon-512.png`
**Feature graphic:** `store/google-play/feature-graphic.png` (1024 x 500)
**Phone screenshots:** `store/google-play/` (1350 x 2400, 9:16), all six, in order.

**Category:** Music & Audio
**Tags (pick up to 5):** Radio, Music player, Music streaming, Lofi, Jazz (choose the closest Play offers)
**Contact email:** uros.minic@fifthguild.com
**Website:** https://minkefm.fifthguild.com/

### App content

| Section | Answer |
|---|---|
| Privacy policy | https://minkefm.fifthguild.com/privacy/ |
| Ads | **No**, the app has no ads |
| App access | **All functionality is available without special access** (no sign-in) |
| Content rating | IARC questionnaire: category **"All Other App Types"** (or Music if offered); no violence, sex, drugs, gambling; **"music with explicit lyrics may play": Yes / occasional**; no user interaction or sharing; no location sharing; no purchases |
| Target audience | **13 and over** (not designed for children) |
| News app | **No** |
| COVID-19, government, financial, health | **No** to each |
| Data safety | "Does your app collect or share any of the required user data types?" **No.** Nothing is collected or shared. |
| Advertising ID | **No**, the app does not use it |

### Foreground service declaration
Type: **Media playback** (`FOREGROUND_SERVICE_MEDIA_PLAYBACK`)

Description:
```
MinkeFM is an internet radio player. When the user starts a station, playback runs in a media-playback foreground service so the radio keeps playing with the screen off or while another app is open. The ongoing media notification shows the station and lets the user pause or change station. The service stops when the user stops playback or exits the app.
```
If Play asks for a video: a 20-second screen recording of starting a station, locking the phone and pausing from the notification (ask Claude to record it on the emulator).

### Production release 1.0.0

**Release name:** `1.0.0` (bundle 1011: 1009 and 1010 were rejected at upload, for 16 KB page alignment and a required portrait screen)

**Release notes**
```
<en-US>
The first release of MinkeFM.
</en-US>
```

**Countries:** all available

---

## Mac App Store (macOS 1.0.0)

Same App Store Connect record as iOS (macOS platform added 2026-11-24). Name, subtitle,
categories, privacy, age rating and price are shared with iOS; the fields below are per
platform. The desktop app has the cassette deck only (the five decks are phone-only), with
pixel-art backdrops, keyboard shortcuts and a menu bar panel instead.

**Promotional Text** (170)
```
Radio from everywhere: 172 genres and nearly 200 countries on a cassette deck, with pixel-art scenes behind it. Free, with no account and no ads.
```

**Keywords** (100)
```
fm,stations,music,lofi,jazz,rock,classical,cassette,menu bar,pixel art,sleep timer,live,internet
```

**Description** (4000)
```
MinkeFM plays internet radio from all over the world, on a cassette deck that sits on your desktop.

Pick a genre or a country and press play. MinkeFM finds the stations, shows what's playing and moves on by itself when a station goes quiet.

172 GENRES AND NEARLY 200 COUNTRIES
From lofi and deep house to bossa nova and black metal. Or tune into Japan, Brazil or Iceland, or tap Spin the globe and let MinkeFM choose for you.

SONG TITLES YOU CAN TRUST
When a station says what it's playing, you see the artist and the title, with the album cover when it can be matched for certain. If a station sends an ad or a slogan instead, you see the station's name rather than a wrong guess.

PIXEL-ART SCENES
Animated pixel-art backdrops play behind the deck. Change the scene whenever you like.

MADE FOR YOUR MAC
• Lives in the menu bar too: see what's playing and pause or skip without opening the window
• Closing the window keeps the radio playing; Cmd+Q quits
• Play/pause and skip with your keyboard's media keys and headphones
• Keyboard shortcuts for everything: Space pauses, H and J change station, L shows lyrics, T sets the sleep timer

MADE FOR LISTENING
• Lyrics, where they exist, and a history of the songs you've heard
• Sleep timer: 15, 30, 60 or 90 minutes, with a gentle fade at the end
• Favourites, kept on your Mac
• Stations that stop answering are skipped by themselves

PRIVATE BY DESIGN
No account, no ads, no tracking. Your favourites and your history never leave your Mac.

Stations come from radio-browser.info, a free directory kept up by listeners. MinkeFM plays each station straight from the broadcaster's own stream.
```

**What's New in This Version**
```
The first Mac release of MinkeFM.
```

**Support URL / Marketing URL / Copyright:** same as iOS (see Shared).

### App Review Information (macOS)

**Sign-in required:** No

**Notes** (same six-part shape as the iOS notes that passed review, plus the Mac specifics)
```
1. SCREEN RECORDING
Attached, recorded on a Mac with the submitted build (1.0.0, build 1). It starts at app launch and shows the typical flow: playback starting, changing genre, the Countries tab and Spin the globe, the song now playing, lyrics and history, changing the backdrop, the sleep timer, favourites, the menu bar panel, and closing the window while the radio keeps playing.
The app has no account registration, login or account deletion, no user-generated content, and no paid content or in-app purchases.

2. PURPOSE AND AUDIENCE
MinkeFM is an internet radio player for anyone who enjoys listening to radio from around the world. Finding good stations by genre or country is hard: public directories list many dead, duplicate or mislabelled streams. MinkeFM picks working stations for 172 genres and nearly 200 countries, shows the song playing only when the station reports it reliably, and skips stations that stop answering. It is free, with no ads, no account and no tracking. The same app is on the App Store for iPhone.

3. HOW TO USE
No account, login, credentials or sample files are needed; everything works as soon as the app opens. Press play on the deck (or Space) to start. Click the genre on the cassette's label to change genre, or open the Countries tab there and click Spin the globe. ☆ saves a favourite. The "?" icon on the deck lists every keyboard shortcut: H/J change station, L shows the song playing with lyrics and history, T sets a sleep timer, G changes the pixel-art backdrop. Media keys and headphone buttons play, pause and skip.
The app also adds a menu bar icon with a small panel to see what's playing and pause or skip. Closing the window keeps the radio playing, as audio players do; clicking the Dock icon brings the window back, and Cmd+Q (or Quit in the menu bar panel) quits.

4. EXTERNAL SERVICES AND SANDBOX ENTITLEMENTS
- radio-browser.info: free public directory of radio stations (the station list).
- The broadcasters' own public streams: audio is played from each station's stream.
- Apple iTunes Search API: album artwork for the song playing.
- LRCLIB (lrclib.net): song lyrics.
- minkefm.fifthguild.com: our own website, which serves a weekly list of fallback stations.
No authentication, payment, analytics, advertising or AI services are used.
com.apple.security.network.client is for the services above. com.apple.security.network.server is for a small relay bound to 127.0.0.1 only, never reachable from outside the Mac: it reads a station's stream, separates the in-band song-title metadata (ICY) that the player cannot handle, and passes plain audio to the app's own player.

5. REGIONAL DIFFERENCES
The app works the same in all regions; its features and content do not change by country. A broadcaster may limit its own stream to some countries; the app then moves on to another station by itself.

6. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
The app is not in a regulated industry. It is a player for radio streams that broadcasters publish openly for listening, like other radio apps. It links to those streams and does not host, record, download or rebroadcast any audio.
```

**Attachment:** the Mac screen recording (to be made with the screenshots).

**App Sandbox Information:** add `com.apple.security.network.client` and `com.apple.security.network.server`; the reasons are in part 4 of the notes.

### Screenshots
`store/mac-app-store/` (2880 x 1800), uploaded in file-name order.
