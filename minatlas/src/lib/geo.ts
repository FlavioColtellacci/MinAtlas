/** [longitude, latitude] in WGS84, degrees. */
export type LngLat = [number, number];

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two WGS84 points in kilometres. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sLat = Math.sin(dLat / 2);
  const sLon = Math.sin(dLon / 2);
  const h =
    sLat * sLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sLon * sLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

function pointInRing(point: LngLat, ring: LngLat[]): boolean {
  if (ring.length < 3) return false;
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * True if `point` lies inside the MultiPolygon (any polygon, respecting holes).
 * Assumes valid GeoJSON: first ring of each polygon is exterior, following rings are holes.
 */
export function pointInMultiPolygon(point: LngLat, multipolygon: GeoJSON.MultiPolygon): boolean {
  const polys = multipolygon.coordinates;
  if (!polys?.length) return false;

  for (const polygon of polys) {
    if (!polygon?.length) continue;
    const exterior = polygon[0] as LngLat[];
    if (!pointInRing(point, exterior)) continue;

    let inHole = false;
    for (let h = 1; h < polygon.length; h++) {
      const hole = polygon[h] as LngLat[];
      if (pointInRing(point, hole)) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}
