import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MockPaymentProvider } from './mock-payment.provider';
import { PaymentsService } from './payments.service';
import { PaymentsController, MyPaymentsController } from './payments.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [MockPaymentProvider, PaymentsService],
  controllers: [PaymentsController, MyPaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
