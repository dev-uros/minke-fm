/**
 * The app's five skins, as the site shows them. Names and blurbs are the app's own
 * (src/services/useSkin.ts); the site's colours for each are in styles/skins.css.
 */
export type SkinId = 'cassette' | 'radio' | 'vinyl' | 'hifi' | 'lcd'

export interface Skin {
  id: SkinId
  name: string
  blurb: string
  /** The browser's bar, matched to the page's background. */
  themeColor: string
  /** Background, panel, accent, second accent: the swatch on the picker. */
  swatch: [string, string, string, string]
  /** The faces its page is set in (styles/skins.css), as document.fonts.load takes them. */
  faces: string[]
}

export const SKINS: Skin[] = [
  { id: 'cassette', name: 'Cassette', blurb: 'The original mixtape deck', themeColor: '#1a1a1a', swatch: ['#1a1a1a', '#252525', '#f2bc00', '#f15a25'], faces: ['400 1em Montserrat', '700 1em Montserrat', '800 1em Montserrat'] },
  { id: 'radio', name: 'Transistor', blurb: 'Walnut cabinet, glowing tuning dial', themeColor: '#23160d', swatch: ['#23160d', '#eadcbd', '#e0912f', '#a8321e'], faces: ['400 1em "Zilla Slab"', '700 1em "Zilla Slab"'] },
  { id: 'vinyl', name: 'Turntable', blurb: 'A record spinning on green felt', themeColor: '#0f2a22', swatch: ['#0f2a22', '#143a2e', '#c9a45c', '#e8a87c'], faces: ['400 1em "Playfair Display"', '700 1em "Playfair Display"'] },
  { id: 'hifi', name: 'Hi-fi', blurb: 'Nineties tuner with a glowing display', themeColor: '#0b0b0c', swatch: ['#0b0b0c', '#04110f', '#5ff5d2', '#ffb347'], faces: ['400 1em VT323'] },
  { id: 'lcd', name: 'Pocket LCD', blurb: 'Four shades of green, chunky pixels', themeColor: '#1f2326', swatch: ['#1f2326', '#c7d3a0', '#4e5a3a', '#1e2416'], faces: ['400 1em Silkscreen'] },
]

export const STORAGE_KEY = 'minke-site:skin'
