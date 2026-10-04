import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  useTheme,
  Card,
  Divider,
  ServiceRow,
  Status,
  ErrorState,
  LoadingState,
} from '@soliton/ui';
import type { OperatingDayDto, ServiceDto } from '@soliton/api-contract';
import { useSalonDetail } from '../../src/hooks/useSalonDetail';
import { useBookingStore } from '../../src/stores/bookingStore';
import { formatDistance, formatPrice, formatDuration } from '../../src/utils/format';

/** Salon detail screen — pushed from discovery. */
export default function SalonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bookingStore = useBookingStore();

  const { data: salon, isLoading, isError, refetch } = useSalonDetail(id);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

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

  const todayWeekday = new Date().getDay();
  const selectedService: ServiceDto | undefined = salon.services.find(
    (s) => s.id === selectedServiceId,
  );

  function handleBook() {
    if (!selectedService) return;
    bookingStore.setSelectedService({
      salonId: salon!.id,
      salonName: salon!.name,
      salonAddress: salon!.address,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      servicePriceCents: selectedService.priceCents,
      serviceDurationMinutes: selectedService.estimatedMinutes,
    });
    router.push('/booking/confirm');
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.s2,
          paddingBottom: insets.bottom + (selectedServiceId ? 96 : theme.spacing.s6),
        }}
      >
        {/* Back button */}
        <View style={{ paddingHorizontal: theme.spacing.s4, paddingBottom: theme.spacing.s2 }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
            <Text style={{ fontSize: 20, color: theme.colors.ink }}>←</Text>
          </Pressable>
        </View>

        {/* Salon identity */}
        <View style={{ paddingHorizontal: theme.spacing.s4, gap: theme.spacing.s2 }}>
          <Text
            style={{
              fontSize: theme.type.title.size,
              fontWeight: theme.type.title.weight,
              color: theme.colors.ink,
            }}
          >
            {salon.name}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 }}>
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
            <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size }}>
              {salon.address}
              {salon.city ? `, ${salon.city}` : ''}
            </Text>
          )}
        </View>

        {/* Services */}
        <View style={{ paddingHorizontal: theme.spacing.s4, marginTop: theme.spacing.s4 }}>
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
            <Card>
              <Text style={{ color: theme.colors.inkSoft }}>{t('salonDetail.noServicesBody')}</Text>
            </Card>
          ) : (
            <Card>
              {salon.services
                .filter((s) => s.active)
                .map((svc, index, arr) => (
                  <View key={svc.id}>
                    {index > 0 && <Divider />}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 }}>
                      <View style={{ flex: 1 }}>
                        <ServiceRow
                          name={svc.name}
                          priceLabel={formatPrice(svc.priceCents)}
                          durationLabel={formatDuration(svc.estimatedMinutes)}
                          selected={selectedServiceId === svc.id}
                          onPress={() =>
                            setSelectedServiceId((prev) => (prev === svc.id ? null : svc.id))
                          }
                        />
                      </View>
                      <Pressable
                        onPress={() => {
                          setSelectedServiceId(svc.id);
                          bookingStore.setSelectedService({
                            salonId: salon.id,
                            salonName: salon.name,
                            salonAddress: salon.address,
                            serviceId: svc.id,
                            serviceName: svc.name,
                            servicePriceCents: svc.priceCents,
                            serviceDurationMinutes: svc.estimatedMinutes,
                          });
                          router.push('/booking/confirm');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('booking.bookService')}
                        style={{
                          backgroundColor: theme.colors.accent,
                          borderRadius: theme.radius.button,
                          paddingHorizontal: theme.spacing.s3,
                          paddingVertical: theme.spacing.s2,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.accentInk,
                            fontWeight: '600',
                            fontSize: theme.type.caption.size,
                          }}
                        >
                          {t('booking.bookService')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
            </Card>
          )}
        </View>

        {/* Operating hours */}
        <View style={{ paddingHorizontal: theme.spacing.s4, marginTop: theme.spacing.s4 }}>
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
          <Card>
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
        </View>

        {/* Location */}
        <View style={{ paddingHorizontal: theme.spacing.s4, marginTop: theme.spacing.s4 }}>
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
              marginBottom: theme.spacing.s3,
            }}
          >
            {t('salonDetail.location')}
          </Text>
          <Card>
            <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size }}>
              {distanceLabel
                ? t('salonDetail.distanceAway', { distance: distanceLabel })
                : t('salonDetail.distanceUnavailable')}
            </Text>
            <Text
              style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginTop: theme.spacing.s1 }}
            >
              {salon.location.latitude.toFixed(4)}°N, {salon.location.longitude.toFixed(4)}°E
            </Text>
          </Card>
        </View>
      </ScrollView>

      {/* Sticky Book CTA — visible when a service is selected */}
      {selectedService && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.surface,
            borderTopWidth: theme.borderWidth.hairline,
            borderTopColor: theme.colors.line,
            padding: theme.spacing.s4,
            paddingBottom: insets.bottom + theme.spacing.s4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.s3,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: theme.type.label.size, fontWeight: theme.type.label.weight, color: theme.colors.ink }}>
              {selectedService.name}
            </Text>
            <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
              {formatDuration(selectedService.estimatedMinutes)} · {formatPrice(selectedService.priceCents)}
            </Text>
          </View>
          <Pressable
            onPress={handleBook}
            accessibilityRole="button"
            style={{
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.button,
              paddingHorizontal: theme.spacing.s5,
              paddingVertical: theme.spacing.s3,
              minHeight: theme.minTouchTarget,
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: theme.colors.accentInk, fontWeight: '600', fontSize: theme.type.button.size }}>
              {t('booking.confirmButton')}
            </Text>
          </Pressable>
        </View>
      )}
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
