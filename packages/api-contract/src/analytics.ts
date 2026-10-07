import { z } from 'zod';

// ── Date range ─────────────────────────────────────────────────────────────

export const analyticsDatePresets = ['today', 'yesterday', '7d', '30d'] as const;
export type AnalyticsDatePreset = (typeof analyticsDatePresets)[number];

export const analyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  preset: z.enum(analyticsDatePresets).optional(),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export interface AnalyticsPeriod {
  from: string;
  to: string;
}

// ── Platform overview (admin) ──────────────────────────────────────────────

export interface PlatformOverviewDto {
  period: AnalyticsPeriod;
  salons: { total: number; active: number; pending: number; suspended: number };
  customers: number;
  queueEntries: number;
  queueCompleted: number;
  appointments: number;
  appointmentsCompleted: number;
  reviews: number;
  averageRating: number | null;
  complaints: number;
  generatedAt: string;
}

// ── Queue analytics ────────────────────────────────────────────────────────

export interface QueueAnalyticsDto {
  period: AnalyticsPeriod;
  totalEntries: number;
  completed: number;
  cancelled: number;
  noShows: number;
  /** Fraction: (cancelled + noShows) / total. null when total = 0. */
  abandonmentRate: number | null;
  /** Average minutes from queue join to service start. null = no completed entries with timestamps. */
  avgWaitMinutes: number | null;
  maxWaitMinutes: number | null;
  generatedAt: string;
}

// ── Appointment analytics ──────────────────────────────────────────────────

export interface AppointmentAnalyticsDto {
  period: AnalyticsPeriod;
  total: number;
  completed: number;
  cancelled: number;
  noShows: number;
  /** completed / total. null when total = 0. */
  completionRate: number | null;
  cancellationRate: number | null;
  noShowRate: number | null;
  generatedAt: string;
}

// ── Service analytics ──────────────────────────────────────────────────────

export interface ServiceAnalyticsItem {
  serviceId: string;
  serviceName: string;
  queueEntries: number;
  appointments: number;
  completed: number;
}

export interface ServiceAnalyticsDto {
  period: AnalyticsPeriod;
  items: ServiceAnalyticsItem[];
  generatedAt: string;
}

// ── Customer analytics ─────────────────────────────────────────────────────

export interface CustomerAnalyticsDto {
  period: AnalyticsPeriod;
  totalServed: number;
  newCustomers: number;
  returningCustomers: number;
  /** returningCustomers / totalServed. null when totalServed = 0. */
  repeatVisitRate: number | null;
  generatedAt: string;
}

// ── Peak hours ─────────────────────────────────────────────────────────────

export interface PeakHourItem {
  weekday: number; // 0 = Sunday, 6 = Saturday
  hour: number;    // 0–23 local time
  count: number;
}

export interface PeakHoursDto {
  period: AnalyticsPeriod;
  items: PeakHourItem[];
  timezone: string;
  generatedAt: string;
}

// ── Salon overview (owner mobile dashboard) ────────────────────────────────

export interface SalonOverviewDto {
  salonId: string;
  period: AnalyticsPeriod;
  currentQueueSize: number;
  todayQueueEntries: number;
  todayCompleted: number;
  todayAppointments: number;
  avgWaitMinutes: number | null;
  averageRating: number | null;
  reviewCount: number;
  generatedAt: string;
}

// ── Salon health score ─────────────────────────────────────────────────────

export type HealthLabel = 'excellent' | 'good' | 'fair' | 'needs_attention' | 'insufficient_data';

export interface HealthComponent {
  score: number;         // 0–20
  label: string;         // human label
  value: number | null;  // raw metric (rate as 0–1 or rating as 0–5)
  detail: string;        // e.g. "92% completion rate"
}

export interface SalonHealthScoreDto {
  salonId: string;
  score: number | null;
  label: HealthLabel;
  components: {
    queueCompletion: HealthComponent;
    appointmentCompletion: HealthComponent;
    noShowRate: HealthComponent;
    averageRating: HealthComponent;
    complaintRate: HealthComponent;
  };
  generatedAt: string;
}

// ── Admin salon list ───────────────────────────────────────────────────────

export interface AdminSalonRow {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  status: string;
  city: string | null;
  queueStatus: string;
  averageRating: number | null;
  reviewCount: number;
  serviceCount: number;
  createdAt: string;
}

export interface AdminSalonListDto {
  items: AdminSalonRow[];
  total: number;
  offset: number;
  limit: number;
}

export const adminSalonListQuerySchema = z.object({
  search: z.string().max(100).optional(),
  status: z.enum(['active', 'pending', 'suspended']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});
export type AdminSalonListQuery = z.infer<typeof adminSalonListQuerySchema>;

export const adminUpdateSalonStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
  reason: z.string().max(500).optional(),
});
export type AdminUpdateSalonStatusInput = z.infer<typeof adminUpdateSalonStatusSchema>;
