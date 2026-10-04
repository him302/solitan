import { PLACEHOLDER_ACCENT } from '@soliton/design-tokens';
import { createTheme } from './createTheme';

describe('createTheme', () => {
  it('uses the neutral placeholder accent by default', () => {
    expect(createTheme({ scheme: 'light' }).colors.accent).toBe(PLACEHOLDER_ACCENT);
  });

  it('applies a configured brand accent', () => {
    expect(createTheme({ scheme: 'dark', accent: '#123456' }).colors.accent).toBe('#123456');
  });

  it('exposes a 44dp minimum touch target', () => {
    expect(createTheme({ scheme: 'light' }).minTouchTarget).toBe(44);
  });
});
