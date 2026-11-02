import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { BRAND_MAROON, BRAND_WHITE } from '@soliton/design-tokens';
import { useReducedMotion } from '@soliton/ui';
import {
  bladeOpening,
  buildTimeline,
  frayTeeth,
  scissorPath,
  weaveLines,
} from './choreography';

/**
 * The Solitan opening animation: a maroon cloth is cut across the middle by a travelling
 * pair of scissors, the two halves part, and the wordmark is revealed underneath.
 *
 * Built entirely from react-native's own `Animated` and plain views — no Reanimated, no
 * SVG, no Lottie, no Skia. Every animated property is a transform or an opacity, so the
 * whole sequence runs on the native driver and never touches the JS thread per frame,
 * which is what keeps it smooth on mid-range Android hardware.
 *
 * It also never blocks startup: the caller renders this while session hydration and the
 * first data fetches run in parallel, and `onDone` fires when the animation finishes.
 */
export interface ScissorCutSplashProps {
  /** Called once the sequence completes (or immediately-ish under reduced motion). */
  onDone: () => void;
  /**
   * Render the revealed end state without animating. Used when the sequence has already
   * played this launch, so re-entering the entry route shows the brand while the session
   * is re-checked instead of cutting the cloth a second time.
   */
  skipAnimation?: boolean;
}

/** Number of woven texture lines drawn across the cloth. Static views, drawn once. */
const WEAVE_LINES = 14;

export function ScissorCutSplash({ onDone, skipAnimation = false }: ScissorCutSplashProps) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const timeline = useMemo(() => buildTimeline(reducedMotion), [reducedMotion]);

  const halfHeight = height / 2;

  // One driver for the cut (0 → 1 as the scissors cross), one for the parting of the
  // halves, and one for the logo. Separate values keep each stage independently eased.
  const cut = useRef(new Animated.Value(0)).current;
  const part = useRef(new Animated.Value(0)).current;
  const logo = useRef(new Animated.Value(0)).current;

  // Fired through a ref so a re-render (e.g. the reduced-motion setting resolving) cannot
  // schedule the callback twice.
  const done = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (done.current) return;
      done.current = true;
      onDone();
    };

    if (reducedMotion || skipAnimation) {
      // Show the revealed end state immediately. Reduced motion still holds briefly on
      // the brand; a repeat visit does not, since it is only covering a session re-check.
      cut.setValue(1);
      part.setValue(1);
      logo.setValue(1);
      const timer = setTimeout(finish, skipAnimation ? 0 : timeline.hold);
      return () => clearTimeout(timer);
    }

    const sequence = Animated.sequence([
      Animated.delay(timeline.clothSettle),
      // The cut itself. Linear: scissors move at a constant rate, as a hand would.
      Animated.timing(cut, {
        toValue: 1,
        duration: timeline.cutTravel,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      // The halves fall away. Accelerating, because gravity does not ease out.
      Animated.timing(part, {
        toValue: 1,
        duration: timeline.separate,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logo, {
        toValue: 1,
        duration: timeline.logoIn,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.delay(timeline.hold),
    ]);

    sequence.start(({ finished }) => {
      if (finished) finish();
    });

    return () => sequence.stop();
  }, [reducedMotion, skipAnimation, timeline, cut, part, logo, onDone]);

  // --- Derived animations -------------------------------------------------------------

  const { from, to } = scissorPath(width);

  const scissorX = cut.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  // The blades snip repeatedly across the travel. bladeOpening is sampled into
  // interpolation stops because Animated cannot call a JS function per frame on the
  // native driver.
  const snipStops = useMemo(() => {
    const stops = Array.from({ length: 61 }, (_, i) => i / 60);
    return {
      input: stops,
      upper: stops.map((p) => `${-(3 + bladeOpening(p) * 19)}deg`),
      lower: stops.map((p) => `${3 + bladeOpening(p) * 19}deg`),
    };
  }, []);

  const upperBladeRotate = cut.interpolate({
    inputRange: snipStops.input,
    outputRange: snipStops.upper,
  });
  const lowerBladeRotate = cut.interpolate({
    inputRange: snipStops.input,
    outputRange: snipStops.lower,
  });

  // The severed line grows left→right. Width cannot be animated on the native driver, so
  // a full-width view is scaled on X and shifted to keep it anchored to the left edge
  // (react-native has no transform-origin).
  const cutScaleX = cut.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] });
  const cutAnchorX = cut.interpolate({
    inputRange: [0, 1],
    outputRange: [-width / 2, 0],
  });

  const topTranslate = part.interpolate({ inputRange: [0, 1], outputRange: [0, -halfHeight] });
  const bottomTranslate = part.interpolate({ inputRange: [0, 1], outputRange: [0, halfHeight] });

  // A touch of rotation as each half leaves, so the cloth falls rather than slides.
  const topRotate = part.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-2.5deg'] });
  const bottomRotate = part.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '2deg'] });

  const logoScale = logo.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1] });

  const teeth = useMemo(() => frayTeeth(Math.max(8, Math.round(width / 7))), [width]);
  const weave = useMemo(() => weaveLines(WEAVE_LINES), []);

  return (
    <View style={styles.root} accessibilityLabel="Solitan" accessible>
      {/* Revealed underneath the cloth. */}
      <Animated.View style={[styles.reveal, { opacity: logo }]}>
        <Animated.View style={{ transform: [{ scale: logoScale }], alignItems: 'center' }}>
          <View style={styles.logoMark}>
            <Text style={styles.logoSymbol}>✦</Text>
          </View>
          <Text style={styles.wordmark}>SOLITAN</Text>
          <Text style={styles.tagline}>Skip the wait. Enjoy the service.</Text>
        </Animated.View>
      </Animated.View>

      {/* Upper half of the cloth. */}
      <Animated.View
        style={[
          styles.half,
          { top: 0, height: halfHeight },
          { transform: [{ translateY: topTranslate }, { rotate: topRotate }] },
        ]}
      >
        <Cloth weave={weave} />
        <View style={styles.fraySlotBottom}>
          {teeth.map((h, i) => (
            <View key={i} style={[styles.tooth, { height: h }]} />
          ))}
        </View>
      </Animated.View>

      {/* Lower half. The cloth inside is shifted up by half the screen so the weave reads
          as one continuous piece of fabric across the cut. */}
      <Animated.View
        style={[
          styles.half,
          { bottom: 0, height: halfHeight },
          { transform: [{ translateY: bottomTranslate }, { rotate: bottomRotate }] },
        ]}
      >
        <View style={styles.fraySlotTop}>
          {teeth.map((h, i) => (
            <View key={i} style={[styles.tooth, { height: h }]} />
          ))}
        </View>
        {/* Positioned explicitly at -halfHeight with a full-screen height, so the lower
            half shows the continuation of the same weave rather than a second copy of
            its top. Absolute rather than a negative flex margin: the intent is clearer
            and it does not depend on how Yoga resolves flex-basis against a negative
            margin. The parent clips it. */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: -halfHeight, height }}>
          <Cloth weave={weave} />
        </View>
      </Animated.View>

      {/* The cut: a dark seam that grows as the scissors pass, hidden once the halves
          part (it would otherwise float over the revealed logo). */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cutSeam,
          { top: halfHeight - 1, width },
          {
            opacity: part.interpolate({ inputRange: [0, 0.35], outputRange: [1, 0] }),
            transform: [{ translateX: cutAnchorX }, { scaleX: cutScaleX }],
          },
        ]}
      />

      {/* Scissors. Hidden once the cut completes. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.scissors,
          { top: halfHeight - SCISSOR_SIZE / 2 },
          {
            opacity: cut.interpolate({ inputRange: [0, 0.92, 1], outputRange: [1, 1, 0] }),
            transform: [{ translateX: scissorX }],
          },
        ]}
      >
        {/* Handles trail behind the blades. */}
        <View style={styles.handleColumn}>
          <View style={styles.handle} />
          <View style={styles.handle} />
        </View>
        <View style={styles.bladeColumn}>
          <Animated.View
            style={[styles.blade, { transform: [{ rotate: upperBladeRotate }] }]}
          />
          <Animated.View
            style={[styles.blade, { transform: [{ rotate: lowerBladeRotate }] }]}
          />
        </View>
        <View style={styles.pivot} />
      </Animated.View>
    </View>
  );
}

/** The fabric: flat maroon with faint woven lines, drawn once and never animated. */
function Cloth({ weave }: { weave: number[] }) {
  return (
    <View style={styles.cloth}>
      {weave.map((fraction) => (
        <View key={fraction} style={[styles.weaveLine, { top: `${fraction * 100}%` }]} />
      ))}
      {weave.map((fraction) => (
        <View key={`v${fraction}`} style={[styles.weaveLineVertical, { left: `${fraction * 100}%` }]} />
      ))}
    </View>
  );
}

const SCISSOR_SIZE = 46;
const BLADE_LENGTH = 30;

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND_WHITE,
    overflow: 'hidden',
  },
  reveal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_WHITE,
  },
  logoMark: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: BRAND_MAROON,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logoSymbol: { fontSize: 38, color: BRAND_WHITE },
  wordmark: {
    fontSize: 38,
    fontWeight: '800',
    color: BRAND_MAROON,
    letterSpacing: 7,
  },
  tagline: {
    marginTop: 10,
    fontSize: 15,
    color: '#605E57',
    letterSpacing: 0.2,
  },

  half: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  cloth: {
    flex: 1,
    backgroundColor: BRAND_MAROON,
    overflow: 'hidden',
  },
  weaveLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  weaveLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },

  // Rows of threads along each side of the cut.
  fraySlotBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  fraySlotTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  tooth: {
    flex: 1,
    backgroundColor: BRAND_MAROON,
  },

  cutSeam: {
    position: 'absolute',
    left: 0,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  scissors: {
    position: 'absolute',
    left: 0,
    width: SCISSOR_SIZE + BLADE_LENGTH,
    height: SCISSOR_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
  },
  handleColumn: {
    justifyContent: 'space-between',
    height: SCISSOR_SIZE * 0.78,
  },
  handle: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#F2E7E7',
    backgroundColor: 'transparent',
  },
  bladeColumn: {
    justifyContent: 'center',
    marginLeft: -2,
  },
  blade: {
    width: BLADE_LENGTH,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFF4F4',
    marginVertical: 1,
  },
  pivot: {
    position: 'absolute',
    left: 14,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F2E7E7',
  },
});
