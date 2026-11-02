import { NOTIFICATION_TYPES, QUEUE_NOTIFICATION_TYPES } from '@soliton/api-contract';
import { composeNotification } from './notification-copy';

describe('notification copy', () => {
  it('has real wording for every declared type', () => {
    // Guards against a type being added to the contract and shipping as a blank or
    // placeholder notification.
    for (const type of NOTIFICATION_TYPES) {
      const { title, body } = composeNotification(type, {});
      expect(title.length).toBeGreaterThan(3);
      expect(body.length).toBeGreaterThan(3);
      expect(`${title} ${body}`).not.toMatch(/undefined|null|\[object|TODO/i);
    }
  });

  it('covers every queue moment Part 11 names', () => {
    expect(QUEUE_NOTIFICATION_TYPES).toEqual(
      expect.arrayContaining([
        'QUEUE_JOINED',
        'QUEUE_POSITION_CHANGED',
        'QUEUE_TURN_APPROACHING',
        'QUEUE_TURN_ARRIVED',
        'QUEUE_SERVICE_COMPLETED',
        'QUEUE_DELAYED',
        'QUEUE_PAUSED',
        'QUEUE_CLOSED',
      ]),
    );
  });

  it('names the salon when known and stays readable when not', () => {
    const named = composeNotification('QUEUE_TURN_APPROACHING', { salonName: 'Looks Unisex' });
    expect(named.body).toContain('Looks Unisex');

    const anonymous = composeNotification('QUEUE_TURN_APPROACHING', {});
    expect(anonymous.body).toContain('the salon');
  });

  it('includes the token number so the customer can match it to their screen', () => {
    const { body } = composeNotification('QUEUE_JOINED', { tokenNumber: 104 });
    expect(body).toContain('#104');
  });

  it('phrases estimates as approximate, never as a promise', () => {
    const { body } = composeNotification('QUEUE_TURN_APPROACHING', { etaMinutes: 10 });
    expect(body).toMatch(/about 10 minutes/);
    // Part 10: estimates are estimates.
    expect(body).not.toMatch(/\bexactly\b|\bwill be ready at\b|\bguaranteed\b/i);
  });

  it('omits the estimate entirely rather than inventing one', () => {
    const { body } = composeNotification('QUEUE_TURN_APPROACHING', {});
    expect(body).not.toMatch(/minutes/);
  });

  it('says "you are next" rather than "0 ahead"', () => {
    const { body } = composeNotification('QUEUE_POSITION_CHANGED', { positionAhead: 0 });
    expect(body).toMatch(/next/i);
    expect(body).not.toMatch(/\b0 ahead\b/);
  });

  it('pluralises the people ahead', () => {
    expect(composeNotification('QUEUE_JOINED', { positionAhead: 1 }).body).toContain('1 person');
    expect(composeNotification('QUEUE_JOINED', { positionAhead: 3 }).body).toContain('3 people');
  });

  it('distinguishes a longer wait from a shorter one', () => {
    expect(composeNotification('QUEUE_DELAYED', { delayMinutes: 15 }).body).toContain('increased');
    // A negative delay is the salon catching up; calling that an increase would be wrong.
    expect(composeNotification('QUEUE_DELAYED', { delayMinutes: -10 }).body).toContain('reduced');
  });

  it('never shows a negative number of minutes to a customer', () => {
    const { body } = composeNotification('QUEUE_DELAYED', { delayMinutes: -10 });
    expect(body).toContain('10 minutes');
    expect(body).not.toContain('-10');
  });

  it('passes the owner reason through so the delay explains itself', () => {
    const { body } = composeNotification('QUEUE_DELAYED', {
      delayMinutes: 15,
      reason: 'Equipment problem.',
    });
    expect(body).toContain('Equipment problem.');
  });

  it('reassures a paused customer that they keep their place', () => {
    const { body } = composeNotification('QUEUE_PAUSED', { salonName: 'Raipur Cuts' });
    expect(body).toMatch(/keep your place/i);
  });

  it('tells a no-show customer how to put it right', () => {
    const { body } = composeNotification('QUEUE_NO_SHOW', {});
    expect(body).toMatch(/contact the salon/i);
  });
});
