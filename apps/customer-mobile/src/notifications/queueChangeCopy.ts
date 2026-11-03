import type { QueueEntryDto } from '@soliton/api-contract';

/**
 * Decides whether a queue update is worth interrupting someone for, and what to say.
 *
 * Deliberately conservative. A notification for every position change would be
 * intolerable in a ten-person queue, so only the moments that change what the customer
 * should *do* are announced: their turn approaching, their turn arriving, service
 * finishing, and losing their place.
 *
 * Returns null when the update should pass silently; the in-app screen still updates.
 */
export function describeQueueChange(
  previous: QueueEntryDto | null,
  next: QueueEntryDto,
): { title: string; body: string } | null {
  const salon = next.salonName || 'the salon';
  const token = `#${next.tokenNumber}`;

  // Nothing to compare against on first load — do not announce the state of the world.
  if (!previous) return null;
  if (previous.entryState === next.entryState) return null;

  switch (next.entryState) {
    case 'notified':
      return {
        title: 'Almost your turn',
        body: `${salon} will be ready for ${token} shortly. Time to head over.`,
      };
    case 'in_service':
      return { title: 'It is your turn', body: `${salon} is ready for ${token} now.` };
    case 'completed':
      return { title: 'All done', body: `Your service at ${salon} is complete.` };
    case 'cancelled':
      return { title: 'Queue entry cancelled', body: `${token} at ${salon} was cancelled.` };
    case 'no_show':
      return {
        title: 'Marked as not arrived',
        body: `${token} at ${salon} was marked a no-show. Contact the salon if this is wrong.`,
      };
    default:
      // waiting, checked_in, bumped: visible on screen, not worth a buzz.
      return null;
  }
}
