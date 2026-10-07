import { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Card, Button, Divider, LoadingState, ErrorState } from '@soliton/ui';
import type { OperatingDayInput } from '@soliton/api-contract';
import { useMySalon, useSalonHours, usePutHours } from '../../src/hooks/useMySalon';

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DayState {
  weekday: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

function makeDefaultDays(): DayState[] {
  return Array.from({ length: 7 }, (_, i) => ({ weekday: i, isOpen: false, openTime: '09:00', closeTime: '18:00' }));
}

export default function HoursScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: salon } = useMySalon();
  const salonId = salon?.id;
  const { data: hoursData, isLoading, isError, refetch } = useSalonHours(salonId);
  const putHours = usePutHours();

  const [days, setDays] = useState<DayState[]>(makeDefaultDays);

  useEffect(() => {
    if (hoursData) {
      setDays(hoursData.days.map((d) => ({
        weekday: d.weekday,
        isOpen: d.isOpen,
        openTime: d.openTime ?? '09:00',
        closeTime: d.closeTime ?? '18:00',
      })));
    }
  }, [hoursData]);

  const toggleDay = useCallback((weekday: number) => {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, isOpen: !d.isOpen } : d)));
  }, []);

  const updateTime = useCallback((weekday: number, field: 'openTime' | 'closeTime', value: string) => {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, [field]: value } : d)));
  }, []);

  const handleSave = async () => {
    if (!salonId) return;
    const input: OperatingDayInput[] = days.map((d) => ({
      weekday: d.weekday,
      isOpen: d.isOpen,
      ...(d.isOpen ? { openTime: d.openTime, closeTime: d.closeTime } : {}),
    }));
    try {
      await putHours.mutateAsync({ salonId, input: { days: input } });
      Alert.alert('', 'Hours saved.');
    } catch {
      Alert.alert('', 'Could not save hours. Please try again.');
    }
  };

  if (isLoading) return <LoadingState label="Loading…" />;
  if (isError) {
    return <ErrorState title="Could not load hours" onRetry={() => refetch()} retryLabel="Retry" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.s4, paddingBottom: insets.bottom + theme.spacing.s6, gap: theme.spacing.s4 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: theme.type.title.size, fontWeight: theme.type.title.weight, color: theme.colors.ink }}>
          Operating Hours
        </Text>

        <Card>
          {days.map((day, index) => (
            <View key={day.weekday}>
              {index > 0 && <Divider />}
              <DayRow
                day={day}
                dayLabel={WEEKDAY_LABELS[day.weekday]}
                onToggle={() => toggleDay(day.weekday)}
                onOpenTimeChange={(val) => updateTime(day.weekday, 'openTime', val)}
                onCloseTimeChange={(val) => updateTime(day.weekday, 'closeTime', val)}
              />
            </View>
          ))}
        </Card>

        <Button label={putHours.isPending ? 'Saving…' : 'Save Hours'} onPress={() => void handleSave()} />
      </ScrollView>
    </View>
  );
}

function DayRow({ day, dayLabel, onToggle, onOpenTimeChange, onCloseTimeChange }: {
  day: DayState;
  dayLabel: string;
  onToggle: () => void;
  onOpenTimeChange: (val: string) => void;
  onCloseTimeChange: (val: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ paddingVertical: theme.spacing.s3 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: theme.type.body.size, fontWeight: theme.type.label.weight, color: theme.colors.ink }}>
          {dayLabel}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 }}>
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
            {day.isOpen ? 'Open' : 'Closed'}
          </Text>
          <Switch value={day.isOpen} onValueChange={onToggle} accessibilityLabel={`${dayLabel} open`} />
        </View>
      </View>

      {day.isOpen && (
        <View style={{ flexDirection: 'row', gap: theme.spacing.s3, marginTop: theme.spacing.s2 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: theme.type.caption.size, color: theme.colors.inkSoft }}>Open time</Text>
            <TextInput
              value={day.openTime}
              onChangeText={onOpenTimeChange}
              placeholder="09:00"
              placeholderTextColor={theme.colors.inkSoft}
              accessibilityLabel="Open time"
              style={{ backgroundColor: theme.colors.bg, borderRadius: theme.radius.input, paddingHorizontal: theme.spacing.s3, paddingVertical: theme.spacing.s2, fontSize: theme.type.body.size, color: theme.colors.ink, borderWidth: theme.borderWidth.hairline, borderColor: theme.colors.line, marginTop: theme.spacing.s1 }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: theme.type.caption.size, color: theme.colors.inkSoft }}>Close time</Text>
            <TextInput
              value={day.closeTime}
              onChangeText={onCloseTimeChange}
              placeholder="18:00"
              placeholderTextColor={theme.colors.inkSoft}
              accessibilityLabel="Close time"
              style={{ backgroundColor: theme.colors.bg, borderRadius: theme.radius.input, paddingHorizontal: theme.spacing.s3, paddingVertical: theme.spacing.s2, fontSize: theme.type.body.size, color: theme.colors.ink, borderWidth: theme.borderWidth.hairline, borderColor: theme.colors.line, marginTop: theme.spacing.s1 }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
