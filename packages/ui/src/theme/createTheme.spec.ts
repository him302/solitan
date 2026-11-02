import { BRAND_MAROON, BRAND_MAROON_DARK } from '@soliton/design-tokens';
import { createTheme } from './createTheme';

describe('createTheme', () => {
  it('uses Solitan Royal Maroon by default', () => {
    expect(createTheme({ scheme: 'light' }).colors.accent).toBe(BRAND_MAROON);
  });

  it('uses the lightened maroon in dark mode, where Royal Maroon is unreadable', () => {
    expect(createTheme({ scheme: 'dark' }).colors.accent).toBe(BRAND_MAROON_DARK);
  });

  it('applies a configured brand accent', () => {
    expect(createTheme({ scheme: 'dark', accent: '#123456' }).colors.accent).toBe('#123456');
  });

  it('exposes a 44dp minimum touch target', () => {
    expect(createTheme({ scheme: 'light' }).minTouchTarget).toBe(44);
  });
});
