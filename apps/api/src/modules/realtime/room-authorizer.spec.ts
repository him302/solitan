import {
  RoomAuthorizer,
  type EntryAccess,
  type RealtimeUser,
  type SalonAccess,
} from './room-authorizer';
import { salonRoom, entryRoom } from '@soliton/api-contract';

function build(salonRole: 'owner' | 'staff' | null, entryAllowed: boolean) {
  const salon: SalonAccess = { getSalonRole: jest.fn().mockResolvedValue(salonRole) };
  const entry: EntryAccess = { canAccess: jest.fn().mockResolvedValue(entryAllowed) };
  return { authorizer: new RoomAuthorizer(salon, entry), salon, entry };
}

const admin: RealtimeUser = { id: 'a', role: 'admin' };
const staff: RealtimeUser = { id: 's', role: 'staff' };
const customer: RealtimeUser = { id: 'c', role: 'customer' };

describe('RoomAuthorizer', () => {
  it('allows admin into any room (cross-salon)', async () => {
    const { authorizer } = build(null, false);
    expect(await authorizer.authorize(admin, salonRoom('x'))).toBe(true);
    expect(await authorizer.authorize(admin, entryRoom('y'))).toBe(true);
  });

  it('denies customers from salon rooms', async () => {
    const { authorizer } = build(null, false);
    expect(await authorizer.authorize(customer, salonRoom('x'))).toBe(false);
  });

  it('allows a salon member and denies a non-member', async () => {
    expect(await build('staff', false).authorizer.authorize(staff, salonRoom('x'))).toBe(true);
    expect(await build(null, false).authorizer.authorize(staff, salonRoom('x'))).toBe(false);
  });

  it('delegates entry rooms to the entry access checker', async () => {
    expect(await build(null, true).authorizer.authorize(customer, entryRoom('e'))).toBe(true);
    expect(await build(null, false).authorizer.authorize(customer, entryRoom('e'))).toBe(false);
  });

  it('denies malformed/unknown rooms', async () => {
    const { authorizer } = build('owner', true);
    expect(await authorizer.authorize(staff, 'not-a-room')).toBe(false);
    expect(await authorizer.authorize(staff, 'secret:123')).toBe(false);
  });
});
