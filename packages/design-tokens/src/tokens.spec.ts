import {
  createColorTokens,
  spacing,
  resolveDurations,
  motion,
  contrastRatio,
  PLACEHOLDER_ACCENT,
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

  it('injects a configurable accent (not locked to any brand color)', () => {
    expect(createColorTokens('#123456').light.accent).toBe('#123456');
    expect(createColorTokens().light.accent).toBe(PLACEHOLDER_ACCENT);
  });

  it('meets WCAG AA contrast for primary and secondary text', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const c = createColorTokens()[scheme];
      expect(contrastRatio(c.ink, c.bg)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(c.inkSoft, c.surface)).toBeGreaterThanOrEqual(4.5);
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
