/**
 * Provider-neutral maps contract.
 *
 * FREE-ONLY: the implementation (LocalMapsProvider) makes no network calls and needs no API
 * key. Soliton contains no paid or usage-billed map integration. A hosted provider could be
 * added later by implementing {@link MapsProvider}, but only as an explicit decision.
 *
 * Fail-safe rule: every operation that would need external data returns a {@link MapsResult}.
 * When it cannot be done the result is `{ available: false, reason }` — never a throw, and
 * never fabricated data.
 *
 * A map provider is a DISPLAY/DATA source only. It never becomes the source of truth for
 * queue, staff, chairs, availability, ETA or operating state — Soliton owns those.
 */

export interface LatLng {
  readonly latitude: number;
  readonly longitude: number;
}

export interface NearbyQuery {
  readonly center: LatLng;
  readonly radiusMeters: number;
  readonly maxResults?: number;
}

export interface TravelTimeQuery {
  readonly origin: LatLng;
  readonly destination: LatLng;
}

export interface GeocodeResult {
  readonly location: LatLng;
  readonly formattedAddress: string | null;
}

/**
 * Straight-line GEOGRAPHIC distance over the Earth's surface. It is NOT a driving/walking
 * distance and NOT a travel time; never present it as an ETA.
 */
export interface GeographicDistance {
  readonly meters: number;
  readonly kind: 'geographic';
}

/** A place that exists in an external provider but is NOT a Soliton salon. */
export interface ExternalPlace {
  readonly source: 'external';
  readonly provider: string;
  readonly placeId: string;
  readonly name: string;
  readonly location: LatLng;
  readonly address: string | null;
}

export type UnavailableReason =
  /** The capability exists in the interface but is switched off. */
  | 'PROVIDER_DISABLED'
  /** This provider cannot perform the operation (e.g. local geocoding). */
  | 'NOT_SUPPORTED';

export type MapsResult<T> =
  | { readonly available: true; readonly value: T }
  | { readonly available: false; readonly reason: UnavailableReason };

export const available = <T>(value: T): MapsResult<T> => ({ available: true, value });
export const unavailable = (reason: UnavailableReason): MapsResult<never> => ({
  available: false,
  reason,
});

/**
 * How a map should be drawn, in a MapLibre-compatible spirit:
 *  - blank:         markers on a plain canvas; needs no tiles and no network (the default)
 *  - raster-tiles:  an operator-supplied XYZ tile template (e.g. SELF-HOSTED OpenStreetMap
 *                   tiles). Public OSM tile servers must NOT be used at scale — see
 *                   https://operations.osmfoundation.org/policies/tiles/ — so no tile URL
 *                   is configured by default.
 */
export type MapStyleSpec =
  | { readonly kind: 'blank' }
  | {
      readonly kind: 'raster-tiles';
      readonly urlTemplate: string;
      readonly attribution: string;
      readonly maxZoom: number;
    };

/** Marker shown on a map. Soliton markers represent Soliton-connected salons only. */
export interface MapMarker {
  readonly id: string;
  readonly title: string;
  readonly location: LatLng;
  readonly source: 'soliton' | 'external';
}

/** Props of the (platform-rendered) map view. */
export interface MapViewProps {
  readonly center: LatLng;
  readonly markers: readonly MapMarker[];
  readonly style: MapStyleSpec;
  readonly onMarkerPress?: (marker: MapMarker) => void;
  readonly selectedMarkerId?: string;
  readonly accessibilityLabel?: string;
}

/** Vendor-neutral maps provider contract. */
export interface MapsProvider {
  readonly name: string;
  /** False for a disabled provider: every network operation then reports PROVIDER_DISABLED. */
  readonly enabled: boolean;
  searchNearby(query: NearbyQuery): Promise<MapsResult<ExternalPlace[]>>;
  /** `value: null` means the provider worked but found no match. */
  geocode(address: string): Promise<MapsResult<GeocodeResult | null>>;
  /** Pure, local, synchronous. Straight-line only — see {@link GeographicDistance}. */
  calculateDistance(from: LatLng, to: LatLng): MapsResult<GeographicDistance>;
  /** Real travel time needs a routing service; providers without one report NOT_SUPPORTED. */
  travelTimeSeconds(query: TravelTimeQuery): Promise<MapsResult<number>>;
  /** Describes how to draw the map (the `renderMap` seam). Never makes a request itself. */
  mapStyle(): MapStyleSpec;
  /** Pure URL/URI builder for handing off to a navigation app. No network. */
  directionsUrl(destination: LatLng, label?: string): string;
}
