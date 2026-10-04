import { geoUri, geographicDistance } from './geo';
import {
  available,
  unavailable,
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

export interface LocalMapsConfig {
  /**
   * Optional XYZ raster tile template, e.g. a SELF-HOSTED tile server
   * (`https://tiles.example.org/{z}/{x}/{y}.png`). Left unset by default, so the map is
   * drawn on a blank canvas and no tile request is ever made.
   */
  readonly tileUrlTemplate?: string;
  readonly tileAttribution?: string;
}

/**
 * The FREE default. Zero network calls, zero API keys, works fully offline.
 *
 * It can compute straight-line distance and hand directions off to the user's own maps
 * app. It honestly reports NOT_SUPPORTED for anything that needs external data
 * (geocoding, nearby external places, travel time) rather than inventing results.
 */
export class LocalMapsProvider implements MapsProvider {
  readonly name = 'local';
  readonly enabled = true;

  constructor(private readonly config: LocalMapsConfig = {}) {}

  async searchNearby(_query: NearbyQuery): Promise<MapsResult<ExternalPlace[]>> {
    return unavailable('NOT_SUPPORTED');
  }

  async geocode(_address: string): Promise<MapsResult<GeocodeResult | null>> {
    return unavailable('NOT_SUPPORTED');
  }

  calculateDistance(from: LatLng, to: LatLng): MapsResult<GeographicDistance> {
    return available(geographicDistance(from, to));
  }

  async travelTimeSeconds(_query: TravelTimeQuery): Promise<MapsResult<number>> {
    return unavailable('NOT_SUPPORTED');
  }

  mapStyle(): MapStyleSpec {
    if (!this.config.tileUrlTemplate) return { kind: 'blank' };
    return {
      kind: 'raster-tiles',
      urlTemplate: this.config.tileUrlTemplate,
      attribution: this.config.tileAttribution ?? '',
      maxZoom: 19,
    };
  }

  directionsUrl(destination: LatLng, label?: string): string {
    return geoUri(destination, label);
  }
}
