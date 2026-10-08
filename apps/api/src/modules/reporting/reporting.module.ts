import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReportingService } from './reporting.service';
import { AdminReportingController, SalonReportingController } from './reporting.controller';
import { SalonsModule } from '../salons/salons.module';

@Module({
  imports: [AuthModule, SalonsModule],
  providers: [ReportingService],
  controllers: [AdminReportingController, SalonReportingController],
  exports: [ReportingService],
})
export class ReportingModule {}
