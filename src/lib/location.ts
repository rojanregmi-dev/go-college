export type GeoPoint = { latitude: number; longitude: number };
type LocatedPost = { latitude?: number | null; longitude?: number | null };

// Adapted from GO AVI's src/lib/location.ts (great-circle distance).
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distanceMiles(origin: GeoPoint | null, post: LocatedPost): number | null {
  if (!origin || post.latitude == null || post.longitude == null) return null;
  return distanceKm(origin, { latitude: post.latitude, longitude: post.longitude }) / 1.609344;
}

export function matchesLocationFilter(post: LocatedPost, origin: GeoPoint | null, radiusMiles: number | null) {
  if (radiusMiles === null) return true;
  const distance = distanceMiles(origin, post);
  return distance !== null && distance <= radiusMiles;
}
