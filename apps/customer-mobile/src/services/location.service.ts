import * as ExpoLocation from 'expo-location';
import { Linking } from 'react-native';
import { geoUri } from '@soliton/maps';
import type { Location } from '@soliton/api-contract';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function requestLocationPermission(): Promise<PermissionStatus> {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function getLocationPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await ExpoLocation.getForegroundPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function getCurrentLocation(): Promise<Location | null> {
  const { status } = await ExpoLocation.getForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  try {
    const pos = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

export async function openNavigation(destination: Location, label?: string): Promise<void> {
  const uri = geoUri(destination, label);
  await Linking.openURL(uri);
}

/** Display-ready distance string, e.g. "1.2 km" or "800 m". */
export function formatDistanceMeters(meters: number | null | undefined): string {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Rough travel time estimate from straight-line distance.
 * Assumes ~25 km/h average in a dense neighbourhood (includes traffic + route factor).
 * Returns a range string like "10–14 min" to signal it's an estimate, not a timetable.
 */
export function estimateTravelRange(distanceMeters: number): string {
  const km = distanceMeters / 1000;
  const avgSpeedKph = 25;
  const midMin = Math.round((km / avgSpeedKph) * 60);
  const loMin = Math.max(1, Math.round(midMin * 0.8));
  const hiMin = Math.round(midMin * 1.2);
  if (loMin === hiMin) return `${loMin} min`;
  return `${loMin}–${hiMin} min`;
}

/**
 * ETA range for a queue wait, adding ±20% to signal uncertainty.
 * e.g. etaMinutes=15 → "12–18 min"
 */
export function etaRange(etaMinutes: number): string {
  const lo = Math.max(1, Math.round(etaMinutes * 0.8));
  const hi = Math.round(etaMinutes * 1.2);
  if (lo === hi) return `${lo} min`;
  return `${lo}–${hi} min`;
}
