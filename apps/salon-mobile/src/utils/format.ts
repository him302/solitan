/**
 * Formatting utilities for salon-facing display. Purely local — no external service.
 */

/** Formats price in integer minor units (paise) to ₹ display. */
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
