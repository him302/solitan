import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { logger } from '../../common/logging/logger';

export type NotificationType =
  | 'APPOINTMENT_BOOKED'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_REMINDER'
  | 'ARRIVAL_WINDOW_OPEN'
  | 'CUSTOMER_ON_WAY'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_CHECKED_IN'
  | 'APPOINTMENT_NO_SHOW'
  | 'APPOINTMENT_COMPLETED'
  | 'SCHEDULE_CHANGED';

export interface NotificationPayload {
  appointmentId?: string;
  salonName?: string;
  serviceName?: string;
  scheduledAt?: string;
  message?: string;
  [key: string]: unknown;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Persists an in-app notification for the given user. Fire-and-forget — errors are logged, not thrown. */
  async send(userId: string, type: NotificationType, payload: NotificationPayload): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type,
          payload: payload as object,
          sentAt: new Date(),
        },
      });
      logger.debug({ userId, type }, 'notification sent');
    } catch (err) {
      logger.warn({ userId, type, err }, 'notification send failed (non-fatal)');
    }
  }

  /** Returns unread in-app notifications for a user, newest first. */
  async listUnread(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Marks a notification as read. */
  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }
}
