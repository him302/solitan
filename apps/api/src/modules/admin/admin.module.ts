import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { ComplaintsModule } from '../complaints/complaints.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, ReviewsModule, ComplaintsModule, PaymentsModule],
  controllers: [AdminController],
})
export class AdminModule {}
