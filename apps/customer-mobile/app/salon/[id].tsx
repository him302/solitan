import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MOCK_SALONS, formatPrice, formatDistance, type MockSalon } from '../../src/data/mockSalons';

const MAROON = '#A50000';

type Tab = 'services' | 'about';

function QueueSection({ salon }: { salon: MockSalon }) {
  const router = useRouter();
  const isOpen = salon.openState === 'open' && salon.queueStatus === 'open';
  const isPaused = salon.queueStatus === 'paused';
  const isClosed = salon.openState === 'closed' || salon.queueStatus === 'closed';

  return (
    <View style={styles.queueSection}>
      <View style={styles.queueHeader}>
        <Text style={styles.queueTitle}>🎫 Live Queue</Text>
        <View style={[styles.queueStatusBadge, {
          backgroundColor: isOpen ? '#E8F5E9' : isPaused ? '#FFF3CD' : '#F5F5F5',
        }]}>
          <Text style={[styles.queueStatusText, {
            color: isOpen ? '#1B7A38' : isPaused ? '#9A5B00' : '#8A8780',
          }]}>
            {isOpen ? 'Open' : isPaused ? 'Paused' : 'Closed'}
          </Text>
        </View>
      </View>

      {isOpen && salon.currentToken !== null ? (
        <View style={styles.queueStats}>
          <View style={styles.queueStat}>
            <Text style={styles.queueStatNum}>#{salon.currentToken}</Text>
            <Text style={styles.queueStatLabel}>Now serving</Text>
          </View>
          <View style={styles.queueDivider} />
          <View style={styles.queueStat}>
            <Text style={styles.queueStatNum}>{salon.totalWaiting}</Text>
            <Text style={styles.queueStatLabel}>Waiting</Text>
          </View>
          <View style={styles.queueDivider} />
          <View style={styles.queueStat}>
            <Text style={styles.queueStatNum}>
              {salon.etaMinutes !== null ? `~${salon.etaMinutes}m` : '—'}
            </Text>
            <Text style={styles.queueStatLabel}>Est. wait</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.queueUnavail}>
          {isClosed ? 'Queue is closed. Opens tomorrow at 10:00 AM.' : 'Queue temporarily paused.'}
        </Text>
      )}

      {isOpen && (
        <Pressable
          style={styles.joinBtn}
          onPress={() => router.push('/booking/confirm')}
          accessibilityRole="button"
        >
          <Text style={styles.joinBtnText}>Join Queue</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function SalonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('services');
  const [saved, setSaved] = useState(false);

  const salon = MOCK_SALONS.find((s) => s.id === id) ?? MOCK_SALONS[0];

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {/* Hero image */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: salon.photoUrl }} style={styles.heroImage} resizeMode="cover" />
          {/* Overlay controls */}
          <View style={[styles.heroControls, { top: insets.top + 12 }]}>
            <Pressable style={styles.heroBtn} onPress={() => router.back()}>
              <Text style={{ fontSize: 18, color: '#1E1E1C' }}>←</Text>
            </Pressable>
            <Pressable style={styles.heroBtn} onPress={() => setSaved((v) => !v)}>
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
            <Text style={styles.ratingText}>⭐ {salon.rating.average}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{salon.rating.count} reviews</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>📍 {formatDistance(salon.distanceMeters)}</Text>
          </View>

          <Text style={styles.addressText}>{salon.address}, {salon.city}</Text>
        </View>

        {/* Live Queue */}
        <QueueSection salon={salon} />

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(['services', 'about'] as Tab[]).map((tab) => (
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
            {salon.services.map((service) => (
              <View key={service.id} style={styles.serviceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDuration}>{service.estimatedMinutes} min</Text>
                </View>
                <View style={styles.serviceRight}>
                  <Text style={styles.servicePrice}>{formatPrice(service.priceCents)}</Text>
                  <Pressable
                    style={styles.bookBtn}
                    onPress={() => {
                      Alert.alert('Book Service', `Book ${service.name} for ${formatPrice(service.priceCents)}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Book', onPress: () => router.push('/booking/confirm') },
                      ]);
                    }}
                  >
                    <Text style={styles.bookBtnText}>Book</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* About */}
        {activeTab === 'about' && (
          <View style={styles.aboutSection}>
            <Text style={styles.aboutText}>{salon.about}</Text>
            <View style={styles.tagsWrap}>
              {salon.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
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
    fontSize: 24,
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
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    borderWidth: 1.5,
    borderColor: MAROON,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tagText: {
    color: MAROON,
    fontSize: 13,
    fontWeight: '600',
  },
});
