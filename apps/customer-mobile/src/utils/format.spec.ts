import { formatDistance, formatPrice, formatDuration } from './format';

describe('formatDistance', () => {
  it('returns null for null input', () => {
    expect(formatDistance(null)).toBeNull();
  });

  it('formats meters below 1000 as "X m"', () => {
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(23.6)).toBe('24 m');
  });

  it('formats distances 1000+ as "X.X km"', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
    expect(formatDistance(1800)).toBe('1.8 km');
    expect(formatDistance(12345)).toBe('12.3 km');
  });
});

describe('formatPrice', () => {
  it('converts paise to ₹ rupees', () => {
    expect(formatPrice(20000)).toBe('₹200');
    expect(formatPrice(0)).toBe('₹0');
    expect(formatPrice(50)).toBe('₹0');
    expect(formatPrice(100)).toBe('₹1');
  });

  it('uses floor division, never shows floating point', () => {
    expect(formatPrice(15050)).toBe('₹150');
  });
});

describe('formatDuration', () => {
  it('formats minutes below 60', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(15)).toBe('15 min');
  });

  it('formats exact hours', () => {
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(120)).toBe('2 hr');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1 hr 30 min');
    expect(formatDuration(150)).toBe('2 hr 30 min');
  });
});
