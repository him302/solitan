import {
  averageServiceMinutes,
  buildServerPool,
  computeEtas,
  type EtaServer,
  type EtaWaitingEntry,
} from './eta-engine';

const NOW = new Date('2026-03-10T10:00:00Z');

/** Minutes before NOW, for expressing work already in progress. */
function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60_000);
}

function waiting(
  // sequenceNo is taken as a number for readability and widened to bigint here;
  // intersecting Partial<EtaWaitingEntry> directly would give bigint & number = never.
  overrides: Omit<Partial<EtaWaitingEntry>, 'sequenceNo'> & { id: string; sequenceNo: number },
): EtaWaitingEntry {
  return {
    serviceId: 'svc-haircut',
    serviceDurationMinutes: 30,
    delayMinutes: 0,
    ...overrides,
    sequenceNo: BigInt(overrides.sequenceNo),
  };
}

function server(overrides: Partial<EtaServer> & { id: string }): EtaServer {
  return { capableServiceIds: [], ...overrides };
}

describe('parallel service', () => {
  it('divides the queue across available staff', () => {
    // Part 10's own example: three waiting, two staff free. The third waits one round.
    const { etas } = computeEtas({
      now: NOW,
      servers: [server({ id: 's1' }), server({ id: 's2' })],
      waiting: [
        waiting({ id: 'a', sequenceNo: 1 }),
        waiting({ id: 'b', sequenceNo: 2 }),
        waiting({ id: 'c', sequenceNo: 3 }),
      ],
    });

    // Two start immediately; the floor of 1 minute applies rather than promising "now".
    expect(etas.get('a')).toBe(1);
    expect(etas.get('b')).toBe(1);
    // The third waits for the first chair to free up.
    expect(etas.get('c')).toBe(30);
  });

  it('serves a queue faster with more staff', () => {
    const queue = [
      waiting({ id: 'a', sequenceNo: 1 }),
      waiting({ id: 'b', sequenceNo: 2 }),
      waiting({ id: 'c', sequenceNo: 3 }),
      waiting({ id: 'd', sequenceNo: 4 }),
    ];
    const one = computeEtas({ now: NOW, servers: [server({ id: 's1' })], waiting: queue });
    const three = computeEtas({
      now: NOW,
      servers: [server({ id: 's1' }), server({ id: 's2' }), server({ id: 's3' })],
      waiting: queue,
    });

    expect(one.etas.get('d')).toBeGreaterThan(three.etas.get('d')!);
  });
});

describe('work already in progress', () => {
  it('counts only the time remaining, not the whole service', () => {
    // 20 minutes into a 30-minute service: 10 remain. The old engine assumed 30.
    const { etas } = computeEtas({
      now: NOW,
      servers: [
        server({
          id: 's1',
          busyWith: { startedAt: minutesAgo(20), serviceDurationMinutes: 30 },
        }),
      ],
      waiting: [waiting({ id: 'a', sequenceNo: 1 })],
    });

    expect(etas.get('a')).toBe(10);
  });

  it('does not assume an overrunning service has finished', () => {
    // 45 minutes into a 30-minute service. Its real remaining time is unknown; treating
    // it as finished would make every downstream estimate too optimistic.
    const { etas } = computeEtas({
      now: NOW,
      servers: [
        server({
          id: 's1',
          busyWith: { startedAt: minutesAgo(45), serviceDurationMinutes: 30 },
        }),
      ],
      waiting: [waiting({ id: 'a', sequenceNo: 1 })],
    });

    expect(etas.get('a')).toBe(1);
  });

  it('prefers the server who frees up first', () => {
    const { etas } = computeEtas({
      now: NOW,
      servers: [
        server({ id: 'slow', busyWith: { startedAt: minutesAgo(5), serviceDurationMinutes: 60 } }),
        server({ id: 'soon', busyWith: { startedAt: minutesAgo(25), serviceDurationMinutes: 30 } }),
      ],
      waiting: [waiting({ id: 'a', sequenceNo: 1 })],
    });

    // 'soon' frees in 5 minutes, 'slow' in 55.
    expect(etas.get('a')).toBe(5);
  });
});

describe('announced delays', () => {
  it('pushes the estimate back by the delay', () => {
    const { etas } = computeEtas({
      now: NOW,
      servers: [server({ id: 's1' })],
      waiting: [waiting({ id: 'a', sequenceNo: 1, delayMinutes: 15 })],
    });

    expect(etas.get('a')).toBe(15);
  });

  it('delays everyone behind the delayed customer too', () => {
    const { etas } = computeEtas({
      now: NOW,
      servers: [server({ id: 's1' })],
      waiting: [
        waiting({ id: 'a', sequenceNo: 1, delayMinutes: 15 }),
        waiting({ id: 'b', sequenceNo: 2 }),
      ],
    });

    // The queue is sequential, so b starts after a's delayed 30-minute service.
    expect(etas.get('b')).toBe(45);
  });
});

describe('service duration', () => {
  it('respects each service rather than one average', () => {
    const { etas } = computeEtas({
      now: NOW,
      servers: [server({ id: 's1' })],
      waiting: [
        waiting({ id: 'quick', sequenceNo: 1, serviceDurationMinutes: 10 }),
        waiting({ id: 'after', sequenceNo: 2 }),
      ],
    });

    // 'after' waits only the 10 minutes the beard trim actually takes.
    expect(etas.get('after')).toBe(10);
  });

  it('orders by sequence number, not array order', () => {
    const { etas } = computeEtas({
      now: NOW,
      servers: [server({ id: 's1' })],
      waiting: [
        waiting({ id: 'second', sequenceNo: 2 }),
        waiting({ id: 'first', sequenceNo: 1 }),
      ],
    });

    expect(etas.get('first')).toBe(1);
    expect(etas.get('second')).toBe(30);
  });
});

describe('staff capabilities', () => {
  it('routes a service only to staff trained for it', () => {
    const { etas } = computeEtas({
      now: NOW,
      servers: [
        server({ id: 'barber', capableServiceIds: ['svc-haircut'] }),
        server({ id: 'colourist', capableServiceIds: ['svc-colour'] }),
      ],
      waiting: [
        waiting({ id: 'cut', sequenceNo: 1, serviceId: 'svc-haircut' }),
        // Must wait for the colourist, who is free, not queue behind the barber.
        waiting({ id: 'colour', sequenceNo: 2, serviceId: 'svc-colour' }),
      ],
    });

    expect(etas.get('cut')).toBe(1);
    expect(etas.get('colour')).toBe(1);
  });

  it('treats unconfigured capabilities as able to do anything', () => {
    // A salon that has not filled in capabilities must still get usable estimates.
    const { etas } = computeEtas({
      now: NOW,
      servers: [server({ id: 's1', capableServiceIds: [] })],
      waiting: [waiting({ id: 'a', sequenceNo: 1, serviceId: 'anything' })],
    });

    expect(etas.get('a')).toBe(1);
  });

  it('gives no estimate when nobody can perform the service', () => {
    // Guessing here would promise service the salon cannot deliver.
    const { etas } = computeEtas({
      now: NOW,
      servers: [server({ id: 'barber', capableServiceIds: ['svc-haircut'] })],
      waiting: [waiting({ id: 'colour', sequenceNo: 1, serviceId: 'svc-colour' })],
    });

    expect(etas.has('colour')).toBe(false);
  });

  it('does not let an unservable entry block the queue behind it', () => {
    const { etas } = computeEtas({
      now: NOW,
      servers: [server({ id: 'barber', capableServiceIds: ['svc-haircut'] })],
      waiting: [
        waiting({ id: 'colour', sequenceNo: 1, serviceId: 'svc-colour' }),
        waiting({ id: 'cut', sequenceNo: 2, serviceId: 'svc-haircut' }),
      ],
    });

    expect(etas.has('colour')).toBe(false);
    expect(etas.get('cut')).toBe(1);
  });
});

describe('requested stylist', () => {
  it('makes the customer wait for the person they asked for', () => {
    const { etas } = computeEtas({
      now: NOW,
      servers: [
        server({ id: 'free' }),
        server({ id: 'asha', busyWith: { startedAt: minutesAgo(10), serviceDurationMinutes: 40 } }),
      ],
      waiting: [waiting({ id: 'a', sequenceNo: 1, preferredStaffId: 'asha' })],
    });

    // Not 1 minute: handing them to whoever is free would estimate service they did not
    // ask for.
    expect(etas.get('a')).toBe(30);
  });

  it('gives no estimate when the requested person is not on shift', () => {
    const { etas } = computeEtas({
      now: NOW,
      servers: [server({ id: 'someone-else' })],
      waiting: [waiting({ id: 'a', sequenceNo: 1, preferredStaffId: 'gone-home' })],
    });

    expect(etas.has('a')).toBe(false);
  });
});

describe('next-join estimate', () => {
  it('is zero when somebody is free right now', () => {
    const { etaForNextJoin } = computeEtas({
      now: NOW,
      servers: [server({ id: 's1' })],
      waiting: [],
    });
    expect(etaForNextJoin).toBe(0);
  });

  it('accounts for the whole queue ahead', () => {
    const { etaForNextJoin } = computeEtas({
      now: NOW,
      servers: [server({ id: 's1' })],
      waiting: [
        waiting({ id: 'a', sequenceNo: 1 }),
        waiting({ id: 'b', sequenceNo: 2 }),
      ],
    });
    // Two 30-minute services on one server.
    expect(etaForNextJoin).toBe(60);
  });

  it('is unknown when there are no servers', () => {
    const { etaForNextJoin, basis } = computeEtas({ now: NOW, servers: [], waiting: [] });
    expect(etaForNextJoin).toBeNull();
    expect(basis).toBe('unavailable');
  });
});

describe('server pool and honesty about its basis', () => {
  it('uses on-shift staff when there are any', () => {
    const { servers, basis } = buildServerPool([server({ id: 's1' })], 5);
    expect(basis).toBe('staff');
    expect(servers).toHaveLength(1);
  });

  it('falls back to chairs when nobody is marked on shift', () => {
    // onShift is new; a salon that has not adopted it should not see "no estimate" on a
    // queue it is actively working through.
    const { servers, basis } = buildServerPool([], 2);
    expect(basis).toBe('chairs');
    expect(servers).toHaveLength(2);
  });

  it('spreads in-progress work across the chair stand-ins', () => {
    const { servers } = buildServerPool([], 2, [
      { startedAt: minutesAgo(25), serviceDurationMinutes: 30 },
    ]);
    expect(servers[0].busyWith).toBeDefined();
    expect(servers[1].busyWith).toBeUndefined();
  });

  it('infers servers from work in progress when nothing is configured', () => {
    const { servers, basis } = buildServerPool([], 0, [
      { startedAt: minutesAgo(5), serviceDurationMinutes: 30 },
    ]);
    expect(basis).toBe('assumed_single');
    expect(servers).toHaveLength(1);
  });

  it('reports unavailable rather than inventing capacity', () => {
    const { servers, basis } = buildServerPool([], 0, []);
    expect(basis).toBe('unavailable');
    expect(servers).toHaveLength(0);
  });

  it('carries the basis into the result, so a chair guess is not reported as staff', () => {
    const pool = buildServerPool([], 2);
    const { basis } = computeEtas({
      now: NOW,
      servers: pool.servers,
      waiting: [waiting({ id: 'a', sequenceNo: 1 })],
      basis: pool.basis,
    });
    expect(basis).toBe('chairs');
  });
});

describe('average service minutes', () => {
  it('averages configured durations', () => {
    expect(averageServiceMinutes([10, 20, 30])).toBe(20);
  });

  it('falls back to a sane default for an empty queue', () => {
    expect(averageServiceMinutes([])).toBe(30);
  });
});

describe('estimates never mislead', () => {
  it('never returns zero for someone who is not yet being served', () => {
    const { etas } = computeEtas({
      now: NOW,
      servers: [server({ id: 's1' })],
      waiting: Array.from({ length: 10 }, (_, i) =>
        waiting({ id: `e${i}`, sequenceNo: i + 1 }),
      ),
    });
    for (const value of etas.values()) {
      expect(value).toBeGreaterThanOrEqual(1);
    }
  });

  it('is monotonic down a single-server queue', () => {
    const { etas } = computeEtas({
      now: NOW,
      servers: [server({ id: 's1' })],
      waiting: Array.from({ length: 6 }, (_, i) =>
        waiting({ id: `e${i}`, sequenceNo: i + 1 }),
      ),
    });
    const values = Array.from({ length: 6 }, (_, i) => etas.get(`e${i}`)!);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('is deterministic — the same input gives the same answer', () => {
    const input = {
      now: NOW,
      servers: [server({ id: 's1' }), server({ id: 's2' })],
      waiting: [
        waiting({ id: 'a', sequenceNo: 1 }),
        waiting({ id: 'b', sequenceNo: 2, serviceDurationMinutes: 45 }),
      ],
    };
    expect([...computeEtas(input).etas]).toEqual([...computeEtas(input).etas]);
  });
});
