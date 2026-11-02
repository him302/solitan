import { Body, Controller, Get, HttpCode, Patch, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import {
  markNotificationsReadSchema,
  notificationListQuerySchema,
  type MarkNotificationsReadInput,
  type NotificationListDto,
  type NotificationListQuery,
} from '@soliton/api-contract';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodPipe, ZodQueryPipe } from '../../common/validation/zod.pipe';
import { NotificationsService } from './notifications.service';

/**
 * The signed-in user's notification inbox (Part 11).
 *
 * NotificationsService existed with list and mark-read methods and no controller, so
 * nothing could reach them — notifications were written and never read. Every route is
 * scoped to the authenticated user; no id from the client selects whose notifications are
 * returned.
 */
@ApiTags('notifications')
@Controller({ path: 'me/notifications', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(notificationListQuerySchema)) query: NotificationListQuery,
  ): Promise<NotificationListDto> {
    return this.notifications.list(user.id, query);
  }

  /** Marks the given notifications read, or everything when no ids are supplied. */
  @Patch('read')
  @HttpCode(200)
  markRead(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(markNotificationsReadSchema)) body: MarkNotificationsReadInput,
  ): Promise<{ updated: number }> {
    return this.notifications.markRead(user.id, body.ids);
  }
}
