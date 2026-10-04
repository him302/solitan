import {
  createColorTokens,
  spacing,
  radius,
  borderWidth,
  iconSize,
  elevation,
  fontFamily,
  typeScale,
  motion,
  MIN_TOUCH_TARGET,
  type ColorScheme,
  type SemanticColors,
} from '@soliton/design-tokens';

export interface Theme {
  readonly scheme: ColorScheme;
  readonly colors: SemanticColors;
  readonly spacing: typeof spacing;
  readonly radius: typeof radius;
  readonly borderWidth: typeof borderWidth;
  readonly iconSize: typeof iconSize;
  readonly elevation: typeof elevation;
  readonly fontFamily: typeof fontFamily;
  readonly type: typeof typeScale;
  readonly motion: typeof motion;
  readonly minTouchTarget: number;
}

export interface CreateThemeOptions {
  readonly scheme: ColorScheme;
  /** Configurable brand accent (TBD). Falls back to the neutral placeholder. */
  readonly accent?: string;
}

/** Builds a {@link Theme} for a scheme and optional brand accent. Pure (no RN). */
export function createTheme({ scheme, accent }: CreateThemeOptions): Theme {
  return {
    scheme,
    colors: createColorTokens(accent)[scheme],
    spacing,
    radius,
    borderWidth,
    iconSize,
    elevation,
    fontFamily,
    type: typeScale,
    motion,
    minTouchTarget: MIN_TOUCH_TARGET,
  };
}
