import { LocalMapsProvider, MockMapsProvider, geoUri, geographicDistance } from './index';

const RAIPUR = { latitude: 21.2514, longitude: 81.6296 };

describe('geographicDistance (local haversine)', () => {
  it('is zero for the same point', () => {
    expect(geographicDistance(RAIPUR, RAIPUR).meters).toBe(0);
  });

  it('matches known distances and is labelled geographic (not travel time)', () => {
    // One degree of longitude on the equator is ~111.19 km.
    const oneDegree = geographicDistance(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    );
    expect(oneDegree.kind).toBe('geographic');
    expect(oneDegree.meters).toBeGreaterThan(111_000);
    expect(oneDegree.meters).toBeLessThan(111_400);

    // ~0.01 degrees of latitude north of Raipur is ~1.11 km.
    const north = geographicDistance(RAIPUR, { latitude: 21.2614, longitude: 81.6296 });
    expect(north.meters).toBeGreaterThan(1_090);
    expect(north.meters).toBeLessThan(1_130);
  });

  it('is symmetric', () => {
    const a = { latitude: 21.25, longitude: 81.63 };
    const b = { latitude: 19.07, longitude: 72.87 };
    expect(geographicDistance(a, b).meters).toBeCloseTo(geographicDistance(b, a).meters, 6);
  });
});

describe('geoUri', () => {
  it('builds a provider-neutral geo: URI in (lat, lng) order', () => {
    expect(geoUri(RAIPUR)).toBe('geo:21.2514,81.6296?q=21.2514,81.6296');
    expect(geoUri(RAIPUR, 'Glow Salon')).toBe(
      'geo:21.2514,81.6296?q=21.2514,81.6296(Glow%20Salon)',
    );
  });
});

describe('LocalMapsProvider (the only provider, and it is free)', () => {
  const realFetch = (globalThis as { fetch?: unknown }).fetch;
  const spy = jest.fn();
  beforeAll(() => {
    (globalThis as { fetch?: unknown }).fetch = spy;
  });
  afterAll(() => {
    (globalThis as { fetch?: unknown }).fetch = realFetch;
  });

  it('never makes a network request, whatever is asked of it', async () => {
    const local = new LocalMapsProvider();
    await local.geocode('MG Road Raipur');
    await local.searchNearby({ center: RAIPUR, radiusMeters: 1000 });
    await local.travelTimeSeconds({ origin: RAIPUR, destination: RAIPUR });
    local.calculateDistance(RAIPUR, RAIPUR);
    local.mapStyle();
    local.directionsUrl(RAIPUR);
    expect(spy).not.toHaveBeenCalled();
  });

  it('is enabled and computes straight-line distance locally', () => {
    const local = new LocalMapsProvider();
    expect(local.enabled).toBe(true);
    const result = local.calculateDistance(RAIPUR, { latitude: 21.2614, longitude: 81.6296 });
    expect(result.available && result.value.kind).toBe('geographic');
  });

  it('reports NOT_SUPPORTED honestly for geocoding, nearby places and travel time', async () => {
    const local = new LocalMapsProvider();
    expect(await local.geocode('x')).toEqual({ available: false, reason: 'NOT_SUPPORTED' });
    expect(await local.searchNearby({ center: RAIPUR, radiusMeters: 1 })).toEqual({
      available: false,
      reason: 'NOT_SUPPORTED',
    });
    expect(await local.travelTimeSeconds({ origin: RAIPUR, destination: RAIPUR })).toEqual({
      available: false,
      reason: 'NOT_SUPPORTED',
    });
  });

  it('draws on a blank canvas by default (no tile server is ever contacted)', () => {
    expect(new LocalMapsProvider().mapStyle()).toEqual({ kind: 'blank' });
  });

  it('uses an operator-supplied (e.g. self-hosted) tile template only when configured', () => {
    const style = new LocalMapsProvider({
      tileUrlTemplate: 'https://tiles.example.org/{z}/{x}/{y}.png',
      tileAttribution: '© OpenStreetMap contributors',
    }).mapStyle();
    expect(style).toMatchObject({
      kind: 'raster-tiles',
      urlTemplate: expect.stringContaining('{z}'),
    });
  });

  it("hands directions to the user's own maps app via a geo: URI (no web URL)", () => {
    const url = new LocalMapsProvider().directionsUrl(RAIPUR, 'Glow Salon');
    expect(url.startsWith('geo:')).toBe(true);
    expect(url).not.toMatch(/https?:/i);
  });
});

describe('MockMapsProvider', () => {
  it('only returns seeded data (never invents places)', async () => {
    const mock = new MockMapsProvider();
    expect(await mock.geocode('anything')).toEqual({ available: true, value: null });
    expect(await mock.searchNearby({ center: RAIPUR, radiusMeters: 1 })).toEqual({
      available: true,
      value: [],
    });
  });
});
