import { Module } from '@nestjs/common';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { AuthModule } from '../auth/auth.module';
import { MeController, SalonsController } from './salons.controller';
import { SalonAccessService } from './salon-access.service';
import { SalonsService } from './salons.service';

@Module({
  imports: [AuthModule, RateLimitModule],
  controllers: [SalonsController, MeController],
  providers: [SalonsService, SalonAccessService],
  exports: [SalonAccessService],
})
export class SalonsModule {}
