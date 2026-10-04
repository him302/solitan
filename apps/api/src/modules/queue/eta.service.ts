import { Injectable } from '@nestjs/common';

/** Service-duration snapshot for ETA calculation. */
export interface ServiceDuration {
  estimatedMinutes: number;
}

/**
 * Deterministic, capacity-aware ETA engine. No ML, no AI, no paid services.
 *
 * Algorithm:
 *  - For each active chair: remaining_time = service.estimatedMinutes * fraction_remaining
 *    (we don't track start time per chair in Phase 3 so we use full duration as upper bound)
 *  - next_free_slot = min(active_chair_remaining_times)
 *  - For a waiting entry at position P (0-indexed):
 *    eta = next_free_slot + ceil(P / chairs) * avg_service_duration
 */
@Injectable()
export class EtaService {
  /**
   * Calculate ETAs for a list of waiting entries given chair capacity.
   * Returns a map: entryId → etaMinutes.
   */
  computeEtas(
    waitingEntries: Array<{ id: string; sequenceNo: bigint; serviceDurationMinutes: number }>,
    activeChairCount: number,
    avgActiveDurationMinutes: number,
  ): Map<string, number> {
    const result = new Map<string, number>();
    if (waitingEntries.length === 0) return result;

    const chairs = Math.max(1, activeChairCount);
    // Assume active chairs will all free up in avgActiveDurationMinutes (conservative upper bound).
    const firstFreeSlot = activeChairCount > 0 ? avgActiveDurationMinutes : 0;

    // Sort by sequence number (join order)
    const sorted = [...waitingEntries].sort((a, b) =>
      a.sequenceNo < b.sequenceNo ? -1 : a.sequenceNo > b.sequenceNo ? 1 : 0,
    );

    sorted.forEach((entry, idx) => {
      const batch = Math.floor(idx / chairs); // which chair-round this entry is in
      const eta = firstFreeSlot + batch * entry.serviceDurationMinutes;
      result.set(entry.id, Math.max(1, Math.round(eta)));
    });

    return result;
  }

  /**
   * ETA for the very next person joining now (used in QueueStateDto / discovery).
   */
  etaForNextJoin(
    waitingCount: number,
    activeChairCount: number,
    avgServiceDurationMinutes: number,
  ): number | null {
    if (avgServiceDurationMinutes <= 0) return null;
    const chairs = Math.max(1, activeChairCount);
    const firstFreeSlot = activeChairCount > 0 ? avgServiceDurationMinutes : 0;
    const batch = Math.floor(waitingCount / chairs);
    return Math.max(1, Math.round(firstFreeSlot + batch * avgServiceDurationMinutes));
  }
}
