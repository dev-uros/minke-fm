/**
 * The stand-in stations, per genre and per country, that the app plays when the station
 * directory (radio-browser) is down. GitHub Actions rebuilds src/assets/fallback-stations.json
 * every week and commits it; that push redeploys this site, and the app fetches this file
 * weekly (src/services/useRemoteFallback.ts). Served as a static file: no Worker runs.
 */
import stations from '../../../src/assets/fallback-stations.json'

export function GET() {
  return new Response(JSON.stringify(stations), { headers: { 'Content-Type': 'application/json' } })
}
