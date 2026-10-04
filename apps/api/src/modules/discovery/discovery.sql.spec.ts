import { discoveryQuerySchema, type DiscoveryQuery } from '@soliton/api-contract';
import {
  buildDiscoveryQuery,
  buildMapQuery,
  buildSearchPattern,
  resolveSort,
} from './discovery.sql';

const query = (raw: Record<string, unknown> = {}): DiscoveryQuery =>
  discoveryQuerySchema.parse(raw);

describe('buildSearchPattern', () => {
  it('wraps as contains and escapes LIKE wildcards so input matches literally', () => {
    expect(buildSearchPattern('hair')).toBe('%hair%');
    expect(buildSearchPattern('100%')).toBe('%100\\%%');
    expect(buildSearchPattern('a_b')).toBe('%a\\_b%');
    expect(buildSearchPattern('c:\\x')).toBe('%c:\\\\x%');
  });
});

describe('resolveSort', () => {
  it('defaults to nearest when coordinates exist, else name', () => {
    expect(resolveSort(query({ lat: '21.2', lng: '81.6' }))).toBe('nearest');
    expect(resolveSort(query())).toBe('name');
  });

  it('honours an explicit name sort even with coordinates', () => {
    expect(resolveSort(query({ lat: '21.2', lng: '81.6', sort: 'name' }))).toBe('name');
  });

  it('falls back from nearest to name when there are no coordinates', () => {
    expect(resolveSort(query({ sort: 'nearest' }))).toBe('name');
  });
});

describe('buildDiscoveryQuery (PostGIS SQL)', () => {
  it('only ever selects ACTIVE, located salons', () => {
    const sql = buildDiscoveryQuery(query(), 'name');
    expect(sql.sql).toContain(`s."status" = 'active'`);
    expect(sql.sql).toContain('s."geom" IS NOT NULL');
  });

  it('computes authoritative geography distance with (lng, lat) point order and sorts by it', () => {
    const q = query({ lat: '21.2514', lng: '81.6296' });
    const sql = buildDiscoveryQuery(q, 'nearest');
    expect(sql.sql).toContain('ST_Distance(s."geom"');
    expect(sql.sql).toContain('ST_MakePoint(');
    expect(sql.sql).toMatch(/ORDER BY distance_m ASC/);
    // ST_MakePoint(X=lng, Y=lat): the first coordinate bound is the longitude.
    expect(sql.values.slice(0, 2)).toEqual([81.6296, 21.2514]);
  });

  it('has no distance column or radius filter without coordinates', () => {
    const sql = buildDiscoveryQuery(query(), 'name');
    expect(sql.sql).toContain('NULL::double precision AS distance_m');
    expect(sql.sql).not.toContain('ST_DWithin');
    expect(sql.sql).toMatch(/ORDER BY s\."name" ASC, s\."id" ASC/);
  });

  it('applies a metre radius via ST_DWithin', () => {
    const sql = buildDiscoveryQuery(query({ lat: '21', lng: '81', radiusKm: '5' }), 'nearest');
    expect(sql.sql).toContain('ST_DWithin(s."geom"');
    expect(sql.values).toContain(5000);
  });

  it('searches salon name OR active service name, parameterised (no string interpolation)', () => {
    const sql = buildDiscoveryQuery(query({ q: "x'; DROP TABLE salons;--" }), 'name');
    expect(sql.sql).toContain('s."name" ILIKE');
    expect(sql.sql).toContain('EXISTS');
    expect(sql.sql).toContain('sv."active" = true');
    expect(sql.sql).not.toContain('DROP TABLE');
    expect(sql.values).toContain(`%x'; DROP TABLE salons;--%`);
  });

  it('filters city/locality against city OR address', () => {
    const sql = buildDiscoveryQuery(query({ city: 'Raipur' }), 'name');
    expect(sql.sql).toContain('s."city" ILIKE');
    expect(sql.sql).toContain('s."address" ILIKE');
  });

  it('paginates with limit+1 lookahead and an offset', () => {
    const sql = buildDiscoveryQuery(query({ limit: '10', offset: '20' }), 'name');
    expect(sql.sql).toContain('LIMIT');
    expect(sql.values.slice(-2)).toEqual([11, 20]);
  });

  it('never ranks by "best"/"recommended": ordering is distance or name only', () => {
    const sql = buildDiscoveryQuery(query({ lat: '21', lng: '81' }), 'nearest').sql;
    expect(sql).not.toMatch(/score|rank|recommend|best/i);
  });
});

describe('buildMapQuery', () => {
  it('is radius- and count-bounded, nearest first', () => {
    const sql = buildMapQuery({ lat: 21.25, lng: 81.63, radiusKm: 10, limit: 50 });
    expect(sql.sql).toContain('ST_DWithin');
    expect(sql.sql).toContain('LIMIT');
    expect(sql.sql).toContain(`s."status" = 'active'`);
    expect(sql.values).toEqual(expect.arrayContaining([10000, 50]));
  });
});
