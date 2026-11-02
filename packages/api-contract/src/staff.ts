/**
 * Salon staff contracts (Part 8). Zod schemas are the single source of truth for request
 * validation on both the API and the clients. All write schemas are `.strict()`, so
 * unknown keys (salonId, userId, …) are rejected rather than silently ignored.
 */
import { z } from 'zod';

export type SalonRole = 'owner' | 'staff';

export const StaffErrorCode = {
  STAFF_NOT_FOUND: 'STAFF_NOT_FOUND',
  STAFF_ALREADY_MEMBER: 'STAFF_ALREADY_MEMBER',
  STAFF_INVALID: 'STAFF_INVALID',
  /** An owner cannot strip or deactivate their own owner membership. */
  STAFF_LAST_OWNER: 'STAFF_LAST_OWNER',
  /** A capability referenced a service belonging to a different salon. */
  STAFF_SERVICE_MISMATCH: 'STAFF_SERVICE_MISMATCH',
} as const;

/**
 * Staff are added by phone number, which is also how they sign in (OTP). Deliberately
 * not by email: the zero-cost policy rules out an email service, so an invite nobody can
 * deliver would be a dead end.
 */
export const staffPhoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .regex(/^\+?[0-9 ()-]+$/, 'Enter a valid phone number');

export const addStaffSchema = z
  .object({
    phone: staffPhoneSchema,
    /** Used only when this phone has no account yet; existing users keep their name. */
    name: z.string().trim().min(1).max(80).optional(),
    role: z.enum(['owner', 'staff']).default('staff'),
    /** Service ids this member can perform. Empty means "not yet configured". */
    serviceIds: z.array(z.string().uuid()).max(100).optional(),
  })
  .strict();
export type AddStaffInput = z.infer<typeof addStaffSchema>;

export const updateStaffSchema = z
  .object({
    role: z.enum(['owner', 'staff']).optional(),
    /** Employment status. false deactivates without destroying served history. */
    active: z.boolean().optional(),
    /** Currently working and able to take customers. */
    onShift: z.boolean().optional(),
    name: z.string().trim().min(1).max(80).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

/** Replaces a member's capability set wholesale, so removals need no separate call. */
export const setStaffServicesSchema = z
  .object({ serviceIds: z.array(z.string().uuid()).max(100) })
  .strict();
export type SetStaffServicesInput = z.infer<typeof setStaffServicesSchema>;

/** A staff member setting their own availability. */
export const setOwnShiftSchema = z.object({ onShift: z.boolean() }).strict();
export type SetOwnShiftInput = z.infer<typeof setOwnShiftSchema>;

/** Public shape: just enough to show "who will serve me", never contact details. */
export interface PublicStaffDto {
  id: string;
  name: string;
}

/** A service this member is able to perform. */
export interface StaffCapabilityDto {
  serviceId: string;
  name: string;
  estimatedMinutes: number;
}

/** Owner-facing staff record. Includes workload, which is why it is not public. */
export interface StaffMemberDto {
  id: string;
  salonId: string;
  userId: string;
  name: string;
  /** Masked to the last few digits — owners can identify a member without re-sharing PII. */
  phoneMasked: string | null;
  role: SalonRole;
  active: boolean;
  onShift: boolean;
  capabilities: StaffCapabilityDto[];
  /** Live workload, so an owner can see who is free before assigning. */
  workload: StaffWorkloadDto;
  createdAt: string;
}

export interface StaffWorkloadDto {
  /** Entry currently being served by this member, if any. */
  servingEntryId: string | null;
  servingTokenNumber: number | null;
  /** Entries completed by this member today (salon timezone). */
  completedToday: number;
  /** Waiting entries that asked for this member specifically. */
  preferredWaiting: number;
}

export interface StaffListDto {
  items: StaffMemberDto[];
  /** Active members who are on shift right now — the ETA engine's capacity input. */
  onShiftCount: number;
}
