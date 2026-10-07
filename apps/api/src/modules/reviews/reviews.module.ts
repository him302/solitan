import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsService } from './reviews.service';
import {
  MyReviewsController,
  ReviewsController,
  SalonOwnerReviewsController,
  SalonReviewsController,
} from './reviews.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [ReviewsService],
  controllers: [ReviewsController, MyReviewsController, SalonReviewsController, SalonOwnerReviewsController],
  exports: [ReviewsService],
})
export class ReviewsModule {}
