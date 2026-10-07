import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import type { LiveQueueInfo, SalonDetailDto } from '@soliton/api-contract';
import { useSalonDetail } from '../../src/hooks/useSalonDetail';
import { useSalonReviews, useSalonRating } from '../../src/hooks/useReviews';
import { useLocation } from '../../src/hooks/useLocation';
import {
  openNavigation,
  formatDistanceMeters,
  estimateTravelRange,
  etaRange,
} from '../../src/services/location.service';

const MAROON = '#A50000';

type Tab = 'services' | 'about' | 'reviews';

function formatPrice(cents: number): string {
  return `₹${(cents / 100).toFixed(0)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function QueueSection({ salon }: { salon: SalonDetailDto }) {
  const router = useRouter();
  const q: LiveQueueInfo = salon.liveQueue;
  const isOpen = salon.openState === 'open';
  const isQueueOpen = isOpen && q.available;

  return (
    <View style={styles.queueSection}>
      <View style={styles.queueHeader}>
        <Text style={styles.queueTitle}>🎫 Live Queue</Text>
        <View style={[styles.queueStatusBadge, {
          backgroundColor: isQueueOpen ? '#E8F5E9' : '#F5F5F5',
        }]}>
          <Text style={[styles.queueStatusText, {
            color: isQueueOpen ? '#1B7A38' : '#8A8780',
          }]}>
            {isQueueOpen ? 'Open' : isOpen ? 'No queue data' : 'Closed'}
          </Text>
        </View>
      </View>

      {isQueueOpen && q.available ? (
        <View style={styles.queueStats}>
          <View style={styles.queueStat}>
            <Text style={styles.queueStatNum}>
              {q.currentToken !== null ? `#${q.currentToken}` : '—'}
            </Text>
            <Text style={styles.queueStatLabel}>Now serving</Text>
          </View>
          <View style={styles.queueDivider} />
          <View style={styles.queueStat}>
            <Text style={styles.queueStatNum}>{q.totalWaiting}</Text>
            <Text style={styles.queueStatLabel}>Waiting</Text>
          </View>
          <View style={styles.queueDivider} />
          <View style={styles.queueStat}>
            <Text style={styles.queueStatNum}>
              {q.etaMinutes !== null && q.etaMinutes > 0 ? etaRange(q.etaMinutes) : 'Now'}
            </Text>
            <Text style={styles.queueStatLabel}>Est. wait</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.queueUnavail}>
          {!isOpen
            ? 'Queue is closed.'
            : 'Live queue data unavailable right now.'}
        </Text>
      )}

      {isQueueOpen && (
        <Pressable
          style={styles.joinBtn}
          onPress={() => router.push('/booking/confirm')}
          accessibilityRole="button"
        >
          <Text style={styles.joinBtnText}>Join Queue</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.joinBtn, { backgroundColor: '#FFF', borderWidth: 2, borderColor: MAROON, marginTop: 8 }]}
        onPress={() => router.push(`/appointment/book/${salon.id}` as Href)}
        accessibilityRole="button"
      >
        <Text style={[styles.joinBtnText, { color: MAROON }]}>Book a Time</Text>
      </Pressable>
    </View>
  );
}

export default function SalonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('services');
  const [saved, setSaved] = useState(false);

  const { location } = useLocation();
  const { data: salon, isLoading, isError } = useSalonDetail(
    id ?? '',
    location ?? undefined,
  );
  const { data: salonRating } = useSalonRating(id ?? null);
  const { data: reviewsData } = useSalonReviews(id ?? null);

  if (isLoading || !salon) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={MAROON} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E1E1C' }}>Couldn't load salon</Text>
        <Text style={{ color: '#605E57', textAlign: 'center' }}>Check your connection and try again.</Text>
        <Pressable onPress={() => router.back()} style={styles.joinBtn}>
          <Text style={styles.joinBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const distLabel = formatDistanceMeters(salon.distanceMeters);
  const travelLabel = salon.distanceMeters != null && salon.distanceMeters > 0
    ? estimateTravelRange(salon.distanceMeters)
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {/* Hero image */}
        <View style={styles.heroContainer}>
          {salon.photoUrl ? (
            <Image source={{ uri: salon.photoUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: '#F0EDE8', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 60 }}>✂️</Text>
            </View>
          )}
          <View style={[styles.heroControls, { top: insets.top + 12 }]}>
            <Pressable style={styles.heroBtn} onPress={() => router.back()} accessibilityRole="button">
              <Text style={{ fontSize: 18, color: '#1E1E1C' }}>←</Text>
            </Pressable>
            <Pressable style={styles.heroBtn} onPress={() => setSaved((v) => !v)} accessibilityRole="button">
              <Text style={{ fontSize: 20 }}>{saved ? '❤️' : '🤍'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.nameRow}>
            <Text style={styles.salonName}>{salon.name}</Text>
            <View style={[styles.openBadge, {
              backgroundColor: salon.openState === 'open' ? '#E8F5E9' : '#F5F5F5',
            }]}>
              <Text style={[styles.openText, {
                color: salon.openState === 'open' ? '#1B7A38' : '#8A8780',
              }]}>
                {salon.openState === 'open' ? '● Open' : '● Closed'}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {(salonRating?.count ?? salon.rating?.count ?? 0) > 0 && (
              <>
                <Text style={styles.ratingText}>
                  ⭐ {(salonRating?.average ?? salon.rating?.average ?? 0).toFixed(1)}
                </Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>
                  {(salonRating?.count ?? salon.rating?.count ?? 0)} reviews
                </Text>
                <Text style={styles.metaDot}>·</Text>
              </>
            )}
            {distLabel ? (
              <Text style={styles.metaText}>📍 {distLabel}</Text>
            ) : null}
            {travelLabel ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>~{travelLabel} away</Text>
              </>
            ) : null}
          </View>

          {salon.address && (
            <Text style={styles.addressText}>{salon.address}{salon.city ? `, ${salon.city}` : ''}</Text>
          )}

          {/* Get Directions button */}
          <Pressable
            style={styles.directionsBtn}
            onPress={() => void openNavigation(salon.location, salon.name)}
            accessibilityRole="button"
          >
            <Text style={styles.directionsBtnText}>🗺 Get Directions</Text>
          </Pressable>
        </View>

        {/* Live Queue */}
        <QueueSection salon={salon} />

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(['services', 'reviews', 'about'] as Tab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Services */}
        {activeTab === 'services' && (
          <View style={styles.servicesList}>
            {salon.services.filter((s) => s.active).map((service) => (
              <View key={service.id} style={styles.serviceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDuration}>{formatDuration(service.estimatedMinutes)}</Text>
                </View>
                <View style={styles.serviceRight}>
                  <Text style={styles.servicePrice}>{formatPrice(service.priceCents)}</Text>
                  <Pressable
                    style={styles.bookBtn}
                    onPress={() => {
                      Alert.alert(
                        'Book Service',
                        `Book ${service.name} for ${formatPrice(service.priceCents)}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Book', onPress: () => router.push(`/appointment/book/${salon.id}` as Href) },
                        ],
                      );
                    }}
                  >
                    <Text style={styles.bookBtnText}>Book</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {salon.services.filter((s) => s.active).length === 0 && (
              <Text style={{ color: '#8A8780', textAlign: 'center', padding: 24 }}>No services listed yet.</Text>
            )}
          </View>
        )}

        {/* Reviews */}
        {activeTab === 'reviews' && (
          <View style={{ padding: 16 }}>
            {salonRating && salonRating.count > 0 ? (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 28, fontWeight: '700', color: '#1E1E1C' }}>
                  {salonRating.average.toFixed(1)} ★
                </Text>
                <Text style={{ color: '#605E57', marginBottom: 12 }}>
                  based on {salonRating.count} reviews
                </Text>
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = salonRating.distribution[star] ?? 0;
                  const pct = salonRating.count > 0 ? (count / salonRating.count) * 100 : 0;
                  return (
                    <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={{ width: 20, color: '#605E57' }}>{star}★</Text>
                      <View style={{ flex: 1, height: 8, backgroundColor: '#E9E3D6', borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#F7C65B', borderRadius: 4 }} />
                      </View>
                      <Text style={{ width: 24, color: '#605E57', textAlign: 'right' }}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#605E57', fontSize: 16, textAlign: 'center' }}>No reviews yet.</Text>
              </View>
            )}

            {reviewsData?.items.map((review) => (
              <View key={review.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#F7C65B', fontSize: 16 }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                  <Text style={{ color: '#605E57', fontSize: 12 }}>
                    {new Date(review.createdAt).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                {review.comment ? (
                  <Text style={{ color: '#1E1E1C' }}>"{review.comment}"</Text>
                ) : null}
                <Text style={{ color: '#605E57', fontSize: 12, marginTop: 4 }}>
                  — {review.customerName ?? 'Customer'}
                </Text>
              </View>
            ))}

            {(!reviewsData?.items.length && salonRating?.count === 0) && (
              <Text style={{ color: '#605E57', textAlign: 'center' }}>
                Be the first to share your experience.
              </Text>
            )}
          </View>
        )}

        {/* About */}
        {activeTab === 'about' && (
          <View style={styles.aboutSection}>
            {salon.address ? (
              <Text style={styles.aboutText}>
                📍 {salon.address}{salon.city ? `, ${salon.city}` : ''}
              </Text>
            ) : null}
            {salon.hours.configured ? (
              <View style={{ gap: 4 }}>
                <Text style={{ fontWeight: '700', color: '#1E1E1C', fontSize: 15 }}>Hours</Text>
                {salon.hours.days.filter((d) => d.isOpen).map((d) => {
                  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  return (
                    <Text key={d.weekday} style={styles.aboutText}>
                      {days[d.weekday]}: {d.openTime} – {d.closeTime}
                    </Text>
                  );
                })}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    height: 280,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  heroBtn: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 20,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salonName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1E1C',
    flex: 1,
  },
  openBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  openText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1E1C',
  },
  metaDot: {
    color: '#C0BBBB',
  },
  metaText: {
    fontSize: 13,
    color: '#8A8780',
  },
  addressText: {
    fontSize: 13,
    color: '#8A8780',
  },
  directionsBtn: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: MAROON,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  directionsBtnText: {
    color: MAROON,
    fontWeight: '700',
    fontSize: 14,
  },
  queueSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    gap: 12,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E1C',
  },
  queueStatusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  queueStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  queueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 16,
  },
  queueStat: {
    alignItems: 'center',
    gap: 2,
  },
  queueStatNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1E1C',
    fontVariant: ['tabular-nums'],
  },
  queueStatLabel: {
    fontSize: 12,
    color: '#8A8780',
  },
  queueDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E9E3D6',
  },
  queueUnavail: {
    fontSize: 14,
    color: '#8A8780',
    textAlign: 'center',
    paddingVertical: 8,
  },
  joinBtn: {
    backgroundColor: MAROON,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#F0EDE8',
    borderRadius: 14,
    padding: 4,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A8780',
  },
  tabTextActive: {
    color: MAROON,
  },
  servicesList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 2,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1E1C',
  },
  serviceDuration: {
    fontSize: 12,
    color: '#8A8780',
    marginTop: 2,
  },
  serviceRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: MAROON,
  },
  bookBtn: {
    backgroundColor: MAROON,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  aboutSection: {
    padding: 16,
    gap: 16,
  },
  aboutText: {
    fontSize: 15,
    color: '#605E57',
    lineHeight: 24,
  },
});
