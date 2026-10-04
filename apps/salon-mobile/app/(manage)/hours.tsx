import { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme, Card, Button, Divider, LoadingState, ErrorState } from '@soliton/ui';
import type { OperatingDayInput } from '@soliton/api-contract';
import { useMySalon, useSalonHours, usePutHours } from '../../src/hooks/useMySalon';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

interface DayState {
  weekday: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

function makeDefaultDays(): DayState[] {
  return Array.from({ length: 7 }, (_, i) => ({
    weekday: i,
    isOpen: false,
    openTime: '09:00',
    closeTime: '18:00',
  }));
}

/** Operating hours management screen — full-week replacement. */
export default function HoursScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: salon } = useMySalon();
  const salonId = salon?.id;
  const { data: hoursData, isLoading, isError, refetch } = useSalonHours(salonId);
  const putHours = usePutHours();

  const [days, setDays] = useState<DayState[]>(makeDefaultDays);

  // Populate from server data.
  useEffect(() => {
    if (hoursData) {
      setDays(
        hoursData.days.map((d) => ({
          weekday: d.weekday,
          isOpen: d.isOpen,
          openTime: d.openTime ?? '09:00',
          closeTime: d.closeTime ?? '18:00',
        })),
      );
    }
  }, [hoursData]);

  const toggleDay = useCallback((weekday: number) => {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, isOpen: !d.isOpen } : d)));
  }, []);

  const updateTime = useCallback(
    (weekday: number, field: 'openTime' | 'closeTime', value: string) => {
      setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, [field]: value } : d)));
    },
    [],
  );

  const handleSave = async () => {
    if (!salonId) return;

    // Validate: open days must have valid times.
    const input: OperatingDayInput[] = days.map((d) => ({
      weekday: d.weekday,
      isOpen: d.isOpen,
      ...(d.isOpen ? { openTime: d.openTime, closeTime: d.closeTime } : {}),
    }));

    try {
      await putHours.mutateAsync({ salonId, input: { days: input } });
      Alert.alert('', t('salon.hours.saveSuccess'));
    } catch {
      Alert.alert('', t('salon.hours.saveError'));
    }
  };

  if (isLoading) return <LoadingState label={t('common.loading')} />;
  if (isError) {
    return (
      <ErrorState
        title={t('errors.loadFailed')}
        onRetry={() => refetch()}
        retryLabel={t('common.retry')}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s6,
          gap: theme.spacing.s4,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontSize: theme.type.title.size,
            fontWeight: theme.type.title.weight,
            color: theme.colors.ink,
          }}
        >
          {t('salon.hours.title')}
        </Text>

        <Card>
          {days.map((day, index) => (
            <View key={day.weekday}>
              {index > 0 && <Divider />}
              <DayRow
                day={day}
                dayLabel={t(`salon.hours.days.${WEEKDAY_KEYS[day.weekday]}`)}
                onToggle={() => toggleDay(day.weekday)}
                onOpenTimeChange={(val) => updateTime(day.weekday, 'openTime', val)}
                onCloseTimeChange={(val) => updateTime(day.weekday, 'closeTime', val)}
              />
            </View>
          ))}
        </Card>

        <Button
          label={putHours.isPending ? t('common.loading') : t('common.save')}
          onPress={handleSave}
        />
      </ScrollView>
    </View>
  );
}

function DayRow({
  day,
  dayLabel,
  onToggle,
  onOpenTimeChange,
  onCloseTimeChange,
}: {
  day: DayState;
  dayLabel: string;
  onToggle: () => void;
  onOpenTimeChange: (val: string) => void;
  onCloseTimeChange: (val: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ paddingVertical: theme.spacing.s3 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: theme.type.body.size,
            fontWeight: theme.type.label.weight,
            color: theme.colors.ink,
          }}
        >
          {dayLabel}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 }}>
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
            {day.isOpen ? t('salon.hours.openLabel') : t('salon.hours.closedLabel')}
          </Text>
          <Switch
            value={day.isOpen}
            onValueChange={onToggle}
            accessibilityLabel={`${dayLabel} ${t('salon.hours.openLabel')}`}
          />
        </View>
      </View>

      {day.isOpen && (
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.s3,
            marginTop: theme.spacing.s2,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: theme.type.caption.size, color: theme.colors.inkSoft }}>
              {t('salon.hours.openTimeLabel')}
            </Text>
            <TextInput
              value={day.openTime}
              onChangeText={onOpenTimeChange}
              placeholder="09:00"
              placeholderTextColor={theme.colors.inkSoft}
              accessibilityLabel={t('salon.hours.openTimeLabel')}
              style={{
                backgroundColor: theme.colors.bg,
                borderRadius: theme.radius.input,
                paddingHorizontal: theme.spacing.s3,
                paddingVertical: theme.spacing.s2,
                fontSize: theme.type.body.size,
                color: theme.colors.ink,
                borderWidth: theme.borderWidth.hairline,
                borderColor: theme.colors.line,
                marginTop: theme.spacing.s1,
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: theme.type.caption.size, color: theme.colors.inkSoft }}>
              {t('salon.hours.closeTimeLabel')}
            </Text>
            <TextInput
              value={day.closeTime}
              onChangeText={onCloseTimeChange}
              placeholder="18:00"
              placeholderTextColor={theme.colors.inkSoft}
              accessibilityLabel={t('salon.hours.closeTimeLabel')}
              style={{
                backgroundColor: theme.colors.bg,
                borderRadius: theme.radius.input,
                paddingHorizontal: theme.spacing.s3,
                paddingVertical: theme.spacing.s2,
                fontSize: theme.type.body.size,
                color: theme.colors.ink,
                borderWidth: theme.borderWidth.hairline,
                borderColor: theme.colors.line,
                marginTop: theme.spacing.s1,
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
