import { Injectable } from '@nestjs/common';
import type { AnalyticsEventName } from '@soliton/api-contract';
import { logger } from '../../common/logging/logger';

/**
 * Analytics event seam. Today it only emits a structured log line; a real sink
 * (warehouse, product analytics) can replace `track` without touching call sites.
 * Properties must be non-personal — never pass names, phone numbers, tokens or raw
 * search text.
 */
@Injectable()
export class AnalyticsService {
  track(
    event: AnalyticsEventName,
    properties: Record<string, string | number | boolean | null> = {},
  ): void {
    logger.info({ analytics: event, ...properties }, 'analytics_event');
  }
}
