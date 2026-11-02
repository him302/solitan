import {
  buildTimeline,
  timelineTotal,
  scissorPath,
  bladeOpening,
  frayTeeth,
  weaveLines,
} from './choreography';

describe('splash timeline', () => {
  it('runs the full sequence in under three seconds', () => {
    // Part 4: establish the brand without making a cold start feel slow.
    const total = timelineTotal(buildTimeline(false));
    expect(total).toBeGreaterThan(1500);
    expect(total).toBeLessThan(3000);
  });

  it('collapses every movement under reduced motion but still shows the brand', () => {
    const t = buildTimeline(true);
    expect(t.clothSettle).toBe(0);
    expect(t.cutTravel).toBe(0);
    expect(t.separate).toBe(0);
    expect(t.logoIn).toBe(0);
    // Not zero: dropping straight to the home screen would read as a crash.
    expect(t.hold).toBeGreaterThan(0);
  });
});

describe('scissor path', () => {
  it('starts and ends off-screen so the blades never pop into view', () => {
    const { from, to } = scissorPath(400);
    expect(from).toBeLessThan(0);
    expect(to).toBeGreaterThan(400);
  });
});

describe('blade opening', () => {
  it('starts fully open', () => {
    expect(bladeOpening(0)).toBeCloseTo(1);
  });

  it('stays within 0..1 across the whole travel, and past either end', () => {
    for (let p = -0.5; p <= 1.5; p += 0.01) {
      const v = bladeOpening(p);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('snips repeatedly rather than opening once', () => {
    // Count direction changes across the travel; a single open/close would give one.
    const samples = Array.from({ length: 201 }, (_, i) => bladeOpening(i / 200, 6));
    let reversals = 0;
    for (let i = 2; i < samples.length; i += 1) {
      const prev = samples[i - 1] - samples[i - 2];
      const next = samples[i] - samples[i - 1];
      if (prev !== 0 && next !== 0 && Math.sign(prev) !== Math.sign(next)) reversals += 1;
    }
    expect(reversals).toBeGreaterThanOrEqual(10);
  });
});

describe('frayed cut edge', () => {
  it('is deterministic, so the two halves of the cut line up', () => {
    expect(frayTeeth(40)).toEqual(frayTeeth(40));
  });

  it('produces the requested number of threads within bounds', () => {
    const teeth = frayTeeth(64, 5);
    expect(teeth).toHaveLength(64);
    for (const h of teeth) {
      expect(h).toBeGreaterThanOrEqual(1);
      expect(h).toBeLessThanOrEqual(5);
    }
  });

  it('keeps most threads short so the edge reads as a clean cut', () => {
    const teeth = frayTeeth(200, 5);
    const short = teeth.filter((h) => h <= 2).length;
    expect(short / teeth.length).toBeGreaterThan(0.5);
  });

  it('handles a zero count', () => {
    expect(frayTeeth(0)).toEqual([]);
  });
});

describe('weave lines', () => {
  it('spaces lines strictly inside the cloth', () => {
    const lines = weaveLines(5);
    expect(lines).toHaveLength(5);
    for (const f of lines) {
      expect(f).toBeGreaterThan(0);
      expect(f).toBeLessThan(1);
    }
    expect([...lines].sort((a, b) => a - b)).toEqual(lines);
  });

  it('handles a zero count', () => {
    expect(weaveLines(0)).toEqual([]);
  });
});
