import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, Card, Divider } from '@soliton/ui';
import type { BookingDto } from '@soliton/api-contract';
import { useBookingStore } from '../../src/stores/bookingStore';
import { useCreateBooking } from '../../src/hooks/useBookings';
import { formatPrice, formatDuration } from '../../src/utils/format';

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.s3 }}>
      <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size }}>{label}</Text>
      <Text style={{ color: theme.colors.ink, fontWeight: '500', fontSize: theme.type.body.size }}>{value}</Text>
    </View>
  );
}

/** Booking confirmation screen: shows summary + confirm CTA. */
export default function BookingConfirmScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useBookingStore();
  const createBooking = useCreateBooking();
  const [confirmed, setConfirmed] = useState<BookingDto | null>(null);

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
      const booking = await createBooking.mutateAsync({
        salonId: store.salonId!,
        salonName: store.salonName!,
        salonAddress: store.salonAddress,
        serviceId: store.serviceId!,
        serviceName: store.serviceName!,
        servicePriceCents: store.servicePriceCents!,
        serviceDurationMinutes: store.serviceDurationMinutes!,
      });
      setConfirmed(booking);
    } catch {
      // error shown via createBooking.isError
    }
  }

  if (confirmed) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.s5,
            gap: theme.spacing.s4,
          }}
        >
          <Text style={{ fontSize: 56 }}>🎉</Text>
          <Text
            style={{
              fontSize: theme.type.title.size,
              fontWeight: theme.type.title.weight,
              color: theme.colors.ink,
              textAlign: 'center',
            }}
          >
            {t('booking.success')}
          </Text>
          <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
            {t('booking.successBody')}
          </Text>

          {confirmed.tokenNumber !== null && (
            <Card style={{ alignItems: 'center', width: '100%' }}>
              <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
                {t('queue.yourToken')}
              </Text>
              <Text
                style={{
                  fontSize: theme.type.numeric.size,
                  fontWeight: theme.type.numeric.weight,
                  color: theme.colors.ink,
                  fontVariant: ['tabular-nums'],
                }}
              >
                #{confirmed.tokenNumber}
              </Text>
              {confirmed.etaMinutes !== null && confirmed.etaMinutes > 0 && (
                <Text style={{ color: theme.colors.inkSoft, marginTop: theme.spacing.s1 }}>
                  {t('queue.eta', { minutes: confirmed.etaMinutes })}
                </Text>
              )}
            </Card>
          )}

          <Pressable
            onPress={() => {
              store.clearSelection();
              router.replace(`/queue/${confirmed.id}`);
            }}
            accessibilityRole="button"
            style={{
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.button,
              paddingVertical: theme.spacing.s3,
              paddingHorizontal: theme.spacing.s6,
              width: '100%',
              alignItems: 'center',
              minHeight: theme.minTouchTarget,
            }}
          >
            <Text style={{ color: theme.colors.accentInk, fontWeight: '600', fontSize: theme.type.button.size }}>
              {t('booking.trackQueue')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              store.clearSelection();
              router.replace('/(tabs)');
            }}
            accessibilityRole="button"
          >
            <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size }}>
              {t('common.back')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.s4,
          paddingVertical: theme.spacing.s3,
          gap: theme.spacing.s3,
        }}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Text style={{ fontSize: 20, color: theme.colors.ink }}>←</Text>
        </Pressable>
        <Text
          style={{
            fontSize: theme.type.section.size,
            fontWeight: theme.type.section.weight,
            color: theme.colors.ink,
          }}
        >
          {t('booking.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s6,
          gap: theme.spacing.s4,
        }}
      >
        {canBook ? (
          <>
            <Card>
              <Row label={t('booking.salon')} value={store.salonName!} />
              <Divider />
              <Row label={t('booking.service')} value={store.serviceName!} />
              <Divider />
              <Row label={t('booking.duration')} value={formatDuration(store.serviceDurationMinutes!)} />
              <Divider />
              <Row label={t('booking.price')} value={formatPrice(store.servicePriceCents!)} />
            </Card>

            {createBooking.isError && (
              <Text style={{ color: theme.colors.danger, textAlign: 'center' }}>
                {t('errors.generic')}
              </Text>
            )}

            <Pressable
              onPress={() => void handleConfirm()}
              disabled={createBooking.isPending}
              accessibilityRole="button"
              style={{
                backgroundColor: createBooking.isPending ? theme.colors.line : theme.colors.accent,
                borderRadius: theme.radius.button,
                paddingVertical: theme.spacing.s3,
                alignItems: 'center',
                minHeight: theme.minTouchTarget,
              }}
            >
              {createBooking.isPending ? (
                <ActivityIndicator color={theme.colors.accentInk} />
              ) : (
                <Text style={{ color: theme.colors.accentInk, fontWeight: '600', fontSize: theme.type.button.size }}>
                  {t('booking.confirmButton')}
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
            {t('booking.selectService')}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
