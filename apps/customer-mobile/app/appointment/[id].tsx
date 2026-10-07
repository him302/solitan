/**
 * Appointment detail: smart arrival countdown, I'm On My Way, Check In CTAs.
 * Live-refreshes every 15s via refetchInterval.
 */
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme, Card, LoadingState, Status } from '@soliton/ui';
import type { AppointmentDto, AppointmentStatus } from '@soliton/api-contract';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api';
import { APPOINTMENTS_KEY, useCancelAppointment, useCheckIn, useOnWay } from '../../src/hooks/useAppointments';
import { formatPrice, formatDuration } from '../../src/utils/format';

function statusKind(status: AppointmentStatus): 'success' | 'warning' | 'neutral' | 'info' | 'danger' {
  switch (status) {
    case 'scheduled': return 'neutral';
    case 'confirmed': return 'info';
    case 'checked_in': return 'warning';
    case 'in_service': return 'warning';
    case 'completed': return 'success';
    case 'cancelled': return 'neutral';
    case 'no_show': return 'danger';
    default: return 'neutral';
  }
}

function statusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'scheduled': return 'Scheduled';
    case 'confirmed': return 'On My Way';
    case 'checked_in': return 'Checked In';
    case 'in_service': return 'In Service';
    case 'completed': return 'Done';
    case 'cancelled': return 'Cancelled';
    case 'no_show': return 'No Show';
    default: return status;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function ArrivalBanner({ appt }: { appt: AppointmentDto }) {
  const theme = useTheme();
  const now = Date.now();
  const arrival = new Date(appt.recommendedArrivalAt).getTime();
  const scheduled = new Date(appt.scheduledAt).getTime();

  if (appt.status !== 'scheduled' && appt.status !== 'confirmed') return null;
  if (arrival < now) return null;

  const minutesUntil = Math.round((arrival - now) / 60_000);

  return (
    <View style={{
      backgroundColor: theme.colors.accent + '18',
      borderRadius: theme.radius.card,
      padding: theme.spacing.s4,
      marginBottom: theme.spacing.s4,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.accent,
    }}>
      <Text style={{ color: theme.colors.ink, fontWeight: '700', fontSize: theme.type.label.size }}>
        Leave in {minutesUntil} min
      </Text>
      <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginTop: 4 }}>
        Recommended arrival: {formatDateTime(appt.recommendedArrivalAt)}
      </Text>
      <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
        Your appointment: {formatDateTime(appt.scheduledAt)}
      </Text>
    </View>
  );
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: appt, isLoading } = useQuery<AppointmentDto | null>({
    queryKey: [APPOINTMENTS_KEY, id],
    queryFn: () => (id ? api.appointments.get(id) : null),
    enabled: !!id,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  const onWayMutation = useOnWay();
  const checkInMutation = useCheckIn();
  const cancelMutation = useCancelAppointment();

  if (isLoading || !appt) return <LoadingState label="Loading appointment…" />;

  const s = ss(theme);
  const isActive = appt.status === 'scheduled' || appt.status === 'confirmed';
  const canOnWay = appt.status === 'scheduled';
  const canCheckIn = appt.status === 'scheduled' || appt.status === 'confirmed';
  const canCancel = isActive;

  async function handleOnWay() {
    try { await onWayMutation.mutateAsync(appt!.id); }
    catch (e: any) { Alert.alert('Error', e?.message ?? 'Could not update status.'); }
  }

  async function handleCheckIn() {
    try {
      const updated = await checkInMutation.mutateAsync(appt!.id);
      if (updated.linkedEntryId) {
        router.push(`/queue/${updated.linkedEntryId}` as any);
      }
    } catch (e: any) { Alert.alert('Error', e?.message ?? 'Could not check in.'); }
  }

  function confirmCancel() {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel?', [
      { text: 'No' },
      { text: 'Cancel Appointment', style: 'destructive', onPress: async () => {
        try { await cancelMutation.mutateAsync(appt!.id); router.back(); }
        catch (e: any) { Alert.alert('Error', e?.message ?? 'Could not cancel.'); }
      }},
    ]);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>Appointment</Text>
        <Status kind={statusKind(appt.status)} label={statusLabel(appt.status)} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <ArrivalBanner appt={appt} />

        <Card style={{ marginBottom: theme.spacing.s4 }}>
          <Text style={s.salonName}>{appt.salonName}</Text>
          {appt.salonAddress && <Text style={s.salonAddr}>{appt.salonAddress}</Text>}
          <View style={s.divider} />
          <Text style={s.fieldLabel}>Service</Text>
          <Text style={s.fieldValue}>{appt.serviceName}</Text>
          <Text style={s.fieldSub}>
            {formatDuration(appt.durationMinutes)} · {formatPrice(appt.servicePriceCents)}
          </Text>
          <View style={s.divider} />
          <Text style={s.fieldLabel}>Date & Time</Text>
          <Text style={s.fieldValue}>{formatDateTime(appt.scheduledAt)}</Text>
          {appt.notes && (
            <>
              <View style={s.divider} />
              <Text style={s.fieldLabel}>Notes</Text>
              <Text style={s.fieldValue}>{appt.notes}</Text>
            </>
          )}
        </Card>

        {appt.linkedEntryId && (
          <Pressable
            style={s.trackBtn}
            onPress={() => router.push(`/queue/${appt.linkedEntryId}` as any)}
            accessibilityRole="button"
          >
            <Text style={s.trackBtnText}>Track Queue Position →</Text>
          </Pressable>
        )}
      </ScrollView>

      {isActive && (
        <View style={[s.actionBar, { paddingBottom: insets.bottom + 16 }]}>
          {canOnWay && (
            <Pressable
              style={[s.secondaryBtn, onWayMutation.isPending && { opacity: 0.6 }]}
              onPress={handleOnWay}
              accessibilityRole="button"
              disabled={onWayMutation.isPending}
            >
              <Text style={s.secondaryBtnText}>I'm On My Way</Text>
            </Pressable>
          )}
          {canCheckIn && (
            <Pressable
              style={[s.primaryBtn, checkInMutation.isPending && { opacity: 0.6 }]}
              onPress={handleCheckIn}
              accessibilityRole="button"
              disabled={checkInMutation.isPending}
            >
              <Text style={s.primaryBtnText}>Check In</Text>
            </Pressable>
          )}
          {canCancel && (
            <Pressable
              style={s.cancelLink}
              onPress={confirmCancel}
              accessibilityRole="button"
            >
              <Text style={s.cancelLinkText}>Cancel appointment</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function ss(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.s4,
      paddingVertical: theme.spacing.s3,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.line,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    backBtnText: { fontSize: 22, color: theme.colors.ink },
    headerTitle: {
      fontSize: theme.type.label.size,
      fontWeight: theme.type.label.weight,
      color: theme.colors.ink,
    },
    content: { padding: theme.spacing.s4 },
    salonName: {
      fontSize: theme.type.section.size,
      fontWeight: theme.type.section.weight,
      color: theme.colors.ink,
    },
    salonAddr: { fontSize: theme.type.caption.size, color: theme.colors.inkSoft, marginTop: 2 },
    divider: { height: 1, backgroundColor: theme.colors.line, marginVertical: theme.spacing.s3 },
    fieldLabel: { fontSize: theme.type.caption.size, color: theme.colors.inkSoft, marginBottom: 2 },
    fieldValue: { fontSize: theme.type.body.size, color: theme.colors.ink },
    fieldSub: { fontSize: theme.type.caption.size, color: theme.colors.inkSoft, marginTop: 2 },
    trackBtn: {
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderRadius: theme.radius.button,
      paddingVertical: theme.spacing.s3,
      alignItems: 'center',
      marginBottom: theme.spacing.s4,
    },
    trackBtnText: { color: theme.colors.accent, fontWeight: '600', fontSize: theme.type.label.size },
    actionBar: {
      padding: theme.spacing.s4,
      borderTopWidth: 1,
      borderTopColor: theme.colors.line,
      backgroundColor: theme.colors.bg,
      gap: theme.spacing.s2,
    },
    primaryBtn: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.button,
      paddingVertical: theme.spacing.s3,
      alignItems: 'center',
    },
    primaryBtnText: { color: theme.colors.accentInk, fontWeight: '700', fontSize: theme.type.label.size },
    secondaryBtn: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: theme.colors.accent,
      borderRadius: theme.radius.button,
      paddingVertical: theme.spacing.s3,
      alignItems: 'center',
    },
    secondaryBtnText: { color: theme.colors.accent, fontWeight: '600', fontSize: theme.type.label.size },
    cancelLink: { paddingVertical: theme.spacing.s2, alignItems: 'center' },
    cancelLinkText: { color: theme.colors.inkSoft, fontSize: theme.type.caption.size },
  });
}
