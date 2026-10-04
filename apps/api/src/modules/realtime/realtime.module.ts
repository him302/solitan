import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeGateway } from './realtime.gateway';
import {
  ENTRY_ACCESS,
  PrismaEntryAccess,
  PrismaSalonAccess,
  RoomAuthorizer,
  SALON_ACCESS,
} from './room-authorizer';

/**
 * Realtime infrastructure foundation. No queue/ETA business logic — only the gateway,
 * authenticated handshake, authorized rooms, and a snapshot stub.
 */
@Module({
  imports: [AuthModule],
  providers: [
    RealtimeGateway,
    RoomAuthorizer,
    { provide: SALON_ACCESS, useClass: PrismaSalonAccess },
    { provide: ENTRY_ACCESS, useClass: PrismaEntryAccess },
  ],
})
export class RealtimeModule {}
