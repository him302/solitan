import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/** Global Redis module so the gateway adapter and health both see connection status. */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
