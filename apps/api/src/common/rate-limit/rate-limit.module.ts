import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * Shared throttling for public/expensive endpoints (discovery, geocoding). Routes tighten
 * or relax the default with @Throttle(). Importing this module from several feature
 * modules yields one shared instance and one shared counter store.
 */
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}
