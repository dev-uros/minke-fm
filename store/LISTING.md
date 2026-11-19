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
