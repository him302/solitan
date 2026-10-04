/**
 * Formatting utilities for customer-facing display. Purely local — no external service.
 */

/** Formats distance in metres to a human-readable string. */
export function formatDistance(meters: number | null): string | null {
  if (meters === null || meters === undefined) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formats price in integer minor units (paise) to ₹ display.
 * Uses integer division — never floats for money.
 */
export function formatPrice(priceCents: number): string {
  const rupees = Math.floor(priceCents / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

/** Formats estimated service duration. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}
