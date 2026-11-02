import { StaffService, maskPhone, normalizePhone, startOfSalonDay } from './staff.service';
import { SalonAccessService } from '../salons/salon-access.service';
import {
  asPrisma,
  createPrismaMock,
  OWNER,
  STAFF,
  type PrismaMock,
} from '../../../test/support/prisma-mock';

const SALON = 'salon-1';

function makeService(prisma: PrismaMock) {
  // Authorization itself is covered by salon-access.service; here it is stubbed so these
  // tests exercise staff behaviour, with a separate assertion that it is actually called.
  const access = { assertManager: jest.fn().mockResolvedValue(undefined) };
  const service = new StaffService(asPrisma(prisma), access as unknown as SalonAccessService);
  return { service, access };
}

/** A loaded membership row shaped like the `staffInclude` payload. */
function memberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
    salonId: SALON,
    userId: 'user-1',
    role: 'staff',
    active: true,
    onShift: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    user: { id: 'user-1', name: 'Asha', phone: '+919876543210' },
    capabilities: [],
    ...overrides,
  };
}

describe('phone normalisation', () => {
  it('resolves the same number entered in different formats to one account', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizePhone('+91-98765-43210')).toBe('+919876543210');
    expect(normalizePhone('  +91 (98765) 43210 ')).toBe('+919876543210');
  });

  it('preserves the distinction between local and international form', () => {
    // These are genuinely different identifiers; normalisation must not invent a prefix.
    expect(normalizePhone('9876543210')).toBe('9876543210');
    expect(normalizePhone('+919876543210')).toBe('+919876543210');
  });
});

describe('phone masking', () => {
  it('reveals only the last four digits', () => {
    expect(maskPhone('+919876543210')).toBe('••••3210');
  });

  it('does not expose a short number in full', () => {
    expect(maskPhone('123')).toBe('••123');
  });

  it('passes through a missing number', () => {
    expect(maskPhone(null)).toBeNull();
  });
});

describe('salon day boundary', () => {
  it('treats a late-evening IST completion as today, not tomorrow', () => {
    // 2026-03-10 22:00 IST == 16:30 UTC. The salon day began at 18:30 UTC the day before.
    const start = startOfSalonDay(new Date('2026-03-10T16:30:00Z'));
    expect(start.toISOString()).toBe('2026-03-09T18:30:00.000Z');
  });

  it('rolls over at local midnight rather than UTC midnight', () => {
    // 00:30 IST on the 11th is 19:00 UTC on the 10th — already the new salon day.
    const start = startOfSalonDay(new Date('2026-03-10T19:00:00Z'));
    expect(start.toISOString()).toBe('2026-03-10T18:30:00.000Z');
  });
});

describe('adding staff', () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.salonStaff.findFirst.mockResolvedValue(memberRow());
  });

  it('refuses unless the actor manages the salon', async () => {
    const { service, access } = makeService(prisma);
    access.assertManager.mockRejectedValue(new Error('denied'));

    await expect(
      service.add(OWNER, SALON, { phone: '9876543210', role: 'staff' }),
    ).rejects.toThrow('denied');

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.salonStaff.create).not.toHaveBeenCalled();
  });

  it('creates a staff account when the phone is unknown', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.salonStaff.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-new' });
    prisma.salonStaff.create.mockResolvedValue({ id: 'member-1' });

    const { service } = makeService(prisma);
    await service.add(OWNER, SALON, { phone: '+91 98765 43210', name: 'Asha', role: 'staff' });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { phone: '+919876543210', name: 'Asha', role: 'staff' },
      select: { id: true },
    });
    expect(prisma.salonStaff.create).toHaveBeenCalledWith({
      data: { salonId: SALON, userId: 'user-new', role: 'staff', active: true, onShift: false },
    });
  });

  it('links an existing account without touching its global role or name', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-existing' });
    prisma.salonStaff.findUnique.mockResolvedValue(null);
    prisma.salonStaff.create.mockResolvedValue({ id: 'member-1' });

    const { service } = makeService(prisma);
    await service.add(OWNER, SALON, { phone: '9876543210', name: 'Renamed', role: 'staff' });

    expect(prisma.user.create).not.toHaveBeenCalled();
    // A customer who also cuts hair keeps their customer account, and one salon cannot
    // rename a person everywhere else.
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects someone who is already an active member', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.salonStaff.findUnique.mockResolvedValue({ id: 'member-1', active: true });

    const { service } = makeService(prisma);
    await expect(
      service.add(OWNER, SALON, { phone: '9876543210', role: 'staff' }),
    ).rejects.toMatchObject({ code: 'STAFF_ALREADY_MEMBER' });
  });

  it('reactivates a previously removed member instead of refusing', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.salonStaff.findUnique.mockResolvedValue({ id: 'member-1', active: false });
    prisma.salonStaff.update.mockResolvedValue({ id: 'member-1' });

    const { service } = makeService(prisma);
    await service.add(OWNER, SALON, { phone: '9876543210', role: 'staff' });

    expect(prisma.salonStaff.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { active: true, role: 'staff' },
    });
    expect(prisma.salonStaff.create).not.toHaveBeenCalled();
  });

  it('rejects capabilities that belong to another salon, before writing anything', async () => {
    // Two ids requested, only one found in this salon.
    prisma.service.findMany.mockResolvedValue([{ id: 'svc-1' }]);

    const { service } = makeService(prisma);
    await expect(
      service.add(OWNER, SALON, {
        phone: '9876543210',
        role: 'staff',
        serviceIds: ['svc-1', 'svc-from-another-salon'],
      }),
    ).rejects.toMatchObject({ code: 'STAFF_SERVICE_MISMATCH' });

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.salonStaff.create).not.toHaveBeenCalled();
  });
});

describe('updating staff', () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  it('refuses to demote the last active owner', async () => {
    prisma.salonStaff.findFirst.mockResolvedValue({
      id: 'member-1',
      userId: 'user-1',
      role: 'owner',
      active: true,
    });
    prisma.salonStaff.count.mockResolvedValue(0); // no other active owner

    const { service } = makeService(prisma);
    await expect(
      service.update(OWNER, SALON, 'member-1', { role: 'staff' }),
    ).rejects.toMatchObject({ code: 'STAFF_LAST_OWNER' });

    expect(prisma.salonStaff.update).not.toHaveBeenCalled();
  });

  it('refuses to deactivate the last active owner', async () => {
    prisma.salonStaff.findFirst.mockResolvedValue({
      id: 'member-1',
      userId: 'user-1',
      role: 'owner',
      active: true,
    });
    prisma.salonStaff.count.mockResolvedValue(0);

    const { service } = makeService(prisma);
    await expect(
      service.update(OWNER, SALON, 'member-1', { active: false }),
    ).rejects.toMatchObject({ code: 'STAFF_LAST_OWNER' });
  });

  it('allows demoting an owner when another owner remains', async () => {
    prisma.salonStaff.findFirst
      .mockResolvedValueOnce({ id: 'member-1', userId: 'user-1', role: 'owner', active: true })
      .mockResolvedValue(memberRow({ role: 'staff' }));
    prisma.salonStaff.count.mockResolvedValue(1);

    const { service } = makeService(prisma);
    await service.update(OWNER, SALON, 'member-1', { role: 'staff' });

    expect(prisma.salonStaff.update).toHaveBeenCalled();
  });

  it('ends the shift when a member is deactivated, so capacity is not overstated', async () => {
    prisma.salonStaff.findFirst
      .mockResolvedValueOnce({ id: 'member-1', userId: 'user-1', role: 'staff', active: true })
      .mockResolvedValue(memberRow({ active: false }));

    const { service } = makeService(prisma);
    await service.update(OWNER, SALON, 'member-1', { active: false });

    expect(prisma.salonStaff.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { active: false, onShift: false },
    });
  });

  it('reports a missing member rather than updating nothing', async () => {
    prisma.salonStaff.findFirst.mockResolvedValue(null);
    const { service } = makeService(prisma);
    await expect(
      service.update(OWNER, SALON, 'nope', { onShift: true }),
    ).rejects.toMatchObject({ code: 'STAFF_NOT_FOUND' });
  });
});

describe('removing staff', () => {
  it('deactivates rather than deleting, so served history survives', async () => {
    const prisma = createPrismaMock();
    prisma.salonStaff.findFirst
      .mockResolvedValueOnce({ id: 'member-1', role: 'staff' })
      .mockResolvedValue(memberRow({ active: false }));

    const { service } = makeService(prisma);
    await service.remove(OWNER, SALON, 'member-1');

    expect(prisma.salonStaff.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { active: false, onShift: false },
    });
  });

  it('will not remove the last active owner', async () => {
    const prisma = createPrismaMock();
    prisma.salonStaff.findFirst.mockResolvedValue({ id: 'member-1', role: 'owner' });
    prisma.salonStaff.count.mockResolvedValue(0);

    const { service } = makeService(prisma);
    await expect(service.remove(OWNER, SALON, 'member-1')).rejects.toMatchObject({
      code: 'STAFF_LAST_OWNER',
    });
  });
});

describe('own shift', () => {
  it('acts on the caller own membership, never an id they supply', async () => {
    const prisma = createPrismaMock();
    prisma.salonStaff.findFirst
      .mockResolvedValueOnce({ id: 'member-9', salonId: SALON })
      .mockResolvedValue(memberRow({ id: 'member-9', onShift: true }));

    const { service } = makeService(prisma);
    await service.setOwnShift(STAFF, true);

    // Looked up by the authenticated user id, so one member cannot clock another in.
    expect(prisma.salonStaff.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: STAFF.id, active: true } }),
    );
    expect(prisma.salonStaff.update).toHaveBeenCalledWith({
      where: { id: 'member-9' },
      data: { onShift: true },
    });
  });

  it('fails cleanly when the caller works nowhere', async () => {
    const prisma = createPrismaMock();
    prisma.salonStaff.findFirst.mockResolvedValue(null);

    const { service } = makeService(prisma);
    await expect(service.setOwnShift(STAFF, true)).rejects.toMatchObject({
      code: 'STAFF_NOT_FOUND',
    });
  });
});

describe('capabilities', () => {
  it('replaces the whole set, so removals need no separate call', async () => {
    const prisma = createPrismaMock();
    prisma.salonStaff.findFirst
      .mockResolvedValueOnce({ id: 'member-1' })
      .mockResolvedValue(memberRow());
    prisma.service.findMany.mockResolvedValue([{ id: 'svc-1' }, { id: 'svc-2' }]);

    const { service } = makeService(prisma);
    await service.setServices(OWNER, SALON, 'member-1', { serviceIds: ['svc-1', 'svc-2'] });

    expect(prisma.staffService.deleteMany).toHaveBeenCalledWith({
      where: { salonStaffId: 'member-1' },
    });
    expect(prisma.staffService.createMany).toHaveBeenCalledWith({
      data: [
        { salonStaffId: 'member-1', serviceId: 'svc-1', salonId: SALON },
        { salonStaffId: 'member-1', serviceId: 'svc-2', salonId: SALON },
      ],
      skipDuplicates: true,
    });
  });

  it('clears capabilities when given an empty set', async () => {
    const prisma = createPrismaMock();
    prisma.salonStaff.findFirst
      .mockResolvedValueOnce({ id: 'member-1' })
      .mockResolvedValue(memberRow());

    const { service } = makeService(prisma);
    await service.setServices(OWNER, SALON, 'member-1', { serviceIds: [] });

    expect(prisma.staffService.deleteMany).toHaveBeenCalled();
    expect(prisma.staffService.createMany).not.toHaveBeenCalled();
  });

  it('de-duplicates repeated ids', async () => {
    const prisma = createPrismaMock();
    prisma.salonStaff.findFirst
      .mockResolvedValueOnce({ id: 'member-1' })
      .mockResolvedValue(memberRow());
    prisma.service.findMany.mockResolvedValue([{ id: 'svc-1' }]);

    const { service } = makeService(prisma);
    await service.setServices(OWNER, SALON, 'member-1', {
      serviceIds: ['svc-1', 'svc-1', 'svc-1'],
    });

    expect(prisma.staffService.createMany).toHaveBeenCalledWith({
      data: [{ salonStaffId: 'member-1', serviceId: 'svc-1', salonId: SALON }],
      skipDuplicates: true,
    });
  });
});

describe('public roster', () => {
  it('exposes names and ids only — no phone numbers or workload', async () => {
    const prisma = createPrismaMock();
    prisma.salonStaff.findMany.mockResolvedValue([
      { id: 'member-1', user: { name: 'Asha' } },
      { id: 'member-2', user: { name: null } },
    ]);

    const { service } = makeService(prisma);
    const roster = await service.listPublic(SALON);

    expect(roster).toEqual([
      { id: 'member-1', name: 'Asha' },
      { id: 'member-2', name: 'Staff' },
    ]);
    // Only active members are advertised.
    expect(prisma.salonStaff.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { salonId: SALON, active: true } }),
    );
  });
});
