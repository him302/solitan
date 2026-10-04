import {
  createSalonSchema,
  createServiceSchema,
  discoveryQuerySchema,
  mapQuerySchema,
  putHoursSchema,
  updateSalonSchema,
  updateServiceSchema,
} from '@soliton/api-contract';
import { HttpStatus } from '@nestjs/common';
import { codeForIssues, ZodPipe, ZodQueryPipe } from '../../common/validation/zod.pipe';
import { ErrorCode } from '../../common/errors/error-codes';

const validSalon = {
  name: 'Glow Salon',
  address: 'MG Road, Raipur',
  city: 'Raipur',
  latitude: 21.2514,
  longitude: 81.6296,
};

const week = (days: Array<Record<string, unknown>>) => ({
  days: Array.from(
    { length: 7 },
    (_, weekday) => days.find((d) => d.weekday === weekday) ?? { weekday, isOpen: false },
  ),
});

describe('create/update salon contract', () => {
  it('accepts a valid salon and trims text', () => {
    const parsed = createSalonSchema.parse({ ...validSalon, name: '  Glow Salon  ' });
    expect(parsed.name).toBe('Glow Salon');
  });

  it.each([
    ['latitude above 90', { latitude: 91 }],
    ['latitude below -90', { latitude: -90.5 }],
    ['longitude above 180', { longitude: 180.1 }],
    ['longitude below -180', { longitude: -181 }],
    ['NaN latitude', { latitude: NaN }],
    ['string latitude', { latitude: '21.2' }],
  ])('rejects %s as an invalid location', (_label, patch) => {
    const result = createSalonSchema.safeParse({ ...validSalon, ...patch });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(codeForIssues(result.error.issues, ErrorCode.VALIDATION_ERROR)).toBe(
        'INVALID_LOCATION',
      );
    }
  });

  it('accepts boundary coordinates', () => {
    expect(
      createSalonSchema.safeParse({ ...validSalon, latitude: -90, longitude: 180 }).success,
    ).toBe(true);
  });

  it.each([['ownerId'], ['status'], ['queueStatus'], ['id'], ['role']])(
    'rejects mass-assigned field %s',
    (field) => {
      expect(createSalonSchema.safeParse({ ...validSalon, [field]: 'x' }).success).toBe(false);
      expect(updateSalonSchema.safeParse({ [field]: 'x' }).success).toBe(false);
    },
  );

  it('rejects non-http(s) photo URLs', () => {
    expect(
      createSalonSchema.safeParse({ ...validSalon, photoUrl: 'javascript:alert(1)' }).success,
    ).toBe(false);
    expect(
      createSalonSchema.safeParse({ ...validSalon, photoUrl: 'https://cdn.example.com/a.jpg' })
        .success,
    ).toBe(true);
  });

  it('update requires lat+lng together and at least one field', () => {
    expect(updateSalonSchema.safeParse({ latitude: 21 }).success).toBe(false);
    expect(updateSalonSchema.safeParse({ latitude: 21, longitude: 81 }).success).toBe(true);
    expect(updateSalonSchema.safeParse({}).success).toBe(false);
    expect(updateSalonSchema.safeParse({ photoUrl: null }).success).toBe(true);
  });
});

describe('operating hours contract', () => {
  const open = (weekday: number, openTime: string, closeTime: string) => ({
    weekday,
    isOpen: true,
    openTime,
    closeTime,
  });

  it('accepts a normal week and the documented example day', () => {
    expect(putHoursSchema.safeParse(week([open(1, '09:00', '20:00')])).success).toBe(true);
  });

  it('a closed day needs no times', () => {
    expect(putHoursSchema.safeParse(week([])).success).toBe(true);
  });

  it.each([
    ['opening == closing', open(1, '09:00', '09:00')],
    ['opening after closing', open(1, '20:00', '09:00')],
    ['bad HH:mm (25:00)', open(1, '25:00', '26:00')],
    ['bad HH:mm (9:00)', open(1, '9:00', '20:00')],
    ['open day without times', { weekday: 1, isOpen: true }],
  ])('rejects %s', (_label, day) => {
    expect(putHoursSchema.safeParse(week([day])).success).toBe(false);
  });

  it('requires exactly seven distinct weekdays 0-6', () => {
    expect(putHoursSchema.safeParse({ days: [] }).success).toBe(false);
    const dup = week([]);
    dup.days[6] = { weekday: 0, isOpen: false };
    expect(putHoursSchema.safeParse(dup).success).toBe(false);
    const bad = week([]);
    bad.days[0] = { weekday: 7, isOpen: false };
    expect(putHoursSchema.safeParse(bad).success).toBe(false);
  });
});

describe('service contract', () => {
  const valid = { name: 'Haircut', priceCents: 20000, estimatedMinutes: 30 };

  it('accepts valid services and trims the name', () => {
    expect(createServiceSchema.parse({ ...valid, name: '  Haircut ' }).name).toBe('Haircut');
  });

  it.each([
    ['negative price', { priceCents: -1 }, 'INVALID_PRICE'],
    ['fractional price (floats are not money)', { priceCents: 199.5 }, 'INVALID_PRICE'],
    ['absurd price', { priceCents: 99_999_999 }, 'INVALID_PRICE'],
    ['zero duration', { estimatedMinutes: 0 }, 'INVALID_DURATION'],
    ['fractional duration', { estimatedMinutes: 30.5 }, 'INVALID_DURATION'],
    ['duration over 8h', { estimatedMinutes: 481 }, 'INVALID_DURATION'],
  ])('rejects %s with %s', (_label, patch, expectedCode) => {
    const result = createServiceSchema.safeParse({ ...valid, ...patch });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(codeForIssues(result.error.issues, ErrorCode.INVALID_SERVICE)).toBe(expectedCode);
    }
  });

  it('allows a free service (price 0) but not an empty name', () => {
    expect(createServiceSchema.safeParse({ ...valid, priceCents: 0 }).success).toBe(true);
    expect(createServiceSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });

  it('rejects salonId and unknown fields on write', () => {
    expect(createServiceSchema.safeParse({ ...valid, salonId: 'x' }).success).toBe(false);
    expect(updateServiceSchema.safeParse({ salonId: 'x' }).success).toBe(false);
    expect(updateServiceSchema.safeParse({}).success).toBe(false);
    expect(updateServiceSchema.safeParse({ active: false }).success).toBe(true);
  });
});

describe('discovery query contract (bounded + safe)', () => {
  it('applies safe defaults', () => {
    const q = discoveryQuerySchema.parse({});
    expect(q).toMatchObject({ limit: 20, offset: 0 });
  });

  it('coerces numeric query strings', () => {
    const q = discoveryQuerySchema.parse({
      lat: '21.25',
      lng: '81.63',
      limit: '10',
      radiusKm: '5',
    });
    expect(q).toMatchObject({ lat: 21.25, lng: 81.63, limit: 10, radiusKm: 5 });
  });

  it.each([
    ['limit above the cap', { limit: '51' }],
    ['limit zero', { limit: '0' }],
    ['offset above the cap', { offset: '1001' }],
    ['lat without lng', { lat: '21' }],
    ['radius without a location', { radiusKm: '5' }],
    ['latitude out of range', { lat: '95', lng: '81' }],
    ['unknown sort (no "best"/"recommended")', { sort: 'best' }],
    ['unknown parameter', { personalised: '1' }],
  ])('rejects %s', (_label, query) => {
    expect(discoveryQuerySchema.safeParse(query).success).toBe(false);
  });

  it('the map query is bounded', () => {
    expect(mapQuerySchema.safeParse({ lat: '21', lng: '81', limit: '101' }).success).toBe(false);
    expect(mapQuerySchema.parse({ lat: '21', lng: '81' })).toMatchObject({
      radiusKm: 10,
      limit: 50,
    });
  });
});

describe('ZodPipe / ZodQueryPipe', () => {
  it('throws a DomainException with the mapped code, 400 status and field details', () => {
    const pipe = new ZodPipe(createSalonSchema);
    try {
      pipe.transform({ ...validSalon, latitude: 200 });
      throw new Error('expected to throw');
    } catch (error) {
      const exception = error as {
        code: string;
        getStatus: () => number;
        details: Array<{ path: string }>;
      };
      expect(exception.code).toBe('INVALID_LOCATION');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.details[0]?.path).toBe('latitude');
    }
  });

  it('uses the route fallback code when no field-specific code applies', () => {
    expect(() =>
      new ZodPipe(putHoursSchema, ErrorCode.INVALID_OPERATING_HOURS).transform({ days: [] }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_OPERATING_HOURS' }));
  });

  it('query pipe treats empty strings as absent instead of coercing them to 0', () => {
    const pipe = new ZodQueryPipe(discoveryQuerySchema, ErrorCode.INVALID_DISCOVERY_QUERY);
    expect(pipe.transform({ q: '', lat: '', lng: '', city: '' })).toMatchObject({
      limit: 20,
      offset: 0,
    });
    expect(pipe.transform({ q: '', lat: '', lng: '' })).not.toHaveProperty('lat');
  });
});
