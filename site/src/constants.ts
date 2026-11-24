/** What the site says in more than one place, kept together so a change is made once. */

export const NAME = 'MinkeFM'

export const TAGLINE = 'Radio from everywhere, on a deck you can hold'

export const DESCRIPTION = 'Internet radio from 172 genres and nearly 200 countries, played on a cassette deck, a transistor, a turntable, a hi-fi tuner or a pocket LCD. Free for iPhone, Android and Linux, with no account and no ads.'

/** Where to write about the app, the site and what is kept. */
export const CONTACT = 'uros.minic@fifthguild.com'

/**
 * Store pages. An empty one makes its button say "coming soon" instead of leading nowhere.
 * The App Store link names no country, so Apple opens the visitor's own storefront.
 */
export const STORES = {
  appStore: 'https://apps.apple.com/app/id6827227577',
  googlePlay: 'https://play.google.com/store/apps/details?id=com.fifthguild.minkefm',
}

/** The App Store id, for Safari's smart app banner on iPhone. */
export const APP_STORE_ID = '6827227577'

/**
 * Linux packages, attached to a GitHub release by .github/workflows/linux.yml. A new
 * Linux build is a new tag, and LINUX_RELEASE and LINUX_VERSION move with it.
 */
const LINUX_RELEASE = 'linux-v1.0.0'
const LINUX_VERSION = '1.0.0'
const RELEASES = 'https://github.com/dev-uros/minke-fm/releases'
export const LINUX = {
  deb: `${RELEASES}/download/${LINUX_RELEASE}/MinkeFM_${LINUX_VERSION}_amd64.deb`,
  rpm: `${RELEASES}/download/${LINUX_RELEASE}/MinkeFM-${LINUX_VERSION}-1.x86_64.rpm`,
  appImage: `${RELEASES}/download/${LINUX_RELEASE}/MinkeFM_${LINUX_VERSION}_amd64.AppImage`,
  /** Every file, ARM builds included, with how to install each. */
  all: `${RELEASES}/tag/${LINUX_RELEASE}`,
}
