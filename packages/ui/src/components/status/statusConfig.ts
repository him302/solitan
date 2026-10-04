import type { SemanticColors } from '@soliton/design-tokens';

export type StatusKind = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusVisual {
  /** Token color key. Color is NEVER the only signal — symbol + label accompany it. */
  colorKey: keyof SemanticColors;
  /** Placeholder glyph (real icons added with the icon set). */
  symbol: string;
  defaultLabel: string;
}

const MAP: Record<StatusKind, StatusVisual> = {
  success: { colorKey: 'success', symbol: '✓', defaultLabel: 'Success' },
  warning: { colorKey: 'warning', symbol: '!', defaultLabel: 'Warning' },
  danger: { colorKey: 'danger', symbol: '✕', defaultLabel: 'Error' },
  info: { colorKey: 'info', symbol: 'i', defaultLabel: 'Info' },
  neutral: { colorKey: 'inkSoft', symbol: '•', defaultLabel: 'Status' },
};

export function statusVisual(kind: StatusKind): StatusVisual {
  return MAP[kind];
}
