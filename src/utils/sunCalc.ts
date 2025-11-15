/**
 * Calculate sunrise and sunset times for a given location and date
 * Based on the astronomical algorithms
 */

const RAD = Math.PI / 180;
const DAY_MS = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;

function toJulian(date: Date): number {
  return date.valueOf() / DAY_MS - 0.5 + J1970;
}

function fromJulian(j: number): Date {
  return new Date((j + 0.5 - J1970) * DAY_MS);
}

function toDays(date: Date): number {
  return toJulian(date) - J2000;
}

const e = RAD * 23.4397; // obliquity of the Earth

function rightAscension(l: number, b: number): number {
  return Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
}

function declination(l: number, b: number): number {
  return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
}

function azimuth(H: number, phi: number, dec: number): number {
  return Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
}

function altitude(H: number, phi: number, dec: number): number {
  return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
}

function siderealTime(d: number, lw: number): number {
  return RAD * (280.16 + 360.9856235 * d) - lw;
}

function solarMeanAnomaly(d: number): number {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M: number): number {
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372;
  return M + C + P + Math.PI;
}

function sunCoords(d: number): { dec: number; ra: number } {
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  return {
    dec: declination(L, 0),
    ra: rightAscension(L, 0),
  };
}

function julianCycle(d: number, lw: number): number {
  return Math.round(d - 0.0009 - lw / (2 * Math.PI));
}

function approxTransit(Ht: number, lw: number, n: number): number {
  return 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
}

function solarTransitJ(ds: number, M: number, L: number): number {
  return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
}

function hourAngle(h: number, phi: number, d: number): number {
  return Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));
}

function getSetJ(h: number, lw: number, phi: number, dec: number, n: number, M: number, L: number): number {
  const w = hourAngle(h, phi, dec);
  const a = approxTransit(w, lw, n);
  return solarTransitJ(a, M, L);
}

interface SunTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
}

/**
 * Calculate sunrise and sunset times
 * @param date - The date to calculate for
 * @param latitude - Latitude in degrees (-90 to 90)
 * @param longitude - Longitude in degrees (-180 to 180)
 * @returns Object with sunrise and sunset Date objects
 */
export function getSunTimes(date: Date, latitude: number, longitude: number): SunTimes {
  const lw = RAD * -longitude;
  const phi = RAD * latitude;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L, 0);
  const Jnoon = solarTransitJ(ds, M, L);

  const h0 = -0.833 * RAD; // standard sunrise/sunset angle

  const Jset = getSetJ(h0, lw, phi, dec, n, M, L);
  const Jrise = Jnoon - (Jset - Jnoon);

  return {
    sunrise: fromJulian(Jrise),
    sunset: fromJulian(Jset),
    solarNoon: fromJulian(Jnoon),
  };
}

/**
 * Get sunrise time as a string in HH:MM format
 */
export function getSunriseTime(date: Date, latitude: number, longitude: number): string {
  const { sunrise } = getSunTimes(date, latitude, longitude);
  return formatTime(sunrise);
}

/**
 * Get sunset time as a string in HH:MM format
 */
export function getSunsetTime(date: Date, latitude: number, longitude: number): string {
  const { sunset } = getSunTimes(date, latitude, longitude);
  return formatTime(sunset);
}

/**
 * Format a Date object to HH:MM string
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get both sunrise and sunset times as formatted strings
 */
export function getSunriseSunsetTimes(
  date: Date,
  latitude: number,
  longitude: number
): { sunrise: string; sunset: string; sunriseDate: Date; sunsetDate: Date } {
  const { sunrise, sunset } = getSunTimes(date, latitude, longitude);
  return {
    sunrise: formatTime(sunrise),
    sunset: formatTime(sunset),
    sunriseDate: sunrise,
    sunsetDate: sunset,
  };
}

