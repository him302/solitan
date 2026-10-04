import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { BookingsController, MeBookingsController, QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { EtaService } from './eta.service';

@Module({
  imports: [AuthModule, RateLimitModule],
  controllers: [BookingsController, MeBookingsController, QueueController],
  providers: [QueueService, EtaService],
  exports: [QueueService],
})
export class QueueModule {}
