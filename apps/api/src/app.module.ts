import { Module } from '@nestjs/common';
import { ConfigModule } from './modules/config/config.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/realtime/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SalonsModule } from './modules/salons/salons.module';
import { ServicesModule } from './modules/services/services.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { MapsModule } from './modules/maps/maps.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { QueueModule } from './modules/queue/queue.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    AnalyticsModule,
    ProvidersModule,
    HealthModule,
    AuthModule,
    RealtimeModule,
    SalonsModule,
    ServicesModule,
    DiscoveryModule,
    MapsModule,
    QueueModule,
    NotificationsModule,
    AppointmentsModule,
    ReviewsModule,
    ComplaintsModule,
    PaymentsModule,
    AdminModule,
  ],
})
export class AppModule {}
