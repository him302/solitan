/**
 * Provider seams for services Soliton deliberately does NOT use yet. Each has an interface
 * and a Disabled implementation that fails safe: it reports PROVIDER_DISABLED and performs
 * no I/O of any kind. A real provider (a payment gateway, an SMS/WhatsApp/email service)
 * can be added later by implementing the interface — without touching callers — but only
 * as an explicit, approved decision.
 */

export type ProviderResult<T> =
  | { readonly available: true; readonly value: T }
  | { readonly available: false; readonly reason: 'PROVIDER_DISABLED' };

export interface PaymentProvider {
  readonly name: string;
  readonly enabled: boolean;
  createPaymentIntent(input: {
    amountCents: number;
    currency: 'INR';
    referenceId: string;
  }): Promise<ProviderResult<{ id: string }>>;
}

export interface MessagingProvider {
  readonly name: string;
  readonly enabled: boolean;
  send(message: {
    channel: 'sms' | 'whatsapp' | 'email' | 'push';
    to: string;
    template: string;
    params?: Record<string, string>;
  }): Promise<ProviderResult<{ id: string }>>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
export const MESSAGING_PROVIDER = Symbol('MESSAGING_PROVIDER');

export class DisabledPaymentProvider implements PaymentProvider {
  readonly name = 'disabled';
  readonly enabled = false;

  async createPaymentIntent(): Promise<ProviderResult<{ id: string }>> {
    return { available: false, reason: 'PROVIDER_DISABLED' };
  }
}

export class DisabledMessagingProvider implements MessagingProvider {
  readonly name = 'disabled';
  readonly enabled = false;

  async send(): Promise<ProviderResult<{ id: string }>> {
    return { available: false, reason: 'PROVIDER_DISABLED' };
  }
}
