import type { NotificationType } from '@soliton/api-contract';

/** Context carried on a notification, used both for wording and for deep-linking. */
export interface NotificationPayload {
  entryId?: string;
  appointmentId?: string;
  salonId?: string;
  salonName?: string;
  serviceName?: string;
  staffName?: string;
  tokenNumber?: number;
  /** People ahead at the moment the notification was raised. */
  positionAhead?: number;
  etaMinutes?: number;
  delayMinutes?: number;
  reason?: string;
  scheduledAt?: string;
  [key: string]: unknown;
}

/**
 * Notification wording, composed server-side so every client — and a future email or SMS
 * provider — words the same event identically, and so copy changes do not require an app
 * release.
 *
 * Deliberately cautious about time: estimates are always phrased as approximate ("about
 * 10 minutes"), because Part 10 requires estimates be presented as estimates and a queue
 * is not a train timetable.
 */
export function composeNotification(
  type: NotificationType,
  payload: NotificationPayload,
): { title: string; body: string } {
  const salon = payload.salonName ?? 'the salon';
  const token = payload.tokenNumber != null ? `#${payload.tokenNumber}` : 'your token';
  const service = payload.serviceName;

  switch (type) {
    case 'QUEUE_JOINED':
      return {
        title: `You are in the queue at ${salon}`,
        body: joinedBody(token, payload),
      };

    case 'QUEUE_POSITION_CHANGED':
      return {
        title: `Queue update — ${salon}`,
        // positionAhead can be absent (a completed or cancelled entry has no position),
        // so it is never interpolated unchecked.
        body: positionChangedBody(token, payload),
      };

    case 'QUEUE_TURN_APPROACHING':
      return {
        title: 'Almost your turn',
        body: `${salon} will be ready for ${token} shortly${etaSuffix(payload)}. Please start heading over.`,
      };

    case 'QUEUE_TURN_ARRIVED':
      return {
        title: 'It is your turn',
        body: `${salon} is ready for ${token} now.`,
      };

    case 'QUEUE_SERVICE_STARTED':
      return {
        title: 'Service started',
        body: payload.staffName
          ? `${payload.staffName} has started your ${service ?? 'service'}.`
          : `Your ${service ?? 'service'} has started.`,
      };

    case 'QUEUE_SERVICE_COMPLETED':
      return {
        title: 'All done',
        body: `Your ${service ?? 'service'} at ${salon} is complete. Thanks for using Solitan.`,
      };

    case 'QUEUE_ENTRY_CANCELLED':
      return {
        title: 'Queue entry cancelled',
        body: `${token} at ${salon} has been cancelled.`,
      };

    case 'QUEUE_NO_SHOW':
      return {
        title: 'Marked as not arrived',
        body: `${token} at ${salon} was marked as a no-show. Contact the salon if this is wrong.`,
      };

    case 'QUEUE_DELAYED':
      return {
        title: `${salon} is running late`,
        body: delayedBody(payload),
      };

    case 'QUEUE_PAUSED':
      return {
        title: `${salon} has paused its queue`,
        body: 'You keep your place. They will resume shortly.',
      };

    case 'QUEUE_CLOSED':
      return {
        title: `${salon} has closed its queue`,
        body: 'No new customers are being accepted. Contact the salon if you were still waiting.',
      };

    // Appointment events, pre-existing.
    case 'APPOINTMENT_BOOKED':
      return { title: 'Appointment booked', body: appointmentBody(salon, payload) };
    case 'APPOINTMENT_CONFIRMED':
      return { title: 'Appointment confirmed', body: appointmentBody(salon, payload) };
    case 'APPOINTMENT_REMINDER':
      return { title: 'Appointment reminder', body: appointmentBody(salon, payload) };
    case 'ARRIVAL_WINDOW_OPEN':
      return {
        title: 'Time to head over',
        body: `${salon} is ready for you to arrive.`,
      };
    case 'CUSTOMER_ON_WAY':
      return { title: 'Customer on the way', body: 'A customer has said they are heading over.' };
    case 'APPOINTMENT_CANCELLED':
      return { title: 'Appointment cancelled', body: `Your appointment at ${salon} was cancelled.` };
    case 'APPOINTMENT_CHECKED_IN':
      return { title: 'Checked in', body: `You are checked in at ${salon}.` };
    case 'APPOINTMENT_NO_SHOW':
      return {
        title: 'Marked as not arrived',
        body: `Your appointment at ${salon} was marked as a no-show.`,
      };
    case 'APPOINTMENT_COMPLETED':
      return { title: 'All done', body: `Your appointment at ${salon} is complete.` };
    case 'SCHEDULE_CHANGED':
      return {
        title: `${salon} changed its schedule`,
        body: payload.reason ? String(payload.reason) : 'Check the app for the new time.',
      };

    default: {
      // Exhaustiveness: a new NotificationType added to the contract without copy here
      // becomes a compile error rather than shipping as a blank notification.
      const exhaustive: never = type;
      return { title: 'Update', body: String(exhaustive) };
    }
  }
}

function positionChangedBody(token: string, payload: NotificationPayload): string {
  if (payload.positionAhead == null) {
    return `Your place in the queue at ${payload.salonName ?? 'the salon'} has changed${etaSuffix(payload)}.`;
  }
  if (payload.positionAhead === 0) return `${token} is next.`;
  const people = payload.positionAhead === 1 ? 'person' : 'people';
  return `${payload.positionAhead} ${people} ahead of ${token}${etaSuffix(payload)}.`;
}

function joinedBody(token: string, payload: NotificationPayload): string {
  const parts = [`You have ${token}.`];
  if (payload.positionAhead != null) {
    parts.push(
      payload.positionAhead === 0
        ? 'You are next.'
        : `${payload.positionAhead} ${payload.positionAhead === 1 ? 'person' : 'people'} ahead of you.`,
    );
  }
  if (payload.etaMinutes != null) parts.push(`Estimated wait about ${payload.etaMinutes} minutes.`);
  return parts.join(' ');
}

function delayedBody(payload: NotificationPayload): string {
  const minutes = payload.delayMinutes != null ? Math.abs(payload.delayMinutes) : null;
  const direction = (payload.delayMinutes ?? 0) < 0 ? 'reduced' : 'increased';
  const base =
    minutes != null
      ? `Your estimated wait has ${direction} by about ${minutes} minutes.`
      : 'Your estimated wait has changed.';
  return payload.reason ? `${base} ${payload.reason}` : base;
}

function appointmentBody(salon: string, payload: NotificationPayload): string {
  if (!payload.scheduledAt) return `Your appointment at ${salon}.`;
  return `Your appointment at ${salon} is set for ${payload.scheduledAt}.`;
}

/** " — about 10 minutes" when an estimate is known, otherwise nothing. */
function etaSuffix(payload: NotificationPayload): string {
  return payload.etaMinutes != null ? ` — about ${payload.etaMinutes} minutes` : '';
}
