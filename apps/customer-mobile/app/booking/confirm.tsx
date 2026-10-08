import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, Card, Divider } from '@soliton/ui';
import type { QueueEntryDto } from '@soliton/api-contract';
import { useBookingStore } from '../../src/stores/bookingStore';
import { useCreateBooking } from '../../src/hooks/useBookings';
import { useSalonQueue } from '../../src/hooks/useQueue';
import { useSalonStaff } from '../../src/hooks/useMySalon';
import { formatPrice, formatDuration } from '../../src/utils/format';
import { etaRange as etaRangeLabel } from '../../src/services/location.service';

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.s3 }}>
      <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size }}>{label}</Text>
      <Text style={{ color: theme.colors.ink, fontWeight: '500', fontSize: theme.type.body.size, maxWidth: '60%', textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

export default function BookingConfirmScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useBookingStore();
  const createBooking = useCreateBooking();
  const [confirmed, setConfirmed] = useState<QueueEntryDto | null>(null);
  const [preferredStaffId, setPreferredStaffId] = useState<string | null>(null);
  const idempotencyKey = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // Queue decision info
  const { data: queueSnapshot } = useSalonQueue(store.salonId ?? undefined);
  const { data: staff = [] } = useSalonStaff(store.salonId ?? undefined);

  const canBook =
    store.salonId &&
    store.salonName &&
    store.serviceId &&
    store.serviceName &&
    store.servicePriceCents !== null &&
    store.serviceDurationMinutes !== null;

  async function handleConfirm() {
    if (!canBook) return;
    try {
      const entry = await createBooking.mutateAsync({
        salonId: store.salonId!,
        serviceId: store.serviceId!,
        idempotencyKey: idempotencyKey.current,
        preferredStaffId: preferredStaffId ?? undefined,
      });
      setConfirmed(entry);
    } catch {
      // error shown via createBooking.isError
    }
  }

  if (confirmed) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.s5, gap: theme.spacing.s4 }}>
          <Text style={{ fontSize: 56 }}>🎉</Text>
          <Text style={{ fontSize: theme.type.title.size, fontWeight: theme.type.title.weight, color: theme.colors.ink, textAlign: 'center' }}>
            You're in the queue!
          </Text>
          <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
            You'll receive updates when your turn approaches.
          </Text>

          <Card style={{ alignItems: 'center', width: '100%' }}>
            <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>Your Token</Text>
            <Text style={{ fontSize: theme.type.numeric.size, fontWeight: theme.type.numeric.weight, color: theme.colors.ink, fontVariant: ['tabular-nums'] }}>
              #{confirmed.tokenNumber}
            </Text>
            {confirmed.slotStartAt && confirmed.slotEndAt && (
              <Text style={{ color: theme.colors.inkSoft, fontSize: 13, marginTop: 4, fontWeight: '600' }}>
                Slot: {new Date(confirmed.slotStartAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                {' – '}
                {new Date(confirmed.slotEndAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
            )}
            {confirmed.etaMinutes !== null && confirmed.etaMinutes > 0 && (
              <Text style={{ color: theme.colors.inkSoft, marginTop: 4, fontSize: 13 }}>
                ~{etaRangeLabel(confirmed.etaMinutes)} wait
              </Text>
            )}
          </Card>

          <Pressable
            onPress={() => { store.clearSelection(); router.replace(`/queue/${confirmed.id}`); }}
            accessibilityRole="button"
            style={{ backgroundColor: theme.colors.accent, borderRadius: theme.radius.button, paddingVertical: theme.spacing.s3, paddingHorizontal: theme.spacing.s6, width: '100%', alignItems: 'center', minHeight: theme.minTouchTarget }}
          >
            <Text style={{ color: theme.colors.accentInk, fontWeight: '600', fontSize: theme.type.button.size }}>
              Track My Queue
            </Text>
          </Pressable>

          <Pressable onPress={() => { store.clearSelection(); router.replace('/(tabs)'); }} accessibilityRole="button">
            <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size }}>Back to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s3, gap: theme.spacing.s3 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Text style={{ fontSize: 20, color: theme.colors.ink }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: theme.type.section.size, fontWeight: theme.type.section.weight, color: theme.colors.ink }}>
          Confirm Queue
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.s4, paddingBottom: insets.bottom + theme.spacing.s6, gap: theme.spacing.s4 }}>
        {canBook ? (
          <>
            {/* Pre-join decision info — scenario 30 */}
            {queueSnapshot && (
              <Card style={{ backgroundColor: theme.colors.surface2 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  Current Queue Status
                </Text>
                <View style={{ flexDirection: 'row', gap: theme.spacing.s4 }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.ink }}>{queueSnapshot.waitingCount}</Text>
                    <Text style={{ fontSize: 11, color: theme.colors.inkSoft }}>Waiting</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.ink }}>
                      {queueSnapshot.etaMinutes != null ? `~${etaRangeLabel(queueSnapshot.etaMinutes)}` : '—'}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.colors.inkSoft }}>Est. wait</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: queueSnapshot.status === 'open' ? '#E8F5E9' : '#FFF3E0' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: queueSnapshot.status === 'open' ? '#1B7A38' : '#E65100' }}>
                        {queueSnapshot.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: theme.colors.inkSoft, marginTop: 2 }}>Status</Text>
                  </View>
                </View>
                {queueSnapshot.status !== 'open' && (
                  <Text style={{ color: theme.colors.danger, fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: '600' }}>
                    ⚠️ Queue is {queueSnapshot.status}. You may not be able to join right now.
                  </Text>
                )}
                {queueSnapshot.isAtCapacity && queueSnapshot.status === 'open' && (
                  <Text style={{ color: theme.colors.danger, fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: '600' }}>
                    🚫 Queue is full — existing customers are still being served. Check back soon.
                  </Text>
                )}
              </Card>
            )}

            {/* Service summary */}
            <Card>
              <Row label="Salon" value={store.salonName!} />
              <Divider />
              <Row label="Service" value={store.serviceName!} />
              <Divider />
              <Row label="Duration" value={formatDuration(store.serviceDurationMinutes!)} />
              <Divider />
              <Row label="Price" value={formatPrice(store.servicePriceCents!)} />
            </Card>

            {/* Staff preference — scenario 11 */}
            {staff.length > 0 && (
              <Card>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.inkSoft, marginBottom: 8 }}>
                  Preferred Staff (optional)
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginBottom: 10 }}>
                  Your preference is shown to the salon but cannot be guaranteed.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Pressable
                    onPress={() => setPreferredStaffId(null)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: preferredStaffId === null ? theme.colors.accent : theme.colors.line, backgroundColor: preferredStaffId === null ? theme.colors.accent + '20' : 'transparent' }}
                  >
                    <Text style={{ fontSize: 13, color: preferredStaffId === null ? theme.colors.accent : theme.colors.inkSoft, fontWeight: preferredStaffId === null ? '700' : '400' }}>
                      No preference
                    </Text>
                  </Pressable>
                  {staff.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => setPreferredStaffId(s.id)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: preferredStaffId === s.id ? theme.colors.accent : theme.colors.line, backgroundColor: preferredStaffId === s.id ? theme.colors.accent + '20' : 'transparent' }}
                    >
                      <Text style={{ fontSize: 13, color: preferredStaffId === s.id ? theme.colors.accent : theme.colors.ink, fontWeight: preferredStaffId === s.id ? '700' : '400' }}>
                        {s.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Card>
            )}

            {createBooking.isError && (
              <Text style={{ color: theme.colors.danger, textAlign: 'center' }}>
                {createBooking.error?.message ?? 'Something went wrong. Please try again.'}
              </Text>
            )}

            <Pressable
              onPress={() => void handleConfirm()}
              disabled={createBooking.isPending}
              accessibilityRole="button"
              style={{ backgroundColor: createBooking.isPending ? theme.colors.line : theme.colors.accent, borderRadius: theme.radius.button, paddingVertical: theme.spacing.s3, alignItems: 'center', minHeight: theme.minTouchTarget }}
            >
              {createBooking.isPending ? (
                <ActivityIndicator color={theme.colors.accentInk} />
              ) : (
                <Text style={{ color: theme.colors.accentInk, fontWeight: '600', fontSize: theme.type.button.size }}>
                  Join Queue
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => router.back()} accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size }}>Choose Another Salon</Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>Select a service first.</Text>
        )}
      </ScrollView>
    </View>
  );
}
