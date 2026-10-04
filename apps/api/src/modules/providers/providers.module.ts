import { Global, Module } from '@nestjs/common';
import {
  DisabledMessagingProvider,
  DisabledPaymentProvider,
  MESSAGING_PROVIDER,
  PAYMENT_PROVIDER,
} from './disabled-providers';
import { ProviderPolicyService } from './provider-policy.service';

/**
 * FREE-FIRST provider wiring. Payments and messaging are bound to their Disabled
 * implementations; the env schema offers no other value, so they cannot be switched on by
 * configuration alone.
 */
@Global()
@Module({
  providers: [
    ProviderPolicyService,
    { provide: PAYMENT_PROVIDER, useClass: DisabledPaymentProvider },
    { provide: MESSAGING_PROVIDER, useClass: DisabledMessagingProvider },
  ],
  exports: [ProviderPolicyService, PAYMENT_PROVIDER, MESSAGING_PROVIDER],
})
export class ProvidersModule {}
