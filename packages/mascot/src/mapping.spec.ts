import { MASCOT_SIGNALS, mascotStateForSignal } from './mapping';
import { isMascotState } from './states';

describe('application-signal → mascot-state mapping', () => {
  it('maps every signal to a valid mascot state', () => {
    for (const signal of MASCOT_SIGNALS) {
      expect(isMascotState(mascotStateForSignal(signal))).toBe(true);
    }
  });

  it('is deterministic', () => {
    for (const signal of MASCOT_SIGNALS) {
      expect(mascotStateForSignal(signal)).toBe(mascotStateForSignal(signal));
    }
  });

  it('matches the documented examples', () => {
    expect(mascotStateForSignal('discovery_loading')).toBe('searching');
    expect(mascotStateForSignal('queue_advanced')).toBe('queue_moving');
    expect(mascotStateForSignal('delay_detected')).toBe('delayed');
    expect(mascotStateForSignal('should_leave')).toBe('leave_now');
    expect(mascotStateForSignal('service_in_progress')).toBe('service_started');
    expect(mascotStateForSignal('session_done')).toBe('celebration');
  });
});
