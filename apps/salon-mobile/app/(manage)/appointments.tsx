/**
 * Salon appointments view: day-by-day list with status filters.
 * Staff can mark no-show, start service, or complete from here.
 */
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Card, LoadingState, ErrorState, Status } from '@soliton/ui';
import type { AppointmentStatus, AppointmentSummaryDto } from '@soliton/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/api';
import { useMySalon } from '../../src/hooks/useMySalon';

function statusKind(status: AppointmentStatus): 'success' | 'warning' | 'neutral' | 'info' | 'danger' {
  switch (status) {
    case 'scheduled': return 'neutral';
    case 'confirmed': return 'info';
    case 'checked_in':
    case 'in_service': return 'warning';
    case 'completed': return 'success';
    case 'cancelled': return 'neutral';
    case 'no_show': return 'danger';
    default: return 'neutral';
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
}

/** Produce next 7 days as YYYY-MM-DD. */
function weekDates(): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const APPT_KEY = 'salon-appointments';

export default function SalonAppointmentsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const dates = weekDates();

  const { data: salon, isLoading: loadingSalon } = useMySalon();

  const { data: appointments = [], isLoading, isError, refetch, isFetching } = useQuery<AppointmentSummaryDto[]>({
    queryKey: [APPT_KEY, salon?.id, selectedDate],
    queryFn: () => api.appointments.listForSalon(salon!.id, { date: selectedDate }),
    enabled: !!salon?.id,
    staleTime: 15_000,
  });

  const noShowMutation = useMutation({
    mutationFn: (id: string) => api.appointments.noShow(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [APPT_KEY] }),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => api.appointments.start(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [APPT_KEY] }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.appointments.complete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [APPT_KEY] }),
  });

  if (loadingSalon) return <LoadingState label="Loading salon…" />;
  if (isError) return <ErrorState title="Could not load appointments" onRetry={refetch} />;

  function renderAppt({ item }: { item: AppointmentSummaryDto }) {
    const canNoShow = item.status === 'scheduled' || item.status === 'confirmed';
    const canStart = item.status === 'checked_in';
    const canComplete = item.status === 'in_service';

    return (
      <Card style={{ marginBottom: theme.spacing.s3 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: theme.spacing.s3 }}>
            <Text style={{ fontSize: theme.type.label.size, fontWeight: theme.type.label.weight, color: theme.colors.ink }}>
              {formatDateTime(item.scheduledAt)}
            </Text>
            <Text style={{ fontSize: theme.type.body.size, color: theme.colors.ink, marginTop: 2 }}>
              {item.serviceName}
            </Text>
          </View>
          <Status kind={statusKind(item.status)} label={item.status.replace('_', ' ')} />
        </View>

        {(canNoShow || canStart || canComplete) && (
          <View style={{ flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s3 }}>
            {canStart && (
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radius.button,
                  paddingVertical: theme.spacing.s2,
                  alignItems: 'center',
                }}
                onPress={() => startMutation.mutate(item.id)}
                accessibilityRole="button"
              >
                <Text style={{ color: theme.colors.accentInk, fontWeight: '600', fontSize: theme.type.label.size }}>
                  Start
                </Text>
              </Pressable>
            )}
            {canComplete && (
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.success,
                  borderRadius: theme.radius.button,
                  paddingVertical: theme.spacing.s2,
                  alignItems: 'center',
                }}
                onPress={() => completeMutation.mutate(item.id)}
                accessibilityRole="button"
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: theme.type.label.size }}>
                  Complete
                </Text>
              </Pressable>
            )}
            {canNoShow && (
              <Pressable
                style={{
                  paddingVertical: theme.spacing.s2,
                  paddingHorizontal: theme.spacing.s3,
                  borderRadius: theme.radius.button,
                  borderWidth: 1,
                  borderColor: theme.colors.danger,
                  alignItems: 'center',
                }}
                onPress={() => {
                  Alert.alert('Mark No-Show', 'Mark this appointment as no-show?', [
                    { text: 'Cancel' },
                    { text: 'No Show', style: 'destructive', onPress: () => noShowMutation.mutate(item.id) },
                  ]);
                }}
                accessibilityRole="button"
              >
                <Text style={{ color: theme.colors.danger, fontWeight: '600', fontSize: theme.type.caption.size }}>
                  No Show
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </Card>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s4 }}>
        <Text style={{ fontSize: theme.type.title.size, fontWeight: theme.type.title.weight, color: theme.colors.ink }}>
          Appointments
        </Text>
      </View>

      {/* Date strip */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={dates}
        keyExtractor={(d) => d}
        style={{ maxHeight: 60, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.s4, gap: theme.spacing.s2 }}
        renderItem={({ item: date }) => {
          const isSelected = date === selectedDate;
          const d = new Date(date);
          return (
            <Pressable
              onPress={() => setSelectedDate(date)}
              accessibilityRole="button"
              style={{
                paddingVertical: theme.spacing.s2,
                paddingHorizontal: theme.spacing.s3,
                borderRadius: theme.radius.button,
                backgroundColor: isSelected ? theme.colors.accent : theme.colors.surface,
                borderWidth: 2,
                borderColor: isSelected ? theme.colors.accent : 'transparent',
              }}
            >
              <Text style={{ fontSize: 11, color: isSelected ? theme.colors.accentInk : theme.colors.inkSoft, fontWeight: '600' }}>
                {d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}
              </Text>
              <Text style={{ fontSize: 16, color: isSelected ? theme.colors.accentInk : theme.colors.ink, fontWeight: '700', textAlign: 'center' }}>
                {d.getUTCDate()}
              </Text>
            </Pressable>
          );
        }}
      />

      <View style={{ paddingHorizontal: theme.spacing.s4, paddingTop: theme.spacing.s3 }}>
        <Text style={{ fontSize: theme.type.caption.size, color: theme.colors.inkSoft }}>
          {formatDate(selectedDate)} · {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {isLoading ? (
        <LoadingState label="Loading…" />
      ) : appointments.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.inkSoft }}>No appointments on this day.</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.s4,
            paddingTop: theme.spacing.s3,
            paddingBottom: insets.bottom + theme.spacing.s5,
          }}
          renderItem={renderAppt}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.accent} />
          }
        />
      )}
    </View>
  );
}
