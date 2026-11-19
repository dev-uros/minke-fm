// The picture shown when a link to the site is shared: the five skins side by side.
// Run after new shots: `node scripts/og.mjs` (writes src/assets/og.png).
import sharp from 'sharp'

const W = 1200
const H = 630
const skins = ['cassette', 'radio', 'vinyl', 'hifi', 'lcd']
const shotW = 196
const shotH = Math.round(shotW * 2622 / 1206)
const gap = 28
const left = (W - (skins.length * shotW + (skins.length - 1) * gap)) / 2
const top = 150

const radius = Math.round(shotW * 0.13)
const mask = Buffer.from(`<svg width="${shotW}" height="${shotH}"><rect width="${shotW}" height="${shotH}" rx="${radius}" ry="${radius}"/></svg>`)

const phones = await Promise.all(skins.map(async (id, i) => ({
  input: await sharp(`src/assets/shots/phone-${id}.png`)
    .resize(shotW, shotH)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer(),
  left: Math.round(left + i * (shotW + gap)),
  top: top + (i % 2) * 22,
})))

const backdrop = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#232323"/><stop offset="1" stop-color="#121212"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="0" y="${H - 10}" width="${W / 2}" height="10" fill="#f2bc00"/>
  <rect x="${W / 2}" y="${H - 10}" width="${W / 2}" height="10" fill="#f15a25"/>
  <text x="${W / 2}" y="78" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="50" font-weight="800" fill="#fffdd0">MinkeFM</text>
  <text x="${W / 2}" y="120" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="26" fill="#f2bc00">Internet radio with a deck you can hold</text>
</svg>`)

await sharp(backdrop).composite(phones).png({ compressionLevel: 9 }).toFile('src/assets/og.png')
console.log('src/assets/og.png')
