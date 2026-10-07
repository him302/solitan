import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  createReviewSchema,
  listSalonReviewsSchema,
  updateReviewSchema,
  type CreateReviewInput,
  type ListSalonReviewsQuery,
  type UpdateReviewInput,
} from '@soliton/api-contract';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodPipe, ZodQueryPipe } from '../../common/validation/zod.pipe';
import { ReviewsService } from './reviews.service';

/** POST /reviews, GET /me/reviews */
@Controller({ path: 'reviews', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  /** POST /reviews — submit a review for a completed appointment. */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(createReviewSchema)) body: CreateReviewInput,
  ) {
    return this.reviews.create(user.id, body);
  }

  /** PATCH /reviews/:id — edit within 24h window. */
  @Patch(':id')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(updateReviewSchema)) body: UpdateReviewInput,
  ) {
    return this.reviews.update(user.id, id, body);
  }

  /** GET /reviews/:id */
  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.getOne(id);
  }
}

/** GET /me/reviews */
@Controller({ path: 'me/reviews', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class MyReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviews.listMine(user.id, cursor, limit ? parseInt(limit, 10) : 20);
  }

  /** GET /me/reviews/appointment/:appointmentId — check if already reviewed. */
  @Get('appointment/:appointmentId')
  forAppointment(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reviews.getForAppointment(user.id, appointmentId);
  }
}

/** GET /salons/:salonId/reviews, GET /salons/:salonId/rating */
@Controller({ path: 'salons', version: '1' })
@UseGuards(ThrottlerGuard)
export class SalonReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(':salonId/reviews')
  list(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Query(new ZodQueryPipe(listSalonReviewsSchema)) query: ListSalonReviewsQuery,
  ) {
    return this.reviews.listForSalon(salonId, query.cursor, query.limit);
  }

  @Get(':salonId/rating')
  rating(@Param('salonId', ParseUUIDPipe) salonId: string) {
    return this.reviews.getRatingSummary(salonId);
  }
}

/** GET /salon/reviews — salon owner/staff sees own reviews */
@Controller({ path: 'salon/reviews', version: '1' })
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class SalonOwnerReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodQueryPipe(listSalonReviewsSchema)) query: ListSalonReviewsQuery,
  ) {
    return this.reviews.listForSalonOwner(
      (user as any).salonId ?? '',
      query.cursor,
      query.limit,
      query.status,
    );
  }
}
