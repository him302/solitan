import {
  MASCOT_STATES,
  resolveMascotView,
  toMascotState,
  mascotLabel,
  type MascotState,
} from './states';

describe('mascot state model', () => {
  it('defines all 15 required states', () => {
    expect(MASCOT_STATES).toHaveLength(15);
    expect(MASCOT_STATES).toEqual(
      expect.arrayContaining<MascotState>([
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
      ]),
    );
  });

  it('state matrix: every state resolves to a renderable view with a label', () => {
    for (const state of MASCOT_STATES) {
      const view = resolveMascotView(state);
      expect(view.state).toBe(state);
      expect(view.label.length).toBeGreaterThan(0);
      expect(view.glyph.length).toBeGreaterThan(0);
      expect(mascotLabel(state).length).toBeGreaterThan(0);
    }
  });

  it('animates by default, and is static under reduced motion or quiet mode', () => {
    expect(resolveMascotView('waiting').animated).toBe(true);
    expect(resolveMascotView('waiting', { reducedMotion: true }).animated).toBe(false);
    expect(resolveMascotView('waiting', { quietMode: true }).animated).toBe(false);
  });

  it('honours a custom accessibility label', () => {
    expect(resolveMascotView('idle', { label: 'Custom' }).label).toBe('Custom');
  });

  it('falls back to idle for an invalid state', () => {
    expect(toMascotState('not_a_state')).toBe('idle');
    expect(resolveMascotView('not_a_state').state).toBe('idle');
    expect(toMascotState('waiting')).toBe('waiting');
  });
});
