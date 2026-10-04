/**
 * Puff mascot state model (platform-neutral). No feature/business logic lives here —
 * only the state vocabulary, labels, and a renderer-agnostic view model.
 */

export type MascotState =
  | 'greeting'
  | 'idle'
  | 'searching'
  | 'finding'
  | 'waiting'
  | 'queue_moving'
  | 'delayed'
  | 'leave_now'
  | 'checked_in'
  | 'service_started'
  | 'completed'
  | 'success'
  | 'warning'
  | 'error'
  | 'celebration';

export const MASCOT_STATES: readonly MascotState[] = [
  'greeting',
  'idle',
  'searching',
  'finding',
  'waiting',
  'queue_moving',
  'delayed',
  'leave_now',
  'checked_in',
  'service_started',
  'completed',
  'success',
  'warning',
  'error',
  'celebration',
];

/** Used when an unknown/invalid state is provided. */
export const FALLBACK_MASCOT_STATE: MascotState = 'idle';

export function isMascotState(value: unknown): value is MascotState {
  return typeof value === 'string' && (MASCOT_STATES as readonly string[]).includes(value);
}

/** Coerces any input to a valid MascotState, using the fallback when invalid. */
export function toMascotState(
  value: unknown,
  fallback: MascotState = FALLBACK_MASCOT_STATE,
): MascotState {
  return isMascotState(value) ? value : fallback;
}

export type MascotTone = 'neutral' | 'positive' | 'attention' | 'negative';

const LABELS: Record<MascotState, string> = {
  greeting: 'Puff is greeting you',
  idle: 'Puff is resting',
  searching: 'Puff is looking around',
  finding: 'Puff found options nearby',
  waiting: 'Puff is waiting with you',
  queue_moving: 'Puff says the line is moving',
  delayed: 'Puff says things are a little slower',
  leave_now: 'Puff says it is time to head over',
  checked_in: 'Puff says you are checked in',
  service_started: 'Puff says your service has started',
  completed: 'Puff says your service is complete',
  success: 'Puff is pleased',
  warning: 'Puff has a heads-up',
  error: 'Puff hit a snag',
  celebration: 'Puff is celebrating',
};

const TONES: Record<MascotState, MascotTone> = {
  greeting: 'neutral',
  idle: 'neutral',
  searching: 'neutral',
  finding: 'positive',
  waiting: 'neutral',
  queue_moving: 'positive',
  delayed: 'attention',
  leave_now: 'attention',
  checked_in: 'positive',
  service_started: 'neutral',
  completed: 'positive',
  success: 'positive',
  warning: 'attention',
  error: 'negative',
  celebration: 'positive',
};

// Placeholder glyphs — final Puff artwork (Rive/Lottie) replaces these later.
const GLYPHS: Record<MascotState, string> = {
  greeting: '🐦',
  idle: '🐦',
  searching: '🐦',
  finding: '🐦',
  waiting: '🐦',
  queue_moving: '🐦',
  delayed: '🐦',
  leave_now: '🐦',
  checked_in: '🐦',
  service_started: '🐦',
  completed: '🐦',
  success: '🐦',
  warning: '🐦',
  error: '🐦',
  celebration: '🎉',
};

/** Accessible label for a state (also the component's default accessibilityLabel). */
export function mascotLabel(state: MascotState): string {
  return LABELS[state];
}

/** Renderer-agnostic view model. Consuming apps render this; they never see the
 * underlying animation technology (Rive/Lottie/placeholder). */
export interface MascotView {
  readonly state: MascotState;
  readonly label: string;
  readonly glyph: string;
  readonly tone: MascotTone;
  readonly animated: boolean;
}

export interface MascotViewOptions {
  reducedMotion?: boolean;
  quietMode?: boolean;
  /** Overrides the default accessible label. */
  label?: string;
}

/** Resolves a state (+ options) into a renderer-agnostic view model. */
export function resolveMascotView(input: unknown, options: MascotViewOptions = {}): MascotView {
  const state = toMascotState(input);
  return {
    state,
    label: options.label ?? LABELS[state],
    glyph: GLYPHS[state],
    tone: TONES[state],
    animated: !(options.reducedMotion || options.quietMode),
  };
}
