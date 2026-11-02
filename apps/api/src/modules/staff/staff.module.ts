import { Module } from '@nestjs/common';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { AuthModule } from '../auth/auth.module';
import { SalonsModule } from '../salons/salons.module';
import { MyShiftController, StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [AuthModule, SalonsModule, RateLimitModule],
  controllers: [StaffController, MyShiftController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
