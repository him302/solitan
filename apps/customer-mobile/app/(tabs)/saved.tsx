import { useState } from 'react';
import { FlatList, Image, Pressable, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MOCK_SALONS, getWaitLabel, formatDistance, type MockSalon } from '../../src/data/mockSalons';

const MAROON = '#A50000';

const INITIAL_SAVED = ['1', '2', '5'];

function SavedCard({ salon, onRemove }: { salon: MockSalon; onRemove: () => void }) {
  const router = useRouter();
  const waitLabel = getWaitLabel(salon);

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/salon/${salon.id}`)}
      accessibilityRole="button"
    >
      <Image source={{ uri: salon.photoUrl }} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardBody}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{salon.name}</Text>
          <Pressable onPress={onRemove} hitSlop={8}>
            <Text style={{ fontSize: 20 }}>❤️</Text>
          </Pressable>
        </View>
        <Text style={styles.meta}>⭐ {salon.rating.average} · {formatDistance(salon.distanceMeters)}</Text>
        <Text style={styles.tags} numberOfLines={1}>{salon.tags.join(' · ')}</Text>
        <View style={styles.bottomRow}>
          <View style={styles.waitPill}>
            <View style={[styles.dot, { backgroundColor: salon.openState === 'open' ? '#1B7A38' : '#8A8780' }]} />
            <Text style={[styles.waitText, { color: salon.openState === 'open' ? '#1B7A38' : '#8A8780' }]}>
              {waitLabel}
            </Text>
          </View>
          <Pressable
            style={styles.viewBtn}
            onPress={() => router.push(`/salon/${salon.id}`)}
          >
            <Text style={styles.viewBtnText}>View</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const [savedIds, setSavedIds] = useState<string[]>(INITIAL_SAVED);

  const savedSalons = MOCK_SALONS.filter((s) => savedIds.includes(s.id));

  const remove = (id: string) => setSavedIds((prev) => prev.filter((i) => i !== id));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Saved Salons</Text>
        <Text style={styles.count}>{savedSalons.length}</Text>
      </View>

      <FlatList
        data={savedSalons}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SavedCard salon={item} onRemove={() => remove(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🤍</Text>
            <Text style={styles.emptyTitle}>No saved salons yet</Text>
            <Text style={styles.emptyBody}>
              Save salons you love and find them here anytime.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E1E1C',
  },
  count: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: MAROON,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardBody: {
    padding: 14,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E1C',
    flex: 1,
    marginRight: 8,
  },
  meta: {
    fontSize: 13,
    color: '#8A8780',
  },
  tags: {
    fontSize: 13,
    color: '#8A8780',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  waitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  waitText: {
    fontSize: 12,
    fontWeight: '700',
  },
  viewBtn: {
    backgroundColor: MAROON,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 52,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1C',
  },
  emptyBody: {
    fontSize: 14,
    color: '#8A8780',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
