/**
 * @soliton/design-tokens
 *
 * Platform-neutral design tokens for the "Calm Momentum" system. Consumed by:
 *  - React Native (mobile) via the typed theme (see @soliton/ui `createTheme`)
 *  - Web (admin) via generated CSS variables (see `./css`)
 *
 * The brand accent is a configurable slot — no brand color (teal or otherwise) is
 * hardcoded. Status is conveyed by color + icon + label in components, never color alone.
 */

export type ColorScheme = 'light' | 'dark';

export interface SemanticColors {
  readonly bg: string;
  readonly surface: string;
  readonly surface2: string;
  readonly ink: string;
  readonly inkSoft: string;
  readonly line: string;
  /** Configurable primary brand accent (TBD — injected, never hardcoded). */
  readonly accent: string;
  readonly accentInk: string;
  /** Restrained emotional accents. */
  readonly peach: string;
  readonly warmYellow: string;
  /** Semantic status colors. */
  readonly success: string;
  readonly warning: string;
  readonly danger: string;
  readonly info: string;
}

/**
 * Placeholder accent used until the brand color is chosen. Deliberately a neutral
 * slate so no brand decision is implied. Replace via {@link createColorTokens}.
 */
export const PLACEHOLDER_ACCENT = '#4A4A4A';

/** Warm/white neutral base + dark readable text, per the approved direction. */
export function createColorTokens(
  accent: string = PLACEHOLDER_ACCENT,
): Record<ColorScheme, SemanticColors> {
  return {
    light: {
      bg: '#FBF8F1',
      surface: '#FFFFFF',
      surface2: '#F3EFE6',
      ink: '#1E1E1C',
      inkSoft: '#605E57',
      line: '#E9E3D6',
      accent,
      accentInk: '#FFFFFF',
      peach: '#FFB59E',
      warmYellow: '#F7C65B',
      success: '#1F7A38',
      warning: '#9A5B00',
      danger: '#B32430',
      info: '#1F56C4',
    },
    dark: {
      bg: '#121311',
      surface: '#1C1D1B',
      surface2: '#262724',
      ink: '#F4F2EC',
      inkSoft: '#B4B1A8',
      line: '#303230',
      accent,
      accentInk: '#06231F',
      peach: '#E8997F',
      warmYellow: '#E6B34A',
      success: '#55D07E',
      warning: '#F5A623',
      danger: '#F0707A',
      info: '#8FB4FF',
    },
  };
}

/** 4px spacing scale. */
export const spacing = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 48, s8: 64 } as const;

/** Corner radii. */
export const radius = { input: 12, button: 14, card: 20, sheet: 24, pill: 999 } as const;

/** Border widths. */
export const borderWidth = { hairline: 1, thick: 2 } as const;

/** Icon sizes (dp). */
export const iconSize = { sm: 16, md: 20, lg: 24, xl: 32 } as const;

/** Single soft elevation (flat identity — no stacked shadows). */
export const elevation = {
  none: { shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  low: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

/** Font families: Inter for UI, Noto Sans Devanagari for Hindi/script coverage. */
export const fontFamily = { ui: 'Inter', devanagari: 'NotoSansDevanagari' } as const;

export type FontWeight = '400' | '500' | '600' | '700';

export interface TypeStyle {
  readonly size: number;
  readonly line: number;
  readonly weight: FontWeight;
  /** Numeric styles use tabular figures so digits/timers do not jitter. */
  readonly tabular?: boolean;
}

/** Type scale: headings, body, labels, captions, buttons, numeric/ETA displays. */
export const typeScale = {
  display: { size: 34, line: 40, weight: '700' },
  title: { size: 24, line: 30, weight: '700' },
  section: { size: 18, line: 24, weight: '600' },
  body: { size: 16, line: 22, weight: '400' },
  label: { size: 14, line: 18, weight: '600' },
  caption: { size: 13, line: 16, weight: '500' },
  button: { size: 16, line: 20, weight: '600' },
  numeric: { size: 40, line: 44, weight: '700', tabular: true },
} as const satisfies Record<string, TypeStyle>;

/** Motion tokens (durations in ms). Honour reduced-motion via {@link resolveDurations}. */
export const motion = {
  duration: { fast: 120, base: 200, slow: 320 },
  easingStandard: [0.2, 0, 0, 1] as const,
} as const;

export interface MotionDurations {
  fast: number;
  base: number;
  slow: number;
}

/** Returns motion durations, collapsed to 0 when reduced motion is requested. */
export function resolveDurations(reducedMotion: boolean): MotionDurations {
  if (!reducedMotion) return { ...motion.duration };
  return { fast: 0, base: 0, slow: 0 };
}

/** Minimum accessible touch target (dp). */
export const MIN_TOUCH_TARGET = 44;

// ---------------- contrast utilities (used by accessibility token tests) ----------------

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb color. */
export function relativeLuminance(hex: string): number {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two #rrggbb colors (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}
