import { Module } from '@nestjs/common';
import { LocalMapsProvider, type MapsProvider } from '@soliton/maps';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { AuthModule } from '../auth/auth.module';
import { AppConfigService } from '../config/app-config.service';
import { MapsController } from './maps.controller';
import { MAPS_PROVIDER } from './maps.tokens';

/**
 * Binds the maps interface to the free LocalMapsProvider: no network calls and no API key.
 * MAP_PROVIDER accepts only `local`, so no paid map service can be selected by config.
 */
@Module({
  imports: [AuthModule, RateLimitModule],
  controllers: [MapsController],
  providers: [
    {
      provide: MAPS_PROVIDER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): MapsProvider =>
        new LocalMapsProvider({
          tileUrlTemplate: config.mapTileUrlTemplate,
          tileAttribution: config.mapTileAttribution,
        }),
    },
  ],
  exports: [MAPS_PROVIDER],
})
export class MapsModule {}
