import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, Card, QueueGlyph, EtaBlock, LoadingState, ErrorState } from '@soliton/ui';
import type { QueueEntryDto } from '@soliton/api-contract';
import { useBooking, useCancelBooking, BOOKINGS_KEY } from '../../src/hooks/useBookings';
import { useEntryRealtime } from '../../src/hooks/useEntryRealtime';
import { useQueryClient } from '@tanstack/react-query';
import { formatDuration, formatPrice } from '../../src/utils/format';

function statusBg(
  status: QueueEntryDto['status'],
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (status) {
    case 'serving':
      return colors.warmYellow;
    case 'completed':
      return colors.success;
    case 'cancelled':
    case 'no_show':
      return colors.danger;
    default:
      return colors.accent;
  }
}

/** Live queue tracking screen — real-time updates via Socket.IO with HTTP polling fallback. */
export default function QueueTrackScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const cancelBooking = useCancelBooking();

  // HTTP baseline — polls every 8s for resilience when Socket.IO is unavailable.
  const { data: httpEntry, isLoading, isError } = useBooking(bookingId ?? null);

  // Local state that merges HTTP data with Socket.IO push updates.
  const [liveEntry, setLiveEntry] = useState<QueueEntryDto | null>(null);

  // Subscribe to Socket.IO realtime events for this entry.
  useEntryRealtime(bookingId, (updated) => {
    setLiveEntry(updated);
    // Also update TanStack Query cache so Activity screen stays in sync.
    queryClient.setQueryData([BOOKINGS_KEY, bookingId], updated);
  });

  // Show the most-recent state: Socket.IO push wins over HTTP.
  const entry = liveEntry ?? httpEntry ?? null;

  if (isLoading && !entry) return <LoadingState label={t('common.loading')} />;
  if ((isError && !entry) || (!isLoading && !entry)) {
    return (
      <ErrorState
        title={t('errors.loadFailed')}
        body={t('errors.networkError')}
        onRetry={() => router.back()}
        retryLabel={t('common.back')}
      />
    );
  }
  if (!entry) return null;

  const b = entry;
  const isActive = b.status === 'waiting' || b.status === 'serving';
  const statusLabel = t(`queue.status.${b.status}`);
  const aheadLabel =
    b.queuePositionAhead === 0 || b.status === 'serving'
      ? t('queue.noAhead')
      : t('queue.ahead', { count: b.queuePositionAhead ?? 0 });

  async function handleCancel() {
    await cancelBooking.mutateAsync(b.id);
    router.replace('/(tabs)/activity');
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
            flex: 1,
          }}
          numberOfLines={1}
        >
          {b.salonName}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s6,
          gap: theme.spacing.s4,
        }}
      >
        {/* Status badge */}
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: statusBg(b.status, theme.colors),
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.s4,
            paddingVertical: theme.spacing.s2,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: theme.type.label.size }}>
            {statusLabel}
          </Text>
        </View>

        {/* Token hero */}
        <Card style={{ alignItems: 'center' }}>
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
            {t('queue.yourToken')}
          </Text>
          <Text
            style={{
              fontSize: theme.type.numeric.size,
              fontWeight: theme.type.numeric.weight,
              color: theme.colors.ink,
              fontVariant: ['tabular-nums'],
              lineHeight: theme.type.numeric.line,
            }}
          >
            #{b.tokenNumber}
          </Text>

          {isActive && (
            <View style={{ marginTop: theme.spacing.s4, alignItems: 'center', gap: theme.spacing.s3 }}>
              <QueueGlyph
                position={Math.max(1, (b.queuePositionAhead ?? 0) + 1)}
                total={Math.max(1, (b.queuePositionAhead ?? 0) + 1)}
              />
              <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size }}>
                {aheadLabel}
              </Text>
            </View>
          )}
        </Card>

        {/* ETA block */}
        {isActive && b.etaMinutes !== null && b.etaMinutes > 0 && (
          <Card>
            <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginBottom: theme.spacing.s2 }}>
              {t('booking.estimatedWait')}
            </Text>
            <EtaBlock minLabel={`${b.etaMinutes}`} />
          </Card>
        )}

        {/* Booking details */}
        <Card>
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginBottom: theme.spacing.s2 }}>
            {t('booking.service')}
          </Text>
          <Text style={{ color: theme.colors.ink, fontSize: theme.type.body.size, fontWeight: '500' }}>
            {b.serviceName}
          </Text>
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginTop: theme.spacing.s1 }}>
            {formatDuration(b.serviceDurationMinutes)} · {formatPrice(b.servicePriceCents)}
          </Text>
          {b.salonAddress && (
            <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginTop: theme.spacing.s2 }}>
              {b.salonAddress}
            </Text>
          )}
        </Card>

        {/* Actions */}
        {isActive && (
          <Pressable
            onPress={() => void handleCancel()}
            accessibilityRole="button"
            style={{
              borderWidth: theme.borderWidth.hairline,
              borderColor: theme.colors.danger,
              borderRadius: theme.radius.button,
              paddingVertical: theme.spacing.s3,
              alignItems: 'center',
              minHeight: theme.minTouchTarget,
            }}
          >
            <Text style={{ color: theme.colors.danger, fontWeight: '600', fontSize: theme.type.button.size }}>
              {t('queue.cancelBooking')}
            </Text>
          </Pressable>
        )}

        {!isActive && (
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            accessibilityRole="button"
            style={{
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.button,
              paddingVertical: theme.spacing.s3,
              alignItems: 'center',
              minHeight: theme.minTouchTarget,
            }}
          >
            <Text style={{ color: theme.colors.accentInk, fontWeight: '600', fontSize: theme.type.button.size }}>
              {t('activity.explore')}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
