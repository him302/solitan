import type { GeographicDistance, LatLng } from './types';

/** Mean Earth radius in metres (IUGG). */
const EARTH_RADIUS_M = 6_371_008.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Great-circle (haversine) distance between two points, in metres.
 *
 * This is a LOCAL, dependency-free calculation, labelled `geographic`: it is straight-line
 * distance, not travel time. On the server, PostGIS `ST_Distance(geography, geography)` is
 * the authoritative value (it uses the WGS84 spheroid and differs from this spherical
 * model by up to ~0.5%); this helper exists for places that have no database, such as
 * client-side previews and tests.
 */
export function geographicDistance(from: LatLng, to: LatLng): GeographicDistance {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLng / 2) ** 2;
  const meters = 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
  return { meters, kind: 'geographic' };
}

/**
 * `geo:` URI understood by Android's map apps (whichever maps app the user has installed). It is
 * provider-neutral: the user's own maps app handles it, and Soliton makes no API call.
 */
export function geoUri(destination: LatLng, label?: string): string {
  const point = `${destination.latitude},${destination.longitude}`;
  const query = label ? `${point}(${encodeURIComponent(label)})` : point;
  return `geo:${point}?q=${query}`;
}
