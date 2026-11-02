import {
  createColorTokens,
  spacing,
  resolveDurations,
  motion,
  contrastRatio,
  BRAND_MAROON,
  BRAND_MAROON_DARK,
  BRAND_WHITE,
} from './index';
import { generateTokensCss } from './css';

describe('design tokens', () => {
  it('has identical color keys in light and dark', () => {
    const { light, dark } = createColorTokens();
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort());
  });

  it('exposes a monotonically increasing spacing scale', () => {
    const values = Object.values(spacing);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('defaults to Solitan Royal Maroon', () => {
    expect(createColorTokens().light.accent).toBe(BRAND_MAROON);
    expect(BRAND_MAROON).toBe('#A50000');
    expect(BRAND_WHITE).toBe('#FFFFFF');
  });

  it('still accepts a custom accent for white-label deployments', () => {
    expect(createColorTokens('#123456').light.accent).toBe('#123456');
    // A single custom color applies to both schemes rather than silently pairing someone
    // else's brand with Solitan's dark maroon.
    expect(createColorTokens('#123456').dark.accent).toBe('#123456');
    expect(createColorTokens('#123456', '#654321').dark.accent).toBe('#654321');
  });

  it('lightens the accent for dark mode, because Royal Maroon is unreadable there', () => {
    const { dark } = createColorTokens();
    expect(dark.accent).toBe(BRAND_MAROON_DARK);
    // The reason this override exists — guards against anyone "simplifying" it away.
    expect(contrastRatio(BRAND_MAROON, dark.bg)).toBeLessThan(4.5);
    expect(contrastRatio(dark.accent, dark.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('meets WCAG AA contrast for primary and secondary text', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const c = createColorTokens()[scheme];
      expect(contrastRatio(c.ink, c.bg)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(c.inkSoft, c.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('meets WCAG AA contrast for the accent and for labels on top of it', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const c = createColorTokens()[scheme];
      // Accent used for icons, links and borders against both backdrops.
      expect(contrastRatio(c.accent, c.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.accent, c.surface)).toBeGreaterThanOrEqual(4.5);
      // Button labels sitting on a filled accent.
      expect(contrastRatio(c.accentInk, c.accent)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('collapses motion to zero under reduced motion', () => {
    expect(resolveDurations(false)).toEqual(motion.duration);
    expect(resolveDurations(true)).toEqual({ fast: 0, base: 0, slow: 0 });
  });
});

describe('CSS variable generation', () => {
  const cssText = generateTokensCss('#123456');

  it('emits color and scale variables', () => {
    expect(cssText).toContain('--color-bg:');
    expect(cssText).toContain('--color-accent: #123456;');
    expect(cssText).toContain('--space-s4: 16px;');
    expect(cssText).toContain('--radius-card: 20px;');
  });

  it('emits light defaults and dark overrides', () => {
    expect(cssText).toContain(':root {');
    expect(cssText).toContain('prefers-color-scheme: dark');
    expect(cssText).toContain("[data-theme='dark']");
  });
});
