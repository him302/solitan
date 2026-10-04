import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { RealtimeGateway } from './realtime.gateway';
import {
  ENTRY_ACCESS,
  PrismaEntryAccess,
  PrismaSalonAccess,
  RoomAuthorizer,
  SALON_ACCESS,
} from './room-authorizer';

@Module({
  imports: [AuthModule, forwardRef(() => QueueModule)],
  providers: [
    RealtimeGateway,
    RoomAuthorizer,
    { provide: SALON_ACCESS, useClass: PrismaSalonAccess },
    { provide: ENTRY_ACCESS, useClass: PrismaEntryAccess },
  ],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
