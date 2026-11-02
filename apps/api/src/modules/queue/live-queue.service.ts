import { Injectable } from '@nestjs/common';
import type { LiveQueueInfo } from '@soliton/api-contract';
import { PrismaService } from '../prisma/prisma.service';
import { NO_LIVE_QUEUE } from '../salons/salon-mapper';
import { buildServerPool, computeEtas, type EtaServer } from './eta-engine';

/**
 * Live queue summaries for customer-facing salon lists and detail pages (Part 6A, 6B).
 *
 * `LiveQueueInfo` has always had an `available: true` variant carrying the current token,
 * the number waiting and an estimate — and `salon-mapper.ts` hardcoded
 * `{ available: false }` for every salon, with a comment saying a later phase would widen
 * it. The queue engine shipped; nothing widened it. So every business card and every
 * salon page told customers the live queue was unavailable, in an app whose entire
 * purpose is live queues.
 *
 * Batched deliberately: a salon list is paginated, and doing this per card would mean
 * four queries per salon. Everything here is four queries total, regardless of page size.
 */
@Injectable()
export class LiveQueueService {
  constructor(private readonly prisma: PrismaService) {}

  /** Live state for one salon. */
  async forSalon(salonId: string): Promise<LiveQueueInfo> {
    const map = await this.forSalons([salonId]);
    return map.get(salonId) ?? NO_LIVE_QUEUE;
  }

  /**
   * Live state for many salons, in four queries.
   *
   * A salon whose queue is closed, paused or missing is reported as unavailable rather
   * than as "0 waiting": a closed queue is not an empty one you can join.
   */
  async forSalons(salonIds: string[]): Promise<Map<string, LiveQueueInfo>> {
    const result = new Map<string, LiveQueueInfo>();
    if (salonIds.length === 0) return result;

    const [queues, entries, staff, chairs] = await Promise.all([
      this.prisma.queue.findMany({
        where: { salonId: { in: salonIds } },
        select: { salonId: true, status: true },
      }),
      // Waiting and in-service entries together: the simulation needs both.
      this.prisma.queueEntry.findMany({
        where: {
          salonId: { in: salonIds },
          state: { in: ['waiting', 'notified', 'checked_in', 'in_service'] },
        },
        select: {
          id: true,
          salonId: true,
          sequenceNo: true,
          state: true,
          serviceId: true,
          staffId: true,
          preferredStaffId: true,
          delayMinutes: true,
          startedAt: true,
          tokenNumber: true,
          service: { select: { estimatedMinutes: true } },
        },
        orderBy: { sequenceNo: 'asc' },
      }),
      this.prisma.salonStaff.findMany({
        where: { salonId: { in: salonIds }, active: true, onShift: true },
        select: {
          id: true,
          salonId: true,
          capabilities: { select: { serviceId: true } },
        },
      }),
      this.prisma.chair.groupBy({
        by: ['salonId'],
        where: { salonId: { in: salonIds }, active: true },
        _count: { _all: true },
      }),
    ]);

    const now = new Date();
    const queueStatus = new Map(queues.map((q) => [q.salonId, q.status]));
    const chairCount = new Map(chairs.map((c) => [c.salonId, c._count._all]));

    for (const salonId of salonIds) {
      const status = queueStatus.get(salonId);

      // Only an open or limited queue has anything live worth reporting. 'limited' still
      // counts: walk-ins are accepted, so the wait is real information.
      if (status !== 'open' && status !== 'limited') {
        result.set(salonId, NO_LIVE_QUEUE);
        continue;
      }

      const mine = entries.filter((e) => e.salonId === salonId);
      const inService = mine.filter((e) => e.state === 'in_service');
      const waiting = mine.filter((e) => e.state !== 'in_service');

      const servers: EtaServer[] = staff
        .filter((member) => member.salonId === salonId)
        .map((member) => {
          const busy = inService.find((e) => e.staffId === member.id);
          return {
            id: member.id,
            capableServiceIds: member.capabilities.map((c) => c.serviceId),
            busyWith:
              busy?.startedAt != null
                ? {
                    startedAt: busy.startedAt,
                    serviceDurationMinutes: busy.service.estimatedMinutes,
                  }
                : undefined,
          };
        });

      const unattributed = inService
        .filter((e) => e.startedAt != null)
        .map((e) => ({
          startedAt: e.startedAt as Date,
          serviceDurationMinutes: e.service.estimatedMinutes,
        }));

      const pool = buildServerPool(servers, chairCount.get(salonId) ?? 0, unattributed);

      const estimate = computeEtas({
        now,
        servers: pool.servers,
        basis: pool.basis,
        waiting: waiting.map((e) => ({
          id: e.id,
          sequenceNo: e.sequenceNo,
          serviceId: e.serviceId,
          serviceDurationMinutes: e.service.estimatedMinutes,
          delayMinutes: e.delayMinutes,
          preferredStaffId: e.preferredStaffId,
        })),
      });

      result.set(salonId, {
        available: true,
        // The lowest token in service reads as "now serving" on a card.
        currentToken:
          inService.length > 0 ? Math.min(...inService.map((e) => e.tokenNumber)) : null,
        totalWaiting: waiting.length,
        // Null rather than a guess when there is nobody to serve: the card then shows
        // the queue length without implying a wait the salon cannot honour.
        etaMinutes: estimate.etaForNextJoin,
      });
    }

    return result;
  }
}
