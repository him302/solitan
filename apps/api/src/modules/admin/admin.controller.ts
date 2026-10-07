import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  adminModerateReviewSchema,
  adminUpdateComplaintSchema,
  type AdminModerateReviewInput,
  type AdminUpdateComplaintInput,
  type ReviewStatus,
  type ComplaintStatus,
} from '@soliton/api-contract';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodPipe, ZodQueryPipe } from '../../common/validation/zod.pipe';
import { ReviewsService } from '../reviews/reviews.service';
import { ComplaintsService } from '../complaints/complaints.service';
import { PaymentsService } from '../payments/payments.service';
import { z } from 'zod';

function requireAdmin(user: RequestUser) {
  if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
}

const adminListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.string().optional(),
});

@Controller({ path: 'admin', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly complaints: ComplaintsService,
    private readonly payments: PaymentsService,
  ) {}

  // ── Reviews ───────────────────────────────────────────────────────────────

  @Get('reviews')
  listReviews(
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(adminListQuerySchema)) query: { cursor?: string; limit: number; status?: string },
  ) {
    requireAdmin(user);
    return this.reviews.adminList(query.cursor, query.limit, query.status as ReviewStatus | undefined);
  }

  @Patch('reviews/:id/moderation')
  moderateReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(adminModerateReviewSchema)) body: AdminModerateReviewInput,
  ) {
    requireAdmin(user);
    return this.reviews.adminModerate(id, body);
  }

  // ── Complaints ────────────────────────────────────────────────────────────

  @Get('complaints')
  listComplaints(
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(adminListQuerySchema)) query: { cursor?: string; limit: number; status?: string },
  ) {
    requireAdmin(user);
    return this.complaints.adminList(query.cursor, query.limit, query.status as ComplaintStatus | undefined);
  }

  @Patch('complaints/:id')
  updateComplaint(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(adminUpdateComplaintSchema)) body: AdminUpdateComplaintInput,
  ) {
    requireAdmin(user);
    return this.complaints.adminUpdate(id, body);
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  @Get('payments')
  listPayments(
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(adminListQuerySchema)) query: { cursor?: string; limit: number; status?: string },
  ) {
    requireAdmin(user);
    return this.payments.adminList(query.cursor, query.limit, query.status);
  }
}
