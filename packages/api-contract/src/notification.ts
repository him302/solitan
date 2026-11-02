/**
 * Notification contracts (Part 11).
 *
 * Part 11 requires that in-app, local-device and external notifications be clearly
 * distinguished, and that the system never claim a delivery it did not make. That is
 * modelled explicitly here rather than left implicit:
 *
 *  - `in_app`       a row the server persisted. The app shows it in its own inbox. This
 *                   is the only channel the server delivers, and the only one it reports.
 *  - `local_device` an OS notification the app itself schedules on the device, from a
 *                   realtime event or an in-app row. The server never asserts this: it
 *                   cannot know whether the device was reachable or permission granted.
 *  - `external`     SMS, WhatsApp, email, push via a third party. Disabled under the
 *                   zero-cost policy; the enum value exists so the seam is visible rather
 *                   than pretended-away, and so a future provider has somewhere to live.
 */
import { z } from 'zod';

export type NotificationChannel = 'in_app' | 'local_device' | 'external';

/**
 * Queue-domain events (Part 11's list), plus the appointment events that already existed.
 *
 * The previous implementation typed only APPOINTMENT_* events, so none of the queue
 * moments Part 11 names — joining, the queue moving, your turn approaching, your turn
 * arriving, a delay, a pause or a closure — produced a notification at all.
 */
export const NOTIFICATION_TYPES = [
  // Queue (Part 11)
  'QUEUE_JOINED',
  'QUEUE_POSITION_CHANGED',
  'QUEUE_TURN_APPROACHING',
  'QUEUE_TURN_ARRIVED',
  'QUEUE_SERVICE_STARTED',
  'QUEUE_SERVICE_COMPLETED',
  'QUEUE_ENTRY_CANCELLED',
  'QUEUE_NO_SHOW',
  'QUEUE_DELAYED',
  'QUEUE_PAUSED',
  'QUEUE_CLOSED',
  // Appointments (pre-existing)
  'APPOINTMENT_BOOKED',
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_REMINDER',
  'ARRIVAL_WINDOW_OPEN',
  'CUSTOMER_ON_WAY',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_CHECKED_IN',
  'APPOINTMENT_NO_SHOW',
  'APPOINTMENT_COMPLETED',
  'SCHEDULE_CHANGED',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Queue types only — useful where a screen should show queue activity alone. */
export const QUEUE_NOTIFICATION_TYPES = NOTIFICATION_TYPES.filter((type) =>
  type.startsWith('QUEUE_'),
) as readonly NotificationType[];

export interface NotificationDto {
  id: string;
  type: NotificationType;
  /** Ready-to-display text, composed server-side so every client words it identically. */
  title: string;
  body: string;
  /**
   * Always 'in_app' from the server. See the channel documentation above: the server does
   * not claim device delivery it cannot verify.
   */
  channel: NotificationChannel;
  /** Entry, appointment and salon ids for deep-linking. */
  data: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationListDto {
  items: NotificationDto[];
  unreadCount: number;
}

export const notificationListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    /** When true, only unread notifications are returned. */
    unreadOnly: z.coerce.boolean().default(false),
  })
  .strict();
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const markNotificationsReadSchema = z
  .object({
    /** Omit to mark everything read. */
    ids: z.array(z.string().uuid()).max(100).optional(),
  })
  .strict();
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;
