import { Injectable } from '@nestjs/common';
import type {
  NotificationDto,
  NotificationListDto,
  NotificationListQuery,
  NotificationType,
} from '@soliton/api-contract';
import { PrismaService } from '../prisma/prisma.service';
import { logger } from '../../common/logging/logger';
import { composeNotification, type NotificationPayload } from './notification-copy';

export type { NotificationPayload } from './notification-copy';

/**
 * In-app notifications (Part 11).
 *
 * Only the `in_app` channel is delivered here: a persisted row the app shows in its own
 * inbox. Local device notifications are raised by the app from realtime events, because
 * the server cannot verify that a device was reachable or that permission was granted —
 * and Part 11 forbids claiming a delivery that did not happen. External channels (SMS,
 * WhatsApp, email, third-party push) are disabled under the zero-cost policy.
 *
 * Previously this service typed only APPOINTMENT_* events and had no controller at all,
 * so no queue moment produced a notification and nothing could read one.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists an in-app notification. Fire-and-forget: a failure here must never roll
   * back the queue transition that triggered it — a customer being served matters more
   * than the record that they were told.
   */
  async send(
    userId: string | null | undefined,
    type: NotificationType,
    payload: NotificationPayload = {},
  ): Promise<void> {
    // Walk-ins have no account, so there is nobody to notify. Not an error.
    if (!userId) return;

    try {
      await this.prisma.notification.create({
        data: { userId, type, payload: payload as object, sentAt: new Date() },
      });
      logger.debug({ event: 'notification_sent', userId, type }, 'notification_sent');
    } catch (err) {
      logger.warn(
        { event: 'notification_failed', userId, type, err },
        'notification send failed (non-fatal)',
      );
    }
  }

  /** Sends the same notification to several users, used for queue-wide events. */
  async sendMany(
    userIds: Array<string | null | undefined>,
    type: NotificationType,
    payload: NotificationPayload = {},
  ): Promise<void> {
    const recipients = userIds.filter((id): id is string => Boolean(id));
    if (recipients.length === 0) return;

    try {
      await this.prisma.notification.createMany({
        data: recipients.map((userId) => ({
          userId,
          type,
          payload: payload as object,
          sentAt: new Date(),
        })),
      });
      logger.debug(
        { event: 'notification_broadcast', type, count: recipients.length },
        'notification_broadcast',
      );
    } catch (err) {
      logger.warn({ event: 'notification_failed', type, err }, 'notification broadcast failed');
    }
  }

  /** The signed-in user's notifications, newest first. */
  async list(userId: string, query: NotificationListQuery): Promise<NotificationListDto> {
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, ...(query.unreadOnly ? { readAt: null } : {}) },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { items: rows.map((row) => this.toDto(row)), unreadCount };
  }

  /**
   * Marks notifications read. With no ids, marks everything read.
   *
   * Scoped by userId in the where clause, so passing someone else's notification id
   * silently affects nothing rather than marking their mail read.
   */
  async markRead(userId: string, ids?: string[]): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null, ...(ids && ids.length > 0 ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  private toDto(row: {
    id: string;
    type: string;
    payload: unknown;
    createdAt: Date;
    readAt: Date | null;
  }): NotificationDto {
    const type = row.type as NotificationType;
    const payload = (row.payload ?? {}) as NotificationPayload;
    const { title, body } = composeNotification(type, payload);

    return {
      id: row.id,
      type,
      title,
      body,
      // The server delivers in-app only; see the class comment.
      channel: 'in_app',
      data: payload as Record<string, unknown>,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
    };
  }
}
