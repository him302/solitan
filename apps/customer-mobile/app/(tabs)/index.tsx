import { useState, useMemo } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  MOCK_SALONS,
  SERVICE_CATEGORIES,
  filterSalonsByCategory,
  getWaitLabel,
  formatDistance,
  type MockSalon,
} from '../../src/data/mockSalons';

const MAROON = '#A50000';
const BG = '#FAFAFA';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function WaitBadge({ salon }: { salon: MockSalon }) {
  const label = getWaitLabel(salon);
  const isAvail = salon.openState === 'open' && salon.etaMinutes !== null && salon.etaMinutes <= 5;
  const isClosed = salon.openState === 'closed';
  const isPaused = salon.queueStatus === 'paused';

  const bg = isClosed ? '#F0F0F0'
    : isPaused ? '#FFF3CD'
    : isAvail ? '#E8F5E9'
    : salon.etaMinutes !== null && salon.etaMinutes > 30 ? '#FFF0F0'
    : '#FFF8E1';

  const color = isClosed ? '#8A8780'
    : isPaused ? '#9A5B00'
    : isAvail ? '#1B7A38'
    : salon.etaMinutes !== null && salon.etaMinutes > 30 ? '#B32430'
    : '#7A5500';

  return (
    <View style={[styles.waitBadge, { backgroundColor: bg }]}>
      <View style={[styles.waitDot, { backgroundColor: color }]} />
      <Text style={[styles.waitText, { color }]}>{label}</Text>
    </View>
  );
}

function SalonCard({ salon, onSave, saved }: { salon: MockSalon; onSave: () => void; saved: boolean }) {
  const router = useRouter();
  const tags = salon.tags.slice(0, 3).join(' · ');

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/salon/${salon.id}`)}
      accessibilityRole="button"
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: salon.photoUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        {/* Save button */}
        <Pressable
          style={styles.saveBtn}
          onPress={onSave}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved' : 'Save salon'}
        >
          <Text style={{ fontSize: 20 }}>{saved ? '❤️' : '🤍'}</Text>
        </Pressable>
        {/* Rating badge */}
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>⭐ {salon.rating.average}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.salonName} numberOfLines={1}>{salon.name}</Text>
          <WaitBadge salon={salon} />
        </View>

        <Text style={styles.tagsText} numberOfLines={1}>{tags}</Text>

        <View style={[styles.cardRow, { marginTop: 10 }]}>
          <Text style={styles.distText}>
            📍 {formatDistance(salon.distanceMeters)}
          </Text>
          {salon.openState === 'open' && salon.totalWaiting > 0 && (
            <Text style={styles.queueInfo}>
              {salon.totalWaiting} {salon.totalWaiting === 1 ? 'person' : 'people'} waiting
            </Text>
          )}
        </View>

        <Pressable
          style={styles.viewBtn}
          onPress={() => router.push(`/salon/${salon.id}`)}
          accessibilityRole="button"
        >
          <Text style={styles.viewBtnText}>View Salon</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = filterSalonsByCategory(MOCK_SALONS, activeCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)) ||
          s.city.toLowerCase().includes(q),
      );
    }
    return list;
  }, [query, activeCategory]);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const availableNow = MOCK_SALONS.filter(
    (s) => s.openState === 'open' && (s.etaMinutes === null || s.etaMinutes <= 5),
  ).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Greeting */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{greeting()} 👋</Text>
                <Text style={styles.greetingSub}>Where do you want to go?</Text>
              </View>
              <View style={styles.locationChip}>
                <Text style={styles.locationText}>📍 Ambarnath</Text>
              </View>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search salons, services..."
                  placeholderTextColor="#B0ADA8"
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                />
              </View>
            </View>

            {/* Categories */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {SERVICE_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    activeCategory === cat.id && styles.categoryPillActive,
                  ]}
                  onPress={() => setActiveCategory(cat.id)}
                  accessibilityRole="button"
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      activeCategory === cat.id && styles.categoryLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Quick availability banner */}
            {availableNow > 0 && (
              <View style={styles.availBanner}>
                <View style={styles.availDot} />
                <Text style={styles.availText}>
                  {availableNow} salon{availableNow > 1 ? 's' : ''} available right now
                </Text>
              </View>
            )}

            {/* Section heading */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>
                {activeCategory === 'all' ? 'Nearby Salons' : `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Salons`}
              </Text>
              <Text style={styles.resultCount}>{filtered.length} found</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <SalonCard
            salon={item}
            saved={savedIds.has(item.id)}
            onSave={() => toggleSave(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No salons found</Text>
            <Text style={styles.emptyBody}>Try a different search or category</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  listContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E1E1C',
  },
  greetingSub: {
    fontSize: 14,
    color: '#605E57',
    marginTop: 2,
  },
  locationChip: {
    borderWidth: 1,
    borderColor: '#E0D8CE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  locationText: {
    fontSize: 13,
    color: MAROON,
    fontWeight: '600',
  },
  searchRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E9E3D6',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E1E1C',
  },
  categoryRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0D8CE',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  categoryPillActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  categoryIcon: {
    fontSize: 15,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#605E57',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  availBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  availDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1B7A38',
  },
  availText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B7A38',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1C',
  },
  resultCount: {
    fontSize: 13,
    color: '#8A8780',
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  imageContainer: {
    height: 190,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  saveBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salonName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1E1C',
    flex: 1,
    marginRight: 8,
  },
  waitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  waitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  waitText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tagsText: {
    fontSize: 13,
    color: '#8A8780',
    marginTop: 4,
  },
  distText: {
    fontSize: 13,
    color: '#8A8780',
  },
  queueInfo: {
    fontSize: 12,
    color: '#8A8780',
  },
  viewBtn: {
    marginTop: 14,
    backgroundColor: MAROON,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1C',
  },
  emptyBody: {
    fontSize: 14,
    color: '#8A8780',
  },
});
