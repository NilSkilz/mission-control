// Sunrise / sunset for the Tide day-night engine.
// Trimmed from the well-known SunCalc algorithm (Vladimir Agafonkin, BSD).
// Returns absolute instants (UTC-correct Date objects), so comparing against
// `new Date()` works regardless of the viewer's timezone.

const rad = Math.PI / 180
const dayMs = 1000 * 60 * 60 * 24
const J1970 = 2440588
const J2000 = 2451545
const e = rad * 23.4397 // obliquity of the Earth

// Crackington Haven, Cornwall. The family home. Everything follows this sun.
export const CRACKINGTON_HAVEN = { lat: 50.7422, lng: -4.6357 }

const toJulian = (d) => d.valueOf() / dayMs - 0.5 + J1970
const fromJulian = (j) => new Date((j + 0.5 - J1970) * dayMs)
const toDays = (d) => toJulian(d) - J2000

const solarMeanAnomaly = (d) => rad * (357.5291 + 0.98560028 * d)

const eclipticLongitude = (M) => {
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M))
  const P = rad * 102.9372 // perihelion of the Earth
  return M + C + P + Math.PI
}

const declination = (L) => Math.asin(Math.sin(e) * Math.sin(L))

const J0 = 0.0009
const julianCycle = (d, lw) => Math.round(d - J0 - lw / (2 * Math.PI))
const approxTransit = (Ht, lw, n) => J0 + (Ht + lw) / (2 * Math.PI) + n
const solarTransitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L)
const hourAngle = (h, phi, dec) =>
  Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)))

const getSetJ = (h, lw, phi, dec, n, M, L) => {
  const w = hourAngle(h, phi, dec)
  const a = approxTransit(w, lw, n)
  return solarTransitJ(a, M, L)
}

// Sun altitude for the standard sunrise/sunset definition (top of disc at horizon).
const H0 = -0.833 * rad

/**
 * Sunrise and sunset for a given date and location.
 * Returns { sunrise, sunset } as Date, or null values in the (impossible here)
 * polar day/night case where the sun never crosses the horizon.
 */
export function getSunTimes(date, lat = CRACKINGTON_HAVEN.lat, lng = CRACKINGTON_HAVEN.lng) {
  const lw = rad * -lng
  const phi = rad * lat
  const d = toDays(date)

  const n = julianCycle(d, lw)
  const ds = approxTransit(0, lw, n)
  const M = solarMeanAnomaly(ds)
  const L = eclipticLongitude(M)
  const dec = declination(L)

  const Jnoon = solarTransitJ(ds, M, L)
  const Jset = getSetJ(H0, lw, phi, dec, n, M, L)

  if (Number.isNaN(Jset)) {
    return { sunrise: null, sunset: null, alwaysDay: dec * phi > 0 }
  }

  const Jrise = Jnoon - (Jset - Jnoon)
  return { sunrise: fromJulian(Jrise), sunset: fromJulian(Jset) }
}

/**
 * Is it daytime right now at the family home?
 * Falls back to a sensible 07:00-19:00 window if the sun maths ever bails.
 */
export function isDaylight(now = new Date()) {
  const { sunrise, sunset, alwaysDay } = getSunTimes(now)
  if (!sunrise || !sunset) return alwaysDay ?? true
  return now >= sunrise && now < sunset
}
