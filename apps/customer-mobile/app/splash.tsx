import { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const MAROON = '#A50000';

export default function SplashScreen() {
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logoMark}>
          <Text style={styles.logoSymbol}>✦</Text>
        </View>
        <Text style={styles.brandName}>SOLITAN</Text>
        <Text style={styles.tagline}>Skip the wait.{'\n'}Enjoy the service.</Text>
      </Animated.View>

      <Animated.Text style={[styles.footer, { opacity }]}>
        Your neighbourhood salon, on demand.
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: MAROON,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoSymbol: {
    fontSize: 32,
    color: '#FFFFFF',
  },
  brandName: {
    fontSize: 36,
    fontWeight: '800',
    color: MAROON,
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 18,
    color: '#605E57',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '400',
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    fontSize: 13,
    color: '#A0A0A0',
    letterSpacing: 0.3,
  },
});
