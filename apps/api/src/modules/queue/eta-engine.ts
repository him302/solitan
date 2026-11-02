/**
 * Deterministic waiting-time estimation (Part 10).
 *
 * The previous engine divided the queue by the number of chairs and multiplied by an
 * average duration. Its own comment conceded the main shortcut: "we don't track start
 * time per chair so we use full duration as upper bound". It therefore ignored three
 * things the database already stored — how far the current services have actually
 * progressed (`QueueEntry.startedAt`), any delay the salon had announced
 * (`QueueEntry.delayMinutes`), and who is actually working (`SalonStaff.onShift`,
 * `StaffService` capabilities) — and counted chairs, which are furniture, as the thing
 * that serves customers.
 *
 * This replaces that with a small discrete-event simulation: give every server a
 * "free at" time, then walk the queue in order handing each customer to the server who
 * frees up first. That naturally produces parallel service, respects per-service
 * durations, honours a requested stylist, and reflects work already in progress.
 *
 * No ML and no external calls. Every input is a number already in the database, so the
 * result is reproducible and explainable to an owner who asks why a number moved. The
 * shape leaves room for learned service durations later: `serviceDurationMinutes` is the
 * only estimate involved, so swapping configured minutes for an observed average is a
 * change of input, not of algorithm.
 */

/** A member who can serve customers right now. */
export interface EtaServer {
  /** SalonStaff id. */
  id: string;
  /**
   * Service ids this member can perform. An empty array means "not configured", which is
   * treated as able to do anything — a salon that has not filled in capabilities should
   * still get sensible estimates rather than an infinite wait.
   */
  capableServiceIds: string[];
  /** The service in progress, if this member is mid-appointment. */
  busyWith?: {
    startedAt: Date;
    serviceDurationMinutes: number;
  };
}

/** A customer waiting to be served. */
export interface EtaWaitingEntry {
  id: string;
  /** Queue order. */
  sequenceNo: bigint;
  serviceId: string;
  serviceDurationMinutes: number;
  /** Delay the salon has announced for this entry, in minutes. */
  delayMinutes: number;
  /** When set, only this member will do, so the customer waits for them specifically. */
  preferredStaffId?: string | null;
}

export interface EtaInput {
  waiting: EtaWaitingEntry[];
  servers: EtaServer[];
  now: Date;
  /**
   * Where the server pool came from, as returned by {@link buildServerPool}. Passed in
   * rather than inferred: the simulation cannot tell real staff from a chair stand-in,
   * and reporting a chair-based guess as staff-accurate would be exactly the misleading
   * estimate Part 10 rules out.
   */
  basis?: EtaBasis;
}

/**
 * What the estimate was derived from. Surfaced so the API can be honest about
 * uncertainty rather than presenting every number with equal confidence.
 */
export type EtaBasis =
  /** Real on-shift staff, with capabilities. The accurate case. */
  | 'staff'
  /** Nobody marked on shift, so chair count stood in for capacity. */
  | 'chairs'
  /** Neither staff nor chairs configured; assumed a single server. */
  | 'assumed_single'
  /** Nothing to estimate from — no servers at all. */
  | 'unavailable';

export interface EtaResult {
  /** entryId → minutes from now until service is expected to start. */
  etas: Map<string, number>;
  /** Minutes until a customer joining right now would start. Null when unknowable. */
  etaForNextJoin: number | null;
  basis: EtaBasis;
}

/** Internal: a server plus the moment it next becomes free. */
interface ServerState {
  id: string;
  capableServiceIds: string[];
  freeAtMs: number;
}

const MS_PER_MIN = 60_000;
const DEFAULT_SERVICE_MINUTES = 30;

/**
 * Builds the server pool from on-shift staff, falling back through chairs to a single
 * assumed server.
 *
 * The fallbacks exist because `onShift` is new and a salon that has not adopted it would
 * otherwise show "no estimate available" on a queue it is actively working through —
 * which would read as a broken app rather than an honest unknown. The basis is reported
 * so callers can distinguish the cases.
 */
export function buildServerPool(
  onShiftStaff: EtaServer[],
  activeChairCount: number,
  inServiceFallback: Array<{ startedAt: Date; serviceDurationMinutes: number }> = [],
): { servers: EtaServer[]; basis: EtaBasis } {
  if (onShiftStaff.length > 0) return { servers: onShiftStaff, basis: 'staff' };

  if (activeChairCount > 0) {
    // Chairs are anonymous, so in-progress work is spread across them in order. This is
    // weaker than real staff data, which is exactly why the basis says so.
    const servers: EtaServer[] = Array.from({ length: activeChairCount }, (_, i) => ({
      id: `chair-${i}`,
      capableServiceIds: [],
      busyWith: inServiceFallback[i],
    }));
    return { servers, basis: 'chairs' };
  }

  if (inServiceFallback.length > 0) {
    const servers: EtaServer[] = inServiceFallback.map((busy, i) => ({
      id: `implied-${i}`,
      capableServiceIds: [],
      busyWith: busy,
    }));
    return { servers, basis: 'assumed_single' };
  }

  return { servers: [], basis: 'unavailable' };
}

/**
 * Runs the simulation.
 *
 * Returns whole minutes, always at least 1 for a customer who is not yet being served:
 * telling someone their wait is "0 minutes" while somebody else is in the chair is a
 * promise the salon cannot keep.
 */
export function computeEtas(input: EtaInput): EtaResult {
  const { waiting, servers, now } = input;
  const nowMs = now.getTime();

  if (servers.length === 0) {
    return { etas: new Map(), etaForNextJoin: null, basis: 'unavailable' };
  }

  const pool: ServerState[] = servers.map((server) => ({
    id: server.id,
    capableServiceIds: server.capableServiceIds,
    freeAtMs: freeAtFor(server, nowMs),
  }));

  const etas = new Map<string, number>();

  // Queue order is the sequence number, not insertion order of the array.
  const ordered = [...waiting].sort((a, b) =>
    a.sequenceNo < b.sequenceNo ? -1 : a.sequenceNo > b.sequenceNo ? 1 : 0,
  );

  for (const entry of ordered) {
    const candidates = eligibleServers(pool, entry);

    if (candidates.length === 0) {
      // Nobody can perform this service — a requested stylist who is not on shift, or a
      // service no on-shift member is trained for. Omitted rather than guessed: an
      // estimate nobody can deliver is worse than admitting there isn't one.
      continue;
    }

    const server = candidates.reduce((earliest, candidate) =>
      candidate.freeAtMs < earliest.freeAtMs ? candidate : earliest,
    );

    // A delay pushes this customer's start back, but never brings it earlier than now.
    const startMs = Math.max(nowMs, server.freeAtMs) + entry.delayMinutes * MS_PER_MIN;
    const waitMinutes = Math.max(1, Math.round((startMs - nowMs) / MS_PER_MIN));
    etas.set(entry.id, waitMinutes);

    // That server is now committed until this service finishes.
    server.freeAtMs = startMs + entry.serviceDurationMinutes * MS_PER_MIN;
  }

  return {
    etas,
    etaForNextJoin: estimateNextJoin(pool, nowMs),
    basis: input.basis ?? 'staff',
  };
}

/**
 * When the given server next becomes free.
 *
 * A service running over its estimate is clamped to `now` rather than reported as
 * already finished: once a service has overrun, its real remaining time is unknown, and
 * assuming it ends immediately would make every downstream estimate too optimistic.
 */
function freeAtFor(server: EtaServer, nowMs: number): number {
  if (!server.busyWith) return nowMs;
  const expectedEndMs =
    server.busyWith.startedAt.getTime() + server.busyWith.serviceDurationMinutes * MS_PER_MIN;
  return Math.max(nowMs, expectedEndMs);
}

function eligibleServers(pool: ServerState[], entry: EtaWaitingEntry): ServerState[] {
  if (entry.preferredStaffId) {
    // A requested stylist is a constraint, not a preference: handing the customer to
    // whoever is free first would produce an estimate for service they did not ask for.
    return pool.filter((server) => server.id === entry.preferredStaffId);
  }
  return pool.filter(
    (server) =>
      server.capableServiceIds.length === 0 ||
      server.capableServiceIds.includes(entry.serviceId),
  );
}

/**
 * What a customer joining right now would wait: the queue is already simulated, so this
 * is simply when the first server frees up after all current commitments.
 */
function estimateNextJoin(pool: ServerState[], nowMs: number): number | null {
  if (pool.length === 0) return null;
  const earliestMs = Math.min(...pool.map((server) => server.freeAtMs));
  if (earliestMs <= nowMs) return 0;
  return Math.max(1, Math.round((earliestMs - nowMs) / MS_PER_MIN));
}

/** Average configured duration across a set of services, for display only. */
export function averageServiceMinutes(durations: number[]): number {
  if (durations.length === 0) return DEFAULT_SERVICE_MINUTES;
  return Math.round(durations.reduce((acc, d) => acc + d, 0) / durations.length);
}
