// The site's pictures of the country picker, in every skin: the app's own UI, from its Vite
// dev server, in WebKit at the iPhone 17 Pro's size (402x874 points, x3), with Tauri's IPC stood
// in for. The real status bar from the simulator shot of the same skin (phone-<skin>.png) is laid
// over the top, so these sit beside the hero's shots.
//
//   npm run dev                                   (in the repository root: the app on :1420)
//   npx playwright install webkit                 (once)
//   node scripts/feature-shots.mjs                (in site/)
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { webkit } from 'playwright'
import sharp from 'sharp'

const S = mkdtempSync(join(tmpdir(), 'minke-shots-'))
const SITE = new URL('../src/assets/shots', import.meta.url).pathname
const DEMO = ['9766d47a', '5b9ceedf', '766a0b33', '960c7c81', '42dde628', '9f66a5b4', 'e392aeac', '961f9f7f']
// Favourites to show: real jazz stations, as radio-browser listed them (scripts/demo-stations.json).
const jazz = JSON.parse(readFileSync(new URL('./demo-stations.json', import.meta.url), 'utf8'))
const demo = DEMO.map(p => jazz.find(s => s.stationuuid.startsWith(p))).map(s => ({
  name: s.name.trim(), id: s.stationuuid, url: s.url_resolved, urlResolved: s.url_resolved, country: s.country, state: s.state, type: 'jazz',
}))

const SKINS = {
  cassette: { genres: '.line2:has(.line2-text)' },
  radio: { genres: '.dial' },
  vinyl: { genres: '.vn-label' },
  hifi: { genres: '.hf-knob-wrap' },
  lcd: { genres: '.lc-strip' },
}

const stub = ({ skin, demo }) => {
  localStorage.setItem('minke:skin', skin)
  localStorage.setItem('favorites', JSON.stringify(demo))
  localStorage.setItem('last-station', JSON.stringify(demo[0]))
  let next = 1
  const channels = {}
  const send = (event, message) => {
    const ch = channels[event]
    if (ch) window[`_${ch.id}`]({ message, index: ch.index++ })
  }
  window.__TAURI_INTERNALS__ = {
    metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', windowLabel: 'main' } },
    transformCallback: (cb) => { const id = next++; window[`_${id}`] = cb; return id },
    unregisterCallback: () => {},
    invoke: async (cmd, args) => {
      if (cmd === 'is_mobile') return true
      if (cmd === 'plugin:player|registerListener') { channels[args.event] = { id: args.handler.id, index: 0 }; return null }
      // The station "plays" at once: the deck shows ON AIR rather than a connecting spinner.
      if (cmd === 'plugin:player|play') setTimeout(() => send('state', { playing: true, playWhenReady: true, state: 'ready' }), 200)
      return null
    },
  }
}

const browser = await webkit.launch()
for (const [skin, sel] of Object.entries(SKINS)) {
  const context = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  await context.addInitScript(stub, { skin, demo })
  const page = await context.newPage()
  await page.goto('http://localhost:1420/')
  await page.waitForTimeout(3500)
  // The phone's safe areas, as iOS reports them on this model.
  await page.evaluate(() => {
    const s = document.documentElement.style
    s.setProperty('--safe-top', '62px'); s.setProperty('--safe-bottom', '34px')
  })
  await page.waitForTimeout(500)

  await page.locator(sel.genres).first().dispatchEvent('click')
  await page.locator('.source-tab', { hasText: 'Countries' }).click()
  await page.getByRole('button', { name: /United States/ }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${S}/raw-countries-${skin}.png` })
  await context.close()

  // The real status bar (and island) from the simulator's shot of the same skin.
  const bar = await sharp(`${SITE}/phone-${skin}.png`).extract({ left: 0, top: 0, width: 1206, height: 150 }).toBuffer()
  for (const kind of ['countries']) {
    await sharp(`${S}/raw-${kind}-${skin}.png`).composite([{ input: bar, top: 0, left: 0 }]).png().toFile(`${SITE}/${kind}-${skin}.png`)
  }
  console.log('done', skin)
}
await browser.close()
