import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────

export const COMPLAINT_CATEGORIES = [
  'service',
  'wait_time',
  'booking',
  'staff_behaviour',
  'payment',
  'other',
] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export const COMPLAINT_STATUSES = ['open', 'in_review', 'resolved', 'dismissed'] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface ComplaintDto {
  id: string;
  reporterId: string;
  salonId: string | null;
  salonName: string | null;
  appointmentId: string | null;
  entryId: string | null;
  reviewId: string | null;
  category: ComplaintCategory;
  status: ComplaintStatus;
  body: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Schemas ────────────────────────────────────────────────────────────────

export const createComplaintSchema = z.object({
  salonId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  entryId: z.string().uuid().optional(),
  reviewId: z.string().uuid().optional(),
  category: z.enum(COMPLAINT_CATEGORIES),
  body: z.string().min(10).max(1000),
});
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const adminUpdateComplaintSchema = z.object({
  status: z.enum(COMPLAINT_STATUSES),
  adminNote: z.string().max(500).optional(),
});
export type AdminUpdateComplaintInput = z.infer<typeof adminUpdateComplaintSchema>;

export const listComplaintsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(COMPLAINT_STATUSES).optional(),
});
export type ListComplaintsQuery = z.infer<typeof listComplaintsSchema>;
