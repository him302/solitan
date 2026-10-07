import { useState, useMemo } from 'react';
import {
  ActivityIndicator,
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
import type { DiscoverySalonDto, LiveQueueInfo } from '@soliton/api-contract';
import { useDiscovery } from '../../src/hooks/useDiscovery';
import { useLocation } from '../../src/hooks/useLocation';
import { formatDistanceMeters } from '../../src/services/location.service';

const MAROON = '#A50000';
const BG = '#FAFAFA';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function queueLabel(q: LiveQueueInfo): string {
  if (!q.available) return 'No queue info';
  if (q.etaMinutes === null || q.etaMinutes <= 0) return 'Join now';
  if (q.etaMinutes <= 5) return '≤5 min wait';
  if (q.etaMinutes <= 15) return `~${q.etaMinutes} min`;
  return `~${q.etaMinutes} min wait`;
}

function WaitBadge({ salon }: { salon: DiscoverySalonDto }) {
  const isOpen = salon.openState === 'open';
  const q = salon.liveQueue;
  const isAvailNow = isOpen && q.available && (q.etaMinutes === null || q.etaMinutes <= 5);
  const isClosed = salon.openState === 'closed' || salon.openState === 'unconfigured';

  const bg = isClosed ? '#F0F0F0'
    : isAvailNow ? '#E8F5E9'
    : q.available && q.etaMinutes !== null && q.etaMinutes > 30 ? '#FFF0F0'
    : '#FFF8E1';

  const color = isClosed ? '#8A8780'
    : isAvailNow ? '#1B7A38'
    : q.available && q.etaMinutes !== null && q.etaMinutes > 30 ? '#B32430'
    : '#7A5500';

  const label = isClosed ? 'Closed'
    : !isOpen ? 'Closed'
    : queueLabel(q);

  return (
    <View style={[styles.waitBadge, { backgroundColor: bg }]}>
      <View style={[styles.waitDot, { backgroundColor: color }]} />
      <Text style={[styles.waitText, { color }]}>{label}</Text>
    </View>
  );
}

function SalonCard({
  salon,
  onSave,
  saved,
}: {
  salon: DiscoverySalonDto;
  onSave: () => void;
  saved: boolean;
}) {
  const router = useRouter();
  const preview = salon.servicePreview.slice(0, 3).map((s) => s.name).join(' · ');

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/salon/${salon.id}`)}
      accessibilityRole="button"
    >
      <View style={styles.imageContainer}>
        {salon.photoUrl ? (
          <Image source={{ uri: salon.photoUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Text style={{ fontSize: 40 }}>✂️</Text>
          </View>
        )}
        <Pressable
          style={styles.saveBtn}
          onPress={onSave}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved' : 'Save salon'}
        >
          <Text style={{ fontSize: 20 }}>{saved ? '❤️' : '🤍'}</Text>
        </Pressable>
        {salon.rating && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐ {salon.rating.average.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.salonName} numberOfLines={1}>{salon.name}</Text>
          <WaitBadge salon={salon} />
        </View>

        {preview ? (
          <Text style={styles.tagsText} numberOfLines={1}>{preview}</Text>
        ) : null}

        <View style={[styles.cardRow, { marginTop: 10 }]}>
          {salon.distanceMeters != null && (
            <Text style={styles.distText}>
              📍 {formatDistanceMeters(salon.distanceMeters)}
            </Text>
          )}
          {salon.liveQueue.available && salon.liveQueue.totalWaiting > 0 && (
            <Text style={styles.queueInfo}>
              {salon.liveQueue.totalWaiting}{' '}
              {salon.liveQueue.totalWaiting === 1 ? 'person' : 'people'} waiting
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

function SectionRow({ salons, savedIds, onSave }: {
  salons: DiscoverySalonDto[];
  savedIds: Set<string>;
  onSave: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 4 }}
    >
      {salons.map((s) => (
        <View key={s.id} style={{ width: 280 }}>
          <SalonCard salon={s} saved={savedIds.has(s.id)} onSave={() => onSave(s.id)} />
        </View>
      ))}
    </ScrollView>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const { location, loading: locLoading } = useLocation();

  const filters = useMemo(() => ({
    q: query.trim() || undefined,
    lat: location?.latitude,
    lng: location?.longitude,
    radiusKm: location ? 10 : undefined,
    sort: 'nearest' as const,
    limit: 30,
  }), [query, location]);

  const { data, isLoading, isError, refetch } = useDiscovery(filters);
  const salons = data?.items ?? [];

  const availableNow = useMemo(
    () => salons.filter(
      (s) => s.openState === 'open' && s.liveQueue.available &&
        (s.liveQueue.etaMinutes === null || s.liveQueue.etaMinutes <= 5),
    ),
    [salons],
  );

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const showLoading = isLoading || locLoading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={salons}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Greeting + location */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{greeting()} 👋</Text>
                <Text style={styles.greetingSub}>Where do you want to go?</Text>
              </View>
              <View style={styles.locationChip}>
                <Text style={styles.locationText}>
                  {location ? '📍 Near you' : '📍 All salons'}
                </Text>
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
                {query.length > 0 && (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <Text style={{ fontSize: 16, color: '#8A8780' }}>✕</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Available Now section */}
            {!showLoading && availableNow.length > 0 && (
              <View style={styles.smartSection}>
                <View style={styles.sectionRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.availDot} />
                    <Text style={styles.sectionTitle}>Available Now</Text>
                  </View>
                  <Text style={styles.resultCount}>{availableNow.length} open</Text>
                </View>
                <SectionRow salons={availableNow} savedIds={savedIds} onSave={toggleSave} />
              </View>
            )}

            {/* Main section heading */}
            <View style={[styles.sectionRow, { paddingHorizontal: 20, marginTop: 12 }]}>
              <Text style={styles.sectionTitle}>
                {location ? 'Nearest Salons' : 'All Salons'}
              </Text>
              {!showLoading && (
                <Text style={styles.resultCount}>{salons.length} found</Text>
              )}
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
          showLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={MAROON} />
              <Text style={styles.emptyBody}>Finding salons…</Text>
            </View>
          ) : isError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyTitle}>Couldn't load salons</Text>
              <Text style={styles.emptyBody}>Check your connection and try again.</Text>
              <Pressable
                onPress={() => void refetch()}
                style={styles.retryBtn}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No salons found</Text>
              <Text style={styles.emptyBody}>Try a different search or check back later.</Text>
            </View>
          )
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
  smartSection: {
    marginBottom: 4,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  availDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1B7A38',
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
  cardImagePlaceholder: {
    backgroundColor: '#F0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
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
  retryBtn: {
    marginTop: 8,
    backgroundColor: MAROON,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
