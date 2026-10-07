import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { AdminReportingController, SalonReportingController } from './reporting.controller';
import { SalonsModule } from '../salons/salons.module';

@Module({
  imports: [SalonsModule],
  providers: [ReportingService],
  controllers: [AdminReportingController, SalonReportingController],
  exports: [ReportingService],
})
export class ReportingModule {}
