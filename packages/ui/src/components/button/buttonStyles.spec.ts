import { createTheme } from '../../theme/createTheme';
import { resolveButtonStyle } from './buttonStyles';

const theme = createTheme({ scheme: 'light', accent: '#123456' });

describe('resolveButtonStyle', () => {
  it('fills the primary button with the brand accent', () => {
    const { container, label } = resolveButtonStyle(theme, 'primary');
    expect(container.backgroundColor).toBe('#123456');
    expect(label.color).toBe(theme.colors.accentInk);
  });

  it('renders the tertiary button transparent', () => {
    expect(resolveButtonStyle(theme, 'tertiary').container.backgroundColor).toBe('transparent');
  });

  it('dims when disabled and on press', () => {
    expect(resolveButtonStyle(theme, 'primary', { disabled: true }).container.opacity).toBe(0.5);
    expect(resolveButtonStyle(theme, 'primary', { pressed: true }).container.opacity).toBe(0.9);
  });

  it('respects the minimum touch target', () => {
    expect(resolveButtonStyle(theme, 'primary').container.minHeight).toBeGreaterThanOrEqual(44);
  });
});
