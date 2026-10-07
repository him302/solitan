import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────

export const PAYMENT_STATUSES = ['none', 'pending', 'paid', 'failed', 'refunded', 'cancelled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface PaymentDto {
  id: string;
  customerId: string;
  salonId: string | null;
  salonName: string | null;
  appointmentId: string | null;
  entryId: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerRef: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Schemas ────────────────────────────────────────────────────────────────

export const createMockPaymentSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  entryId: z.string().uuid().optional(),
  salonId: z.string().uuid().optional(),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).default('INR'),
});
export type CreateMockPaymentInput = z.infer<typeof createMockPaymentSchema>;

export const mockPaymentActionSchema = z.object({ paymentId: z.string().uuid() });
export type MockPaymentActionInput = z.infer<typeof mockPaymentActionSchema>;

export const listPaymentsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['none', 'pending', 'paid', 'failed', 'refunded', 'cancelled']).optional(),
});
export type ListPaymentsQuery = z.infer<typeof listPaymentsSchema>;
