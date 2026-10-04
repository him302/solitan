// @soliton/mascot — Puff mascot architecture (platform-neutral).
export {
  MASCOT_STATES,
  FALLBACK_MASCOT_STATE,
  isMascotState,
  toMascotState,
  mascotLabel,
  resolveMascotView,
  type MascotState,
  type MascotTone,
  type MascotView,
  type MascotViewOptions,
} from './states';

export { MASCOT_SIGNALS, mascotStateForSignal, type MascotSignal } from './mapping';

export { type MascotRenderProps, type MascotRenderer } from './renderer';
