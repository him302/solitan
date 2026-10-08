import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme, Card, LoadingState, ErrorState } from '@soliton/ui';
import type { QueueEntryDto, SalonAnnouncementDto } from '@soliton/api-contract';
import { useBooking, useCancelBooking, BOOKINGS_KEY } from '../../src/hooks/useBookings';
import { useEntryRealtime } from '../../src/hooks/useEntryRealtime';
import { useQueryClient } from '@tanstack/react-query';
import { useMarkArrived, useReportLate, useAnnouncements, useSalonQueue } from '../../src/hooks/useQueue';
import { useLocation } from '../../src/hooks/useLocation';
import { useSalonDetail } from '../../src/hooks/useSalonDetail';
import { formatDuration, formatPrice } from '../../src/utils/format';
import {
  etaRange as etaRangeLabel,
  travelMinutes,
  leaveByTime,
  type TravelMode,
} from '../../src/services/location.service';

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function statusBg(
  status: QueueEntryDto['status'],
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (status) {
    case 'serving': return colors.warmYellow;
    case 'completed': return colors.success;
    case 'cancelled':
    case 'no_show': return colors.danger;
    default: return colors.accent;
  }
}

function AnnouncementRow({ item }: { item: SalonAnnouncementDto }) {
  const theme = useTheme();
  const iconMap: Record<string, string> = {
    info: 'ℹ️', delay: '⏳', paused: '⏸️', closed: '🔒', reopened: '✅',
  };
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.line }}>
      <Text style={{ fontSize: 16 }}>{iconMap[item.type] ?? 'ℹ️'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.ink, fontSize: theme.type.body.size }}>{item.body}</Text>
        <Text style={{ color: theme.colors.inkSoft, fontSize: 11, marginTop: 2 }}>
          {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </Text>
      </View>
    </View>
  );
}

/** Late-report bottom sheet */
function LateSheet({
  visible,
  entryId,
  onClose,
}: {
  visible: boolean;
  entryId: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const reportLate = useReportLate();
  const cancelBooking = useCancelBooking();
  const router = useRouter();

  const options = [
    { label: '5 min late', minutes: 5 },
    { label: '10 min late', minutes: 10 },
    { label: '15 min late', minutes: 15 },
    { label: '20+ min late', minutes: 20 },
  ];

  async function handleLate(minutes: number) {
    await reportLate.mutateAsync({ entryId, input: { minutes } });
    onClose();
    Alert.alert('Reported', `Salon notified you're running ${minutes} min late. They will update your position.`);
  }

  async function handleCantMakeIt() {
    onClose();
    Alert.alert("Can't Make It", "Cancel your spot?", [
      { text: 'Keep my spot', style: 'cancel' },
      {
        text: 'Cancel', style: 'destructive',
        onPress: async () => {
          await cancelBooking.mutateAsync(entryId);
          router.replace('/(tabs)/activity');
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink, textAlign: 'center' }}>
          I'm Running Late
        </Text>
        <Text style={{ color: theme.colors.inkSoft, textAlign: 'center', marginBottom: 8 }}>
          Let the salon know you're on your way. They'll decide how to handle your slot.
        </Text>
        {options.map((opt) => (
          <Pressable
            key={opt.minutes}
            onPress={() => void handleLate(opt.minutes)}
            disabled={reportLate.isPending}
            style={{ borderWidth: 1.5, borderColor: theme.colors.accent, borderRadius: theme.radius.button, paddingVertical: 14, alignItems: 'center', opacity: reportLate.isPending ? 0.5 : 1 }}
          >
            <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 16 }}>{opt.label}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => void handleCantMakeIt()}
          style={{ paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ color: theme.colors.danger, fontWeight: '600', fontSize: 16 }}>Can't Make It</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/** Live queue tracking screen — real-time updates via Socket.IO with HTTP polling fallback. */
export default function QueueTrackScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const cancelBooking = useCancelBooking();
  const markArrived = useMarkArrived();
  const [showLate, setShowLate] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'updates'>('status');
  const [travelMode, setTravelMode] = useState<TravelMode>('walk');

  // HTTP baseline — polls every 8s for resilience when Socket.IO is unavailable.
  const { data: httpEntry, isLoading, isError } = useBooking(bookingId ?? null);

  // Local state that merges HTTP data with Socket.IO push updates.
  const [liveEntry, setLiveEntry] = useState<QueueEntryDto | null>(null);

  // Subscribe to Socket.IO realtime events for this entry.
  useEntryRealtime(bookingId, (updated) => {
    setLiveEntry(updated);
    queryClient.setQueryData([BOOKINGS_KEY, bookingId], updated);
  });

  // Show the most-recent state: Socket.IO push wins over HTTP.
  const entry = liveEntry ?? httpEntry ?? null;

  // Announcements for this salon
  const { data: announcements = [] } = useAnnouncements(entry?.salonId);

  // Queue snapshot for freshness indicator
  const { dataUpdatedAt } = useSalonQueue(entry?.salonId);

  // Location + salon detail for distance → Leave By calculation (Sc.50)
  const { location } = useLocation();
  const { data: salonDetail } = useSalonDetail(entry?.salonId ?? '', location ?? undefined);

  if (isLoading && !entry) return <LoadingState label="Loading…" />;
  if ((isError && !entry) || (!isLoading && !entry)) {
    return (
      <ErrorState
        title="Could not load queue"
        body="Check your connection and try again."
        onRetry={() => router.back()}
        retryLabel="Back"
      />
    );
  }
  if (!entry) return null;

  const b = entry;
  const isActive = b.status === 'waiting' || b.status === 'serving';
  const isWaiting = b.status === 'waiting';

  const statusLabels: Record<string, string> = {
    waiting: 'Waiting', serving: 'In Service', completed: 'Completed',
    cancelled: 'Cancelled', no_show: 'No Show', pending: 'Pending',
  };
  const statusLabel = statusLabels[b.status] ?? b.status;

  const aheadLabel =
    b.queuePositionAhead === 0 || b.status === 'serving'
      ? "You're next!"
      : `${b.queuePositionAhead ?? 0} ahead of you`;

  async function handleCancel() {
    await cancelBooking.mutateAsync(b.id);
    router.replace('/(tabs)/activity');
  }

  async function handleArrive() {
    await markArrived.mutateAsync(b.id);
    Alert.alert('Marked Arrived', 'The salon has been notified you have arrived.');
  }

  // Freshness: how many minutes ago was the snapshot last polled.
  const freshnessMinutes = dataUpdatedAt ? Math.floor((Date.now() - dataUpdatedAt) / 60_000) : null;
  const isStale = freshnessMinutes != null && freshnessMinutes >= 3;

  // Leave By (Sc.37, 50): requires slotStartAt + distance from salon detail
  const distanceMeters = salonDetail?.distanceMeters ?? null;
  const leaveBy = leaveByTime(b.slotStartAt, distanceMeters, travelMode, 5);
  const travelMin = distanceMeters != null ? travelMinutes(distanceMeters, travelMode) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s3, gap: theme.spacing.s3 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Text style={{ fontSize: 20, color: theme.colors.ink }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: theme.type.section.size, fontWeight: theme.type.section.weight, color: theme.colors.ink }} numberOfLines={1}>
            {b.salonName}
          </Text>
          {freshnessMinutes !== null && (
            <Text style={{ fontSize: 11, color: isStale ? theme.colors.danger : theme.colors.inkSoft }}>
              {isStale ? '⚠️ ' : ''}{freshnessMinutes === 0 ? 'Just updated' : `Updated ${freshnessMinutes} min ago`}
            </Text>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.line }}>
        {(['status', 'updates'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === tab ? theme.colors.accent : 'transparent' }}
          >
            <Text style={{ fontWeight: '600', fontSize: 14, color: activeTab === tab ? theme.colors.accent : theme.colors.inkSoft }}>
              {tab === 'status' ? 'My Queue' : `Updates${announcements.length > 0 ? ` (${announcements.length})` : ''}`}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.s4, paddingBottom: insets.bottom + theme.spacing.s6, gap: theme.spacing.s4 }}>
        {activeTab === 'status' ? (
          <>
            {/* Status badge */}
            <View style={{ alignSelf: 'flex-start', backgroundColor: statusBg(b.status, theme.colors), borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s2 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: theme.type.label.size }}>{statusLabel}</Text>
            </View>

            {/* Token hero */}
            <Card style={{ alignItems: 'center' }}>
              <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>Your Token</Text>
              <Text style={{ fontSize: 56, fontWeight: '800', color: theme.colors.ink, fontVariant: ['tabular-nums'] }}>
                #{b.tokenNumber}
              </Text>
              {isActive && (
                <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size, marginTop: 4 }}>
                  {aheadLabel}
                </Text>
              )}
              {/* Arrived indicator */}
              {b.arrivedAt && (
                <View style={{ marginTop: 8, backgroundColor: theme.colors.success + '20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ color: theme.colors.success, fontSize: 13, fontWeight: '600' }}>
                    ✓ Arrived at {fmtTime(b.arrivedAt)}
                  </Text>
                </View>
              )}
              {/* Late report indicator */}
              {b.lateMinutes != null && !b.lateAction && (
                <View style={{ marginTop: 8, backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ color: '#E65100', fontSize: 13, fontWeight: '600' }}>
                    ⏳ Late report sent ({b.lateMinutes} min) — waiting for salon response
                  </Text>
                </View>
              )}
              {b.lateAction === 'kept' && (
                <View style={{ marginTop: 8, backgroundColor: theme.colors.success + '20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ color: theme.colors.success, fontSize: 13, fontWeight: '600' }}>
                    ✓ Salon kept your position — come as soon as you can
                  </Text>
                </View>
              )}
              {b.lateAction === 'moved' && (
                <View style={{ marginTop: 8, backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ color: '#E65100', fontSize: 13, fontWeight: '600' }}>
                    ℹ️ Your position was moved back — check your new slot
                  </Text>
                </View>
              )}
            </Card>

            {/* Time slot + Leave By — Sc.7, 37, 50 */}
            {(b.slotStartAt || b.slotEndAt) && isActive && (
              <Card>
                <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginBottom: 4 }}>
                  Your Assigned Slot
                </Text>
                <Text style={{ color: theme.colors.ink, fontSize: 18, fontWeight: '700' }}>
                  {fmtTime(b.slotStartAt)} – {fmtTime(b.slotEndAt)}
                </Text>

                {/* Travel mode picker — Sc.35 */}
                {distanceMeters != null && (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 4 }}>
                      {(['walk', 'bike', 'drive'] as TravelMode[]).map((mode) => (
                        <Pressable
                          key={mode}
                          onPress={() => setTravelMode(mode)}
                          style={{ flex: 1, borderWidth: 1.5, borderColor: travelMode === mode ? theme.colors.accent : theme.colors.line, borderRadius: 8, paddingVertical: 5, alignItems: 'center', backgroundColor: travelMode === mode ? theme.colors.accent + '15' : 'transparent' }}
                        >
                          <Text style={{ fontSize: 14 }}>{mode === 'walk' ? '🚶' : mode === 'bike' ? '🚲' : '🚗'}</Text>
                          <Text style={{ fontSize: 10, color: travelMode === mode ? theme.colors.accent : theme.colors.inkSoft, fontWeight: travelMode === mode ? '700' : '400' }}>
                            {mode}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {travelMin != null && (
                      <Text style={{ color: theme.colors.inkSoft, fontSize: 12 }}>
                        Travel ~{travelMin} min
                      </Text>
                    )}
                  </>
                )}

                {/* Leave By hero */}
                {leaveBy && (
                  <View style={{ marginTop: 10, backgroundColor: theme.colors.surface2, borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 20 }}>⏰</Text>
                    <View>
                      <Text style={{ color: theme.colors.inkSoft, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Leave By</Text>
                      <Text style={{ color: theme.colors.ink, fontSize: 20, fontWeight: '800' }}>
                        {leaveBy.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </Text>
                    </View>
                  </View>
                )}

                <Text style={{ color: theme.colors.inkSoft, fontSize: 12, marginTop: 6 }}>
                  Arriving before your slot won't move you up automatically.
                </Text>
              </Card>
            )}

            {/* ETA block */}
            {isActive && b.etaMinutes !== null && b.etaMinutes > 0 && (
              <Card>
                <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginBottom: 4 }}>
                  Estimated Wait
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.ink }}>
                  ~{etaRangeLabel(b.etaMinutes)}
                </Text>
              </Card>
            )}

            {/* Booking details */}
            <Card>
              <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginBottom: 4 }}>Service</Text>
              <Text style={{ color: theme.colors.ink, fontSize: theme.type.body.size, fontWeight: '500' }}>{b.serviceName}</Text>
              <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginTop: 2 }}>
                {formatDuration(b.serviceDurationMinutes)} · {formatPrice(b.servicePriceCents)}
              </Text>
              {b.salonAddress && (
                <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginTop: 4 }}>{b.salonAddress}</Text>
              )}
              {b.preferredStaffName && (
                <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginTop: 4 }}>
                  Preferred: {b.preferredStaffName}
                </Text>
              )}
            </Card>

            {/* Active actions */}
            {isActive && (
              <View style={{ gap: theme.spacing.s3 }}>
                {/* I Have Arrived — only show if not already marked */}
                {!b.arrivedAt && (
                  <Pressable
                    onPress={() => void handleArrive()}
                    disabled={markArrived.isPending}
                    accessibilityRole="button"
                    style={{ backgroundColor: theme.colors.success, borderRadius: theme.radius.button, paddingVertical: theme.spacing.s3, alignItems: 'center', opacity: markArrived.isPending ? 0.5 : 1 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: theme.type.button.size }}>
                      📍 I Have Arrived
                    </Text>
                  </Pressable>
                )}

                {/* I'm Late — only for waiting entries, not already reported */}
                {isWaiting && b.lateMinutes == null && (
                  <Pressable
                    onPress={() => setShowLate(true)}
                    accessibilityRole="button"
                    style={{ borderWidth: 1.5, borderColor: '#E65100', borderRadius: theme.radius.button, paddingVertical: theme.spacing.s3, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#E65100', fontWeight: '600', fontSize: theme.type.button.size }}>
                      ⏳ I'm Running Late
                    </Text>
                  </Pressable>
                )}

                {/* Cancel */}
                <Pressable
                  onPress={() => void handleCancel()}
                  accessibilityRole="button"
                  style={{ borderWidth: 1, borderColor: theme.colors.danger, borderRadius: theme.radius.button, paddingVertical: theme.spacing.s3, alignItems: 'center' }}
                >
                  <Text style={{ color: theme.colors.danger, fontWeight: '600', fontSize: theme.type.button.size }}>
                    Leave Queue
                  </Text>
                </Pressable>
              </View>
            )}

            {!isActive && (
              <Pressable
                onPress={() => router.replace('/(tabs)')}
                accessibilityRole="button"
                style={{ backgroundColor: theme.colors.accent, borderRadius: theme.radius.button, paddingVertical: theme.spacing.s3, alignItems: 'center' }}
              >
                <Text style={{ color: theme.colors.accentInk, fontWeight: '600', fontSize: theme.type.button.size }}>
                  Explore Salons
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          // Updates tab
          <>
            {announcements.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 32 }}>📢</Text>
                <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size, marginTop: 8 }}>
                  No updates yet
                </Text>
                <Text style={{ color: theme.colors.inkSoft, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                  Queue changes, delays and salon announcements will appear here.
                </Text>
              </View>
            ) : (
              <Card>
                {announcements.map((ann) => (
                  <AnnouncementRow key={ann.id} item={ann} />
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <LateSheet
        visible={showLate}
        entryId={b.id}
        onClose={() => setShowLate(false)}
      />
    </View>
  );
}
