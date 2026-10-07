import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, Card, EmptyState, LoadingState, Status } from '@soliton/ui';
import type { BookingStatus, QueueEntryDto } from '@soliton/api-contract';
import { useBookings } from '../../src/hooks/useBookings';
import { formatPrice, formatDuration } from '../../src/utils/format';

function statusKind(status: BookingStatus): 'success' | 'warning' | 'neutral' | 'info' | 'danger' {
  switch (status) {
    case 'pending':
      return 'neutral';
    case 'waiting':
      return 'info';
    case 'serving':
      return 'warning';
    case 'completed':
      return 'success';
    case 'cancelled':
    case 'no_show':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function BookingCard({ booking }: { booking: QueueEntryDto }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const isActive = booking.status === 'waiting' || booking.status === 'serving';
  const statusLabel = t(`queue.status.${booking.status}`);

  return (
    <Card style={{ marginBottom: theme.spacing.s3 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: theme.spacing.s3 }}>
          <Text
            style={{
              fontSize: theme.type.label.size,
              fontWeight: theme.type.label.weight,
              color: theme.colors.ink,
            }}
            numberOfLines={1}
          >
            {booking.salonName}
          </Text>
          <Text
            style={{
              fontSize: theme.type.body.size,
              color: theme.colors.ink,
              marginTop: theme.spacing.s1,
            }}
          >
            {booking.serviceName}
          </Text>
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginTop: theme.spacing.s1 }}>
            {formatDuration(booking.serviceDurationMinutes)} · {formatPrice(booking.servicePriceCents)}
          </Text>
        </View>
        <Status kind={statusKind(booking.status)} label={statusLabel} />
      </View>

      {booking.tokenNumber !== null && (
        <Text
          style={{
            color: theme.colors.accent,
            fontWeight: '700',
            fontSize: theme.type.label.size,
            marginTop: theme.spacing.s2,
          }}
        >
          {t('activity.token', { token: booking.tokenNumber })}
        </Text>
      )}

      {isActive && booking.etaMinutes !== null && booking.etaMinutes > 0 && (
        <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginTop: theme.spacing.s1 }}>
          {t('activity.waitLabel', { minutes: booking.etaMinutes })}
        </Text>
      )}

      {isActive && (
        <Pressable
          onPress={() => router.push(`/queue/${booking.id}`)}
          accessibilityRole="button"
          style={{
            marginTop: theme.spacing.s3,
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.button,
            paddingVertical: theme.spacing.s2,
            paddingHorizontal: theme.spacing.s4,
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ color: theme.colors.accentInk, fontWeight: '600', fontSize: theme.type.label.size }}>
            {t('activity.trackButton')}
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

/** Activity screen: active, upcoming, and past bookings. */
export default function ActivityScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: bookings = [], isLoading } = useBookings();

  const active = bookings.filter((b) => b.status === 'pending' || b.status === 'waiting' || b.status === 'serving');
  const past = bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled' || b.status === 'no_show');

  if (isLoading) return <LoadingState label={t('common.loading')} />;

  if (bookings.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s4 }}>
          <Text style={{ fontSize: theme.type.title.size, fontWeight: theme.type.title.weight, color: theme.colors.ink }}>
            {t('activity.title')}
          </Text>
        </View>
        <EmptyState title={t('activity.noBookings')} body={t('activity.noBookingsBody')}>
          <Pressable
            onPress={() => router.push('/(tabs)')}
            accessibilityRole="button"
            style={{
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.button,
              paddingVertical: theme.spacing.s3,
              paddingHorizontal: theme.spacing.s5,
              marginTop: theme.spacing.s2,
            }}
          >
            <Text style={{ color: theme.colors.accentInk, fontWeight: '600', fontSize: theme.type.button.size }}>
              {t('activity.explore')}
            </Text>
          </Pressable>
        </EmptyState>
      </View>
    );
  }

  const sections: Array<{ key: string; title: string; data: QueueEntryDto[] }> = [];
  if (active.length > 0) sections.push({ key: 'active', title: t('activity.active'), data: active });
  if (past.length > 0) sections.push({ key: 'past', title: t('activity.past'), data: past });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s4 }}>
        <Text style={{ fontSize: theme.type.title.size, fontWeight: theme.type.title.weight, color: theme.colors.ink }}>
          {t('activity.title')}
        </Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.s4, paddingBottom: insets.bottom + theme.spacing.s5 }}
        renderItem={({ item: section }) => (
          <View>
            <Text
              style={{
                fontSize: theme.type.label.size,
                fontWeight: theme.type.label.weight,
                color: theme.colors.inkSoft,
                marginBottom: theme.spacing.s2,
                marginTop: theme.spacing.s2,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              {section.title}
            </Text>
            {section.data.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </View>
        )}
      />
    </View>
  );
}
