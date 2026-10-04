import { Injectable } from '@nestjs/common';
import type { ProviderPolicyDto } from '@soliton/api-contract';
import { AppConfigService } from '../config/app-config.service';

/**
 * Answers "which provider is active for each external concern, and can Soliton reach
 * outside this machine?". Every provider is free, local or disabled, so `externalCalls`
 * is always empty. Exposed at GET /health/providers so this is checkable at runtime.
 */
@Injectable()
export class ProviderPolicyService {
  constructor(private readonly config: AppConfigService) {}

  describe(): ProviderPolicyDto {
    return {
      freeLocalMode: this.config.freeLocalMode,
      providers: {
        map: this.config.mapProvider,
        otp: this.config.otpProvider,
        payment: this.config.paymentProvider,
        messaging: this.config.messagingProvider,
        storage: this.config.storageProvider,
        analytics: this.config.analyticsProvider,
      },
      externalCalls: [],
    };
  }
}
