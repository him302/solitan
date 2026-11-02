/**
 * Timing and geometry for the Solitan opening animation (cloth → scissor cut → screen
 * separation → logo). Kept free of React and react-native so the choreography can be
 * unit-tested without a renderer, and so the component file holds only view code.
 */

/** Durations in ms for each stage of the opening sequence. */
export interface SplashTimeline {
  /** Cloth holds still briefly so the fabric reads as fabric before anything moves. */
  readonly clothSettle: number;
  /** Scissors travelling across the screen, cutting as they go. */
  readonly cutTravel: number;
  /** The two halves parting to reveal the brand underneath. */
  readonly separate: number;
  /** Logo scaling in. */
  readonly logoIn: number;
  /** Logo held on screen to establish the brand. */
  readonly hold: number;
}

/** Wall-clock length of a timeline, used to schedule routing away from the splash. */
export function timelineTotal(t: SplashTimeline): number {
  return t.clothSettle + t.cutTravel + t.separate + t.logoIn + t.hold;
}

/**
 * The full sequence, or a near-instant one when the OS asks for reduced motion.
 *
 * Reduced motion keeps a short logo hold rather than collapsing to zero: skipping
 * straight to the home screen would make a cold start feel like a crash, and the brand
 * moment is the point of the screen. Nothing animates, so no vestibular trigger remains.
 */
export function buildTimeline(reducedMotion: boolean): SplashTimeline {
  if (reducedMotion) {
    return { clothSettle: 0, cutTravel: 0, separate: 0, logoIn: 0, hold: 600 };
  }
  return { clothSettle: 220, cutTravel: 900, separate: 460, logoIn: 420, hold: 620 };
}

/**
 * Horizontal travel of the scissors, in px, including a margin so the blades start and
 * finish just off-screen rather than popping into existence at the edge.
 */
export function scissorPath(screenWidth: number, overshoot = 56): { from: number; to: number } {
  return { from: -overshoot, to: screenWidth + overshoot };
}

/**
 * How open the blades are at a given point through the cut, as a 0..1 factor. Produces
 * repeated snips rather than one continuous opening, which is what makes the motion read
 * as cutting instead of sliding.
 *
 * @param progress 0..1 through the travel.
 * @param snips how many open/close cycles to perform across the full width.
 */
export function bladeOpening(progress: number, snips = 6): number {
  const clamped = Math.min(1, Math.max(0, progress));
  // cos gives 1 (open) at the start of each cycle and 0 (closed) halfway through.
  return (1 + Math.cos(clamped * snips * 2 * Math.PI)) / 2;
}

/**
 * Deterministic "cut thread" heights along the severed edge, in px.
 *
 * Deterministic on purpose: a fresh Math.random() per render would make the frayed edge
 * jitter between the top and bottom halves, which must line up as two sides of one cut.
 * A small LCG keeps it stable without pulling in a seeded-random dependency.
 */
export function frayTeeth(count: number, maxHeight = 5): number[] {
  if (count <= 0) return [];
  const teeth: number[] = [];
  let seed = 0x5f3759df;
  for (let i = 0; i < count; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    // Bias towards shorter threads so the edge reads as a clean cut with a few stray fibres.
    const unit = (seed % 1000) / 1000;
    teeth.push(1 + Math.round(unit * unit * (maxHeight - 1)));
  }
  return teeth;
}

/** Evenly spaced positions for the woven texture lines, as 0..1 fractions. */
export function weaveLines(count: number): number[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, i) => (i + 1) / (count + 1));
}
