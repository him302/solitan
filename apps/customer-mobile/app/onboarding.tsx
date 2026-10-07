import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
  StyleSheet,
  ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAROON = '#A50000';
const { width: W } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: '🗺️',
    headline: 'Find your perfect salon.',
    body: 'Discover trusted salons around you with real-time availability and reviews.',
  },
  {
    id: '2',
    icon: '⏱️',
    headline: 'Know your wait before you go.',
    body: 'See live queues and estimated waiting time — no surprises when you arrive.',
  },
  {
    id: '3',
    icon: '🎫',
    headline: 'Your time belongs to you.',
    body: 'Join the queue remotely. We\'ll let you know when it\'s your turn.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]) setCurrent(viewableItems[0].index ?? 0);
  });

  const next = () => {
    if (current < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: current + 1, animated: true });
    } else {
      router.replace('/login');
    }
  };

  const skip = () => router.replace('/login');

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      {/* Skip */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View />
        <Pressable onPress={skip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: W }]}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={styles.headline}>{item.headline}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === current && styles.dotActive]}
          />
        ))}
      </View>

      {/* CTA */}
      <Pressable
        onPress={next}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>
          {current === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  skipText: {
    fontSize: 15,
    color: '#8A8780',
    fontWeight: '500',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 20,
  },
  iconContainer: {
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
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E1E1C',
    textAlign: 'center',
    lineHeight: 34,
  },
  body: {
    fontSize: 16,
    color: '#605E57',
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0D8CE',
  },
  dotActive: {
    width: 24,
    backgroundColor: MAROON,
  },
  cta: {
    backgroundColor: MAROON,
    borderRadius: 28,
    paddingHorizontal: 48,
    paddingVertical: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
