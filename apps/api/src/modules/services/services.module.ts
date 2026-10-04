import { Module } from '@nestjs/common';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { AuthModule } from '../auth/auth.module';
import { SalonsModule } from '../salons/salons.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [AuthModule, SalonsModule, RateLimitModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
