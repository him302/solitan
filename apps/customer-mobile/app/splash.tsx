import { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const MAROON = '#A50000';
const WHITE = '#FFFFFF';
const WHITE_DIM = 'rgba(255,255,255,0.65)';

export default function SplashScreen() {
  const router = useRouter();

  // Phase 1: full screen fade in (bg is already maroon — this fades the logo group in)
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  // Phase 2: tagline fades in slightly after logo settles
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  // Phase 3: exit fade
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo fade + spring scale in
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 55,
          useNativeDriver: true,
        }),
      ]),
      // Tagline fades in while logo settles
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 300,
        delay: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // Hold
      Animated.delay(820),
      // Exit: fade out the whole screen
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.replace('/onboarding');
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <Animated.View style={[styles.content, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <View style={styles.logoMark}>
          <Text style={styles.logoSymbol}>✦</Text>
        </View>
        <Text style={styles.brandName}>SOLITAN</Text>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Skip the wait.{'\n'}Enjoy the service.
        </Animated.Text>
      </Animated.View>

      <Animated.Text style={[styles.footer, { opacity: logoOpacity }]}>
        Your neighbourhood salon, on demand.
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MAROON,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoSymbol: {
    fontSize: 36,
    color: MAROON,
  },
  brandName: {
    fontSize: 38,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: 7,
  },
  tagline: {
    fontSize: 18,
    color: WHITE_DIM,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '400',
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    fontSize: 13,
    color: WHITE_DIM,
    letterSpacing: 0.3,
  },
});
