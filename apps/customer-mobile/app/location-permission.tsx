import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { requestLocationPermission } from '../src/services/location.service';

const MAROON = '#A50000';

export default function LocationPermissionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function handleAllow() {
    const status = await requestLocationPermission();
    if (status === 'granted') {
      router.replace('/(tabs)');
    } else {
      router.replace('/(tabs)');
    }
  }

  function handleSkip() {
    router.replace('/(tabs)');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>📍</Text>
        </View>

        <Text style={styles.title}>Find salons near you</Text>
        <Text style={styles.body}>
          Share your location to see salons sorted by distance and get accurate travel estimates.
          Your location is never stored or shared.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.allowBtn, pressed && { opacity: 0.85 }]}
          onPress={() => void handleAllow()}
          accessibilityRole="button"
        >
          <Text style={styles.allowText}>Allow location access</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
          onPress={handleSkip}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 52,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E1E1C',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#605E57',
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
  allowBtn: {
    backgroundColor: MAROON,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  allowText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: '#8A8780',
    fontWeight: '500',
  },
});
