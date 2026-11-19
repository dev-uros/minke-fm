import process from 'node:process'
import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'

// Where the site is served from, for canonical links, the sitemap and the picture shared on social sites.
const site = process.env.SITE_URL ?? 'https://minkefm.fifthguild.com'

export default defineConfig({
  site,
  integrations: [sitemap()],
  // A class, not an attribute: a page's styles then reach the components it places with `class`.
  scopedStyleStrategy: 'class',
  // The styles are a few kilobytes: inside the page they cost less than a request the phone waits on.
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
  // /stations.json is the app's own src/assets/fallback-stations.json, one folder up.
  vite: { server: { fs: { allow: ['..'] } } },
})
