import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  useTheme,
  Card,
  Divider,
  Button,
  ServiceRow,
  Status,
  ErrorState,
  LoadingState,
} from '@soliton/ui';
import type { OperatingDayDto } from '@soliton/api-contract';
import { useSalonDetail } from '../../src/hooks/useSalonDetail';
import { formatDistance, formatPrice, formatDuration } from '../../src/utils/format';

/** Salon detail screen — pushed from discovery. */
export default function SalonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: salon, isLoading, isError, refetch } = useSalonDetail(id);

  if (isLoading) return <LoadingState label={t('common.loading')} />;
  if (isError || !salon) {
    return (
      <ErrorState
        title={t('errors.loadFailed')}
        body={t('errors.networkError')}
        onRetry={() => refetch()}
        retryLabel={t('common.retry')}
      />
    );
  }

  const distanceLabel = formatDistance(salon.distanceMeters);
  const openStateLabel =
    salon.openState === 'open'
      ? t('discovery.open')
      : salon.openState === 'unconfigured'
        ? t('discovery.unconfigured')
        : t('discovery.closed');

  const todayWeekday = new Date().getDay(); // 0=Sun

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.s4,
          paddingHorizontal: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s6,
          gap: theme.spacing.s4,
        }}
      >
        {/* Back button */}
        <Button label={`← ${t('common.back')}`} variant="tertiary" onPress={() => router.back()} />

        {/* Salon identity */}
        <View>
          <Text
            style={{
              fontSize: theme.type.title.size,
              fontWeight: theme.type.title.weight,
              color: theme.colors.ink,
            }}
          >
            {salon.name}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.s2,
              marginTop: theme.spacing.s2,
            }}
          >
            <Status
              kind={salon.openState === 'open' ? 'success' : 'neutral'}
              label={openStateLabel}
            />
            {distanceLabel && (
              <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
                {t('salonDetail.distanceAway', { distance: distanceLabel })}
              </Text>
            )}
          </View>

          {salon.address && (
            <Text
              style={{
                color: theme.colors.inkSoft,
                marginTop: theme.spacing.s2,
                fontSize: theme.type.body.size,
              }}
            >
              {salon.address}
              {salon.city ? `, ${salon.city}` : ''}
            </Text>
          )}
        </View>

        {/* Services */}
        <Card>
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
              marginBottom: theme.spacing.s3,
            }}
          >
            {t('salonDetail.services')}
          </Text>
          {salon.services.length === 0 ? (
            <Text style={{ color: theme.colors.inkSoft }}>{t('salonDetail.noServicesBody')}</Text>
          ) : (
            salon.services.map((svc, index) => (
              <View key={svc.id}>
                {index > 0 && <Divider />}
                <ServiceRow
                  name={svc.name}
                  priceLabel={formatPrice(svc.priceCents)}
                  durationLabel={formatDuration(svc.estimatedMinutes)}
                />
              </View>
            ))
          )}
        </Card>

        {/* Operating hours */}
        <Card>
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
              marginBottom: theme.spacing.s3,
            }}
          >
            {t('salonDetail.hours')}
          </Text>
          {!salon.hours.configured ? (
            <Text style={{ color: theme.colors.inkSoft }}>
              {t('salonDetail.hoursNotConfigured')}
            </Text>
          ) : (
            salon.hours.days.map((day) => (
              <DayRow key={day.weekday} day={day} isToday={day.weekday === todayWeekday} />
            ))
          )}
        </Card>

        {/* Location info */}
        <Card>
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
              marginBottom: theme.spacing.s2,
            }}
          >
            {t('salonDetail.location')}
          </Text>
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size }}>
            {distanceLabel
              ? t('salonDetail.distanceAway', { distance: distanceLabel })
              : t('salonDetail.distanceUnavailable')}
          </Text>
          <Text
            style={{
              color: theme.colors.inkSoft,
              fontSize: theme.type.caption.size,
              marginTop: theme.spacing.s1,
            }}
          >
            {salon.location.latitude.toFixed(4)}°N, {salon.location.longitude.toFixed(4)}°E
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function DayRow({ day, isToday }: { day: OperatingDayDto; isToday: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dayName = t(`weekdays.short.${day.weekday}`);
  const timeLabel = day.isOpen ? `${day.openTime} – ${day.closeTime}` : t('salonDetail.closedDay');

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.s2,
      }}
    >
      <Text
        style={{
          color: isToday ? theme.colors.accent : theme.colors.ink,
          fontWeight: isToday ? '600' : '400',
          fontSize: theme.type.body.size,
        }}
      >
        {dayName}
        {isToday ? ` (${t('salonDetail.today')})` : ''}
      </Text>
      <Text
        style={{
          color: day.isOpen ? theme.colors.ink : theme.colors.inkSoft,
          fontSize: theme.type.body.size,
        }}
      >
        {timeLabel}
      </Text>
    </View>
  );
}
