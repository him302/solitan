import { Injectable } from '@nestjs/common';
import type {
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  PaymentVerifyResult,
} from './payment-provider.interface';

/**
 * DEVELOPMENT ONLY — Mock payment provider.
 * No real money moves. All transactions are simulated in-memory.
 * Never use in production.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  /** Simulated store: providerRef → 'pending' | 'paid' | 'refunded' */
  private readonly store = new Map<string, 'pending' | 'paid' | 'refunded'>();

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const providerRef = `mock_${input.reference}_${Date.now()}`;
    this.store.set(providerRef, 'pending');
    return { providerRef, clientSecret: null };
  }

  async verifyPayment(providerRef: string): Promise<PaymentVerifyResult> {
    const status = this.store.get(providerRef) ?? 'pending';
    return { paid: status === 'paid', providerRef };
  }

  async capturePayment(providerRef: string): Promise<void> {
    this.store.set(providerRef, 'paid');
  }

  async refundPayment(providerRef: string, _amountCents: number): Promise<void> {
    this.store.set(providerRef, 'refunded');
  }

  /** Dev-only: force a payment to succeed. */
  simulateSuccess(providerRef: string): void {
    this.store.set(providerRef, 'paid');
  }

  /** Dev-only: force a payment to fail (just keep it pending / not found). */
  simulateFailure(providerRef: string): void {
    this.store.delete(providerRef);
  }
}
