import type { MascotState } from './states';

/**
 * Semantic application signals → mascot states. These signals are intentionally
 * generic (no queue/ETA/feature logic): a feature emits a signal, and the mapping is
 * deterministic here. Feature code must not reach into the mascot's internals.
 */
export type MascotSignal =
  | 'app_opened'
  | 'discovery_loading'
  | 'results_found'
  | 'service_selected'
  | 'in_queue'
  | 'queue_advanced'
  | 'delay_detected'
  | 'should_leave'
  | 'arrived'
  | 'service_in_progress'
  | 'service_finished'
  | 'session_done'
  | 'generic_success'
  | 'generic_warning'
  | 'generic_error';

const SIGNAL_MAP: Record<MascotSignal, MascotState> = {
  app_opened: 'greeting',
  discovery_loading: 'searching',
  results_found: 'finding',
  service_selected: 'idle',
  in_queue: 'waiting',
  queue_advanced: 'queue_moving',
  delay_detected: 'delayed',
  should_leave: 'leave_now',
  arrived: 'checked_in',
  service_in_progress: 'service_started',
  service_finished: 'completed',
  session_done: 'celebration',
  generic_success: 'success',
  generic_warning: 'warning',
  generic_error: 'error',
};

export const MASCOT_SIGNALS = Object.keys(SIGNAL_MAP) as MascotSignal[];

/** Deterministic application-signal → mascot-state mapping. */
export function mascotStateForSignal(signal: MascotSignal): MascotState {
  return SIGNAL_MAP[signal];
}
