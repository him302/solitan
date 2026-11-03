import type { QueueEntryDto } from '@soliton/api-contract';
import { describeQueueChange } from './queueChangeCopy';

/**
 * Only `describeQueueChange` is tested here: it is the decision about whether to
 * interrupt someone, which is the part that would make the app unusable if it were wrong.
 * Presenting the notification itself is expo-notifications' job and needs a device.
 */

function entry(overrides: Partial<QueueEntryDto>): QueueEntryDto {
  return {
    id: 'e1',
    salonId: 's1',
    salonName: 'Looks Unisex',
    salonAddress: null,
    serviceId: 'svc1',
    serviceName: 'Haircut',
    servicePriceCents: 20000,
    serviceDurationMinutes: 30,
    tokenNumber: 104,
    status: 'active',
    entryState: 'waiting',
    queuePositionAhead: 2,
    etaMinutes: 20,
    chairLabel: null,
    ...overrides,
  } as QueueEntryDto;
}

describe('deciding when to interrupt someone', () => {
  it('says nothing on first load — the state of the world is not news', () => {
    expect(describeQueueChange(null, entry({ entryState: 'notified' }))).toBeNull();
  });

  it('says nothing when the state has not changed', () => {
    const waiting = entry({ entryState: 'waiting' });
    expect(describeQueueChange(waiting, entry({ entryState: 'waiting' }))).toBeNull();
  });

  it('does not notify on a position change alone', () => {
    // A buzz per person ahead would be intolerable in a ten-person queue; the screen
    // already shows it.
    const before = entry({ entryState: 'waiting', queuePositionAhead: 5 });
    const after = entry({ entryState: 'waiting', queuePositionAhead: 4 });
    expect(describeQueueChange(before, after)).toBeNull();
  });

  it('announces the turn approaching', () => {
    const change = describeQueueChange(
      entry({ entryState: 'waiting' }),
      entry({ entryState: 'notified' }),
    );
    expect(change?.title).toMatch(/almost your turn/i);
    expect(change?.body).toContain('Looks Unisex');
    expect(change?.body).toContain('#104');
  });

  it('announces the turn arriving', () => {
    const change = describeQueueChange(
      entry({ entryState: 'notified' }),
      entry({ entryState: 'in_service' }),
    );
    expect(change?.title).toMatch(/it is your turn/i);
  });

  it('announces completion', () => {
    const change = describeQueueChange(
      entry({ entryState: 'in_service' }),
      entry({ entryState: 'completed' }),
    );
    expect(change?.title).toMatch(/all done/i);
  });

  it('announces losing a place, since the customer did not cause it', () => {
    const cancelled = describeQueueChange(
      entry({ entryState: 'waiting' }),
      entry({ entryState: 'cancelled' }),
    );
    expect(cancelled).not.toBeNull();

    const noShow = describeQueueChange(
      entry({ entryState: 'notified' }),
      entry({ entryState: 'no_show' }),
    );
    expect(noShow?.body).toMatch(/contact the salon/i);
  });

  it('stays quiet for states that are only visible on screen', () => {
    expect(
      describeQueueChange(entry({ entryState: 'waiting' }), entry({ entryState: 'checked_in' })),
    ).toBeNull();
  });

  it('copes with a missing salon name', () => {
    const change = describeQueueChange(
      entry({ entryState: 'waiting' }),
      entry({ entryState: 'in_service', salonName: '' }),
    );
    expect(change?.body).toContain('the salon');
    expect(change?.body).not.toContain('undefined');
  });
});
