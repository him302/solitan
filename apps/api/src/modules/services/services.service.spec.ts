import {
  ADMIN,
  CUSTOMER,
  OWNER,
  SALON_ID,
  SERVICE_ID,
  STAFF,
  asPrisma,
  createPrismaMock,
  salonRecord,
  type PrismaMock,
} from '../../../test/support/prisma-mock';
import { SalonAccessService } from '../salons/salon-access.service';
import { ServicesService } from './services.service';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: SERVICE_ID,
  salonId: SALON_ID,
  name: 'Haircut',
  priceCents: 20000,
  estimatedMinutes: 30,
  active: true,
  ...overrides,
});

function build(): { service: ServicesService; prisma: PrismaMock } {
  const prisma = createPrismaMock();
  prisma.salon.findUnique.mockResolvedValue(salonRecord());
  const service = new ServicesService(asPrisma(prisma), new SalonAccessService(asPrisma(prisma)));
  return { service, prisma };
}

describe('ServicesService (1B)', () => {
  it('shows only ACTIVE services to the public', async () => {
    const { service, prisma } = build();
    prisma.service.findMany.mockResolvedValue([row()]);
    await service.list(undefined, SALON_ID);
    expect(prisma.service.findMany).toHaveBeenCalledWith({
      where: { salonId: SALON_ID, active: true },
      orderBy: { name: 'asc' },
    });
  });

  it("shows ALL services (incl. inactive) to the salon's own members", async () => {
    const { service, prisma } = build();
    prisma.salonStaff.findFirst.mockResolvedValue({ role: 'staff' });
    prisma.service.findMany.mockResolvedValue([row(), row({ id: 'x', active: false })]);
    await service.list(STAFF, SALON_ID);
    expect(prisma.service.findMany).toHaveBeenCalledWith({
      where: { salonId: SALON_ID },
      orderBy: { name: 'asc' },
    });
  });

  it('exposes money as integer cents with a currency, never a float', async () => {
    const { service, prisma } = build();
    prisma.service.findMany.mockResolvedValue([row({ priceCents: 25050 })]);
    const [dto] = await service.list(undefined, SALON_ID);
    expect(dto).toMatchObject({ priceCents: 25050, currency: 'INR' });
    expect(Number.isInteger(dto?.priceCents)).toBe(true);
  });

  it('hides an inactive service from the public as NOT FOUND', async () => {
    const { service, prisma } = build();
    prisma.service.findFirst.mockResolvedValue(row({ active: false }));
    await expect(service.get(CUSTOMER, SALON_ID, SERVICE_ID)).rejects.toMatchObject({
      code: 'SERVICE_NOT_FOUND',
    });
  });

  it('creates with the VERIFIED route salonId and defaults active=true', async () => {
    const { service, prisma } = build();
    prisma.salonStaff.findFirst.mockResolvedValue({ role: 'owner' });
    prisma.service.create.mockResolvedValue(row());
    await service.create(OWNER, SALON_ID, {
      name: 'Haircut',
      priceCents: 20000,
      estimatedMinutes: 30,
    });
    expect(prisma.service.create).toHaveBeenCalledWith({
      data: {
        salonId: SALON_ID,
        name: 'Haircut',
        priceCents: 20000,
        estimatedMinutes: 30,
        active: true,
      },
    });
  });

  it('denies service creation to staff and to customers', async () => {
    const { service, prisma } = build();
    const input = { name: 'Perm', priceCents: 1, estimatedMinutes: 10 };
    prisma.salonStaff.findFirst.mockResolvedValue({ role: 'staff' });
    await expect(service.create(STAFF, SALON_ID, input)).rejects.toMatchObject({
      code: 'SALON_ACCESS_DENIED',
    });
    prisma.salonStaff.findFirst.mockResolvedValue(null);
    await expect(service.create(CUSTOMER, SALON_ID, input)).rejects.toMatchObject({
      code: 'SALON_ACCESS_DENIED',
    });
    expect(prisma.service.create).not.toHaveBeenCalled();
  });

  it('cannot touch a service that belongs to another salon', async () => {
    const { service, prisma } = build();
    prisma.salonStaff.findFirst.mockResolvedValue({ role: 'owner' });
    prisma.service.findFirst.mockResolvedValue(null); // lookup is (id AND salonId)
    await expect(
      service.update(OWNER, SALON_ID, SERVICE_ID, { priceCents: 1 }),
    ).rejects.toMatchObject({ code: 'SERVICE_NOT_FOUND' });
    expect(prisma.service.findFirst).toHaveBeenCalledWith({
      where: { id: SERVICE_ID, salonId: SALON_ID },
    });
    expect(prisma.service.update).not.toHaveBeenCalled();
  });

  it('updates only the provided fields (price and duration)', async () => {
    const { service, prisma } = build();
    prisma.salonStaff.findFirst.mockResolvedValue({ role: 'owner' });
    prisma.service.findFirst.mockResolvedValue(row());
    prisma.service.update.mockResolvedValue(row({ priceCents: 30000, estimatedMinutes: 45 }));
    await service.update(OWNER, SALON_ID, SERVICE_ID, { priceCents: 30000, estimatedMinutes: 45 });
    expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: SERVICE_ID },
      data: { priceCents: 30000, estimatedMinutes: 45 },
    });
  });

  it('DELETE deactivates (soft) rather than destroying history; admin may do so too', async () => {
    const { service, prisma } = build();
    prisma.service.findFirst.mockResolvedValue(row());
    prisma.service.update.mockResolvedValue(row({ active: false }));
    const result = await service.deactivate(ADMIN, SALON_ID, SERVICE_ID);
    expect(result.active).toBe(false);
    expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: SERVICE_ID },
      data: { active: false },
    });
  });
});
