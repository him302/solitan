import { geoUri, geographicDistance } from './geo';
import {
  available,
  type ExternalPlace,
  type GeocodeResult,
  type GeographicDistance,
  type LatLng,
  type MapStyleSpec,
  type MapsProvider,
  type MapsResult,
  type NearbyQuery,
  type TravelTimeQuery,
} from './types';

/**
 * Test double. Returns only what the test seeds — it never invents places, coordinates or
 * travel times — and makes no network calls.
 */
export class MockMapsProvider implements MapsProvider {
  readonly name = 'mock';
  readonly enabled = true;

  constructor(
    private readonly seed: {
      geocode?: Record<string, GeocodeResult>;
      places?: ExternalPlace[];
      travelSeconds?: number;
    } = {},
  ) {}

  async searchNearby(query: NearbyQuery): Promise<MapsResult<ExternalPlace[]>> {
    return available((this.seed.places ?? []).slice(0, query.maxResults ?? 20));
  }

  async geocode(address: string): Promise<MapsResult<GeocodeResult | null>> {
    return available(this.seed.geocode?.[address] ?? null);
  }

  calculateDistance(from: LatLng, to: LatLng): MapsResult<GeographicDistance> {
    return available(geographicDistance(from, to));
  }

  async travelTimeSeconds(_query: TravelTimeQuery): Promise<MapsResult<number>> {
    return available(this.seed.travelSeconds ?? 600);
  }

  mapStyle(): MapStyleSpec {
    return { kind: 'blank' };
  }

  directionsUrl(destination: LatLng, label?: string): string {
    return geoUri(destination, label);
  }
}
