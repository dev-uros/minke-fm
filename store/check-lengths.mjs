// Checks every field in LISTING.md against its store's limit. Run: node store/check-lengths.mjs
import { readFileSync } from 'node:fs'
const text = readFileSync(new URL('./LISTING.md', import.meta.url), 'utf8')
// Each limited field: its heading, then the first ``` block after it.
const fields = [...text.matchAll(/\*\*([^*]+)\*\* \((\d+)[^)]*\)\n```\n([\s\S]*?)\n```/g)]
let ok = true
for (const [, name, limit, value] of fields) {
  const length = [...value].length
  const fits = length <= Number(limit)
  ok &&= fits
  console.log(`${fits ? 'ok  ' : 'OVER'} ${name.padEnd(22)} ${String(length).padStart(4)} / ${limit}`)
}
process.exit(ok ? 0 : 1)
