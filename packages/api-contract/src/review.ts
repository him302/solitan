import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────

export const REVIEW_STATUSES = ['published', 'hidden', 'under_review', 'removed'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface ReviewDto {
  id: string;
  salonId: string;
  salonName: string;
  customerId: string;
  customerName: string | null;
  appointmentId: string | null;
  entryId: string | null;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface SalonRatingSummary {
  average: number;
  count: number;
  distribution: RatingDistribution;
}

// ── Schemas ────────────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const listSalonReviewsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(REVIEW_STATUSES).optional(),
});
export type ListSalonReviewsQuery = z.infer<typeof listSalonReviewsSchema>;

export const adminModerateReviewSchema = z.object({
  status: z.enum(['published', 'hidden', 'under_review', 'removed']),
  adminNote: z.string().max(500).optional(),
});
export type AdminModerateReviewInput = z.infer<typeof adminModerateReviewSchema>;

// ── Realtime ───────────────────────────────────────────────────────────────

export type ReviewEventType =
  | 'review:created'
  | 'review:updated'
  | 'review:moderated';
