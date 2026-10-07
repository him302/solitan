import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AppointmentsService } from './appointments.service';
import {
  AppointmentsController,
  MyAppointmentsController,
  SalonAppointmentsController,
} from './appointments.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [AppointmentsService],
  controllers: [AppointmentsController, MyAppointmentsController, SalonAppointmentsController],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
