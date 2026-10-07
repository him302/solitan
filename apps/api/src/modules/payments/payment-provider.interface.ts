/** Provider-neutral payment abstraction. All real gateway SDKs must implement this. */
export interface PaymentIntentInput {
  amountCents: number;
  currency: string;
  customerId: string;
  reference: string;
}

export interface PaymentIntentResult {
  providerRef: string;
  /** Client-side token/key the frontend needs to complete the payment (gateway-specific). */
  clientSecret: string | null;
}

export interface PaymentVerifyResult {
  paid: boolean;
  providerRef: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  verifyPayment(providerRef: string): Promise<PaymentVerifyResult>;
  capturePayment(providerRef: string): Promise<void>;
  refundPayment(providerRef: string, amountCents: number): Promise<void>;
}
