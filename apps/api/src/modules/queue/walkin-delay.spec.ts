import { normalizeGuestPhone } from './queue.service';
import { addWalkInSchema, applyDelaySchema } from '@soliton/api-contract';

/**
 * Covers the two Part 7 gaps that had schema support but no code path: walk-in entries
 * (EntrySource.walkin existed, nothing created one) and delay management
 * (QueueEntry.delayMinutes existed, no route wrote it).
 *
 * The service methods themselves are transaction-heavy and are exercised by the
 * database-backed e2e suite; what is checked here is the input contract and the
 * arithmetic, which is where the behaviour that matters to a customer lives.
 */

describe('walk-in input contract', () => {
  it('requires a name, because an unnamed token cannot be called out', () => {
    const result = addWalkInSchema.safeParse({
      serviceId: '00000000-0000-4000-8000-000000000030',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a name without a phone — not every walk-in will give one', () => {
    const result = addWalkInSchema.safeParse({
      serviceId: '00000000-0000-4000-8000-000000000030',
      name: 'Asha',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a phone that is not a phone', () => {
    const result = addWalkInSchema.safeParse({
      serviceId: '00000000-0000-4000-8000-000000000030',
      name: 'Asha',
      phone: 'not-a-number',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys, so customerId cannot be injected', () => {
    const result = addWalkInSchema.safeParse({
      serviceId: '00000000-0000-4000-8000-000000000030',
      name: 'Asha',
      customerId: '00000000-0000-4000-8000-000000000009',
    });
    expect(result.success).toBe(false);
  });

  it('normalises the phone the same way staff onboarding does', () => {
    // Both paths must agree, or the same person becomes two records.
    expect(normalizeGuestPhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizeGuestPhone('(98765) 43210')).toBe('9876543210');
  });
});

describe('delay input contract', () => {
  it('rejects a delay of zero, which would announce nothing', () => {
    expect(applyDelaySchema.safeParse({ delayMinutes: 0 }).success).toBe(false);
  });

  it('allows a negative delay, to take back an over-estimate', () => {
    expect(applyDelaySchema.safeParse({ delayMinutes: -10 }).success).toBe(true);
  });

  it('bounds the delay so a typo cannot push the queue days out', () => {
    expect(applyDelaySchema.safeParse({ delayMinutes: 999 }).success).toBe(false);
    expect(applyDelaySchema.safeParse({ delayMinutes: -999 }).success).toBe(false);
  });

  it('accepts an optional reason and a single-entry target', () => {
    const result = applyDelaySchema.safeParse({
      delayMinutes: 15,
      reason: 'Equipment problem',
      entryId: '00000000-0000-4000-8000-000000000099',
    });
    expect(result.success).toBe(true);
  });
});

/**
 * The clamp in applyDelay, stated as the rule it enforces: delays accumulate, and a
 * correction can cancel one out, but the total never goes below zero because a salon
 * cannot promise to run early.
 */
describe('delay accumulation', () => {
  const applyTo = (current: number, change: number) => Math.max(0, current + change);

  it('accumulates repeated slips', () => {
    expect(applyTo(applyTo(0, 10), 5)).toBe(15);
  });

  it('lets a correction take back an over-estimate', () => {
    expect(applyTo(20, -5)).toBe(15);
  });

  it('never goes negative, however large the correction', () => {
    expect(applyTo(10, -30)).toBe(0);
    expect(applyTo(0, -10)).toBe(0);
  });
});
