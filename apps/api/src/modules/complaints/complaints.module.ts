import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ComplaintsService } from './complaints.service';
import { ComplaintsController, MyComplaintsController } from './complaints.controller';

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  providers: [ComplaintsService],
  controllers: [ComplaintsController, MyComplaintsController],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
