import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AppointmentsService } from './appointments.service';
import {
  AppointmentsController,
  MyAppointmentsController,
  SalonAppointmentsController,
} from './appointments.controller';

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  providers: [AppointmentsService],
  controllers: [AppointmentsController, MyAppointmentsController, SalonAppointmentsController],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
