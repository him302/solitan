import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ComplaintsService } from './complaints.service';
import { ComplaintsController, MyComplaintsController } from './complaints.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [ComplaintsService],
  controllers: [ComplaintsController, MyComplaintsController],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
