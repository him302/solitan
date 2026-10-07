/**
 * Appointment booking flow: pick service → pick date → pick slot → confirm.
 * Three-step wizard within one screen; no navigation between steps.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@soliton/ui';
import type { AvailabilitySlot } from '@soliton/api-contract';
import { useQuery } from '@tanstack/react-query';
import type { ServiceDto } from '@soliton/api-contract';
import { api } from '../../../src/api';
import { useAvailability, useBookAppointment } from '../../../src/hooks/useAppointments';
import { formatPrice, formatDuration } from '../../../src/utils/format';

type Step = 'service' | 'date' | 'slot';

/** Next 14 days as YYYY-MM-DD strings. */
function buildDateOptions(): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function BookAppointmentScreen() {
  const { salonId } = useLocalSearchParams<{ salonId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<ServiceDto | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  const dates = buildDateOptions();

  const { data: services = [], isLoading: loadingServices } = useQuery<ServiceDto[]>({
    queryKey: ['services', salonId],
    queryFn: () => api.services.list(salonId),
    enabled: !!salonId,
  });

  const { data: slots = [], isLoading: loadingSlots } = useAvailability(
    salonId,
    selectedService?.id ?? null,
    selectedDate,
  );

  const bookMutation = useBookAppointment();

  async function handleConfirm() {
    if (!selectedService || !selectedSlot || !salonId) return;
    try {
      const appt = await bookMutation.mutateAsync({
        salonId,
        serviceId: selectedService.id,
        scheduledAt: selectedSlot.startsAt,
        idempotencyKey: `${salonId}-${selectedService.id}-${selectedSlot.startsAt}-${Date.now()}`,
      });
      router.replace(`/appointment/${appt.id}` as any);
    } catch (err: any) {
      Alert.alert('Booking failed', err?.message ?? 'Please try another slot.');
    }
  }

  const s = styles(theme);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => {
          if (step === 'service') router.back();
          else if (step === 'date') setStep('service');
          else setStep('date');
        }} accessibilityRole="button" style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>
          {step === 'service' ? 'Choose Service' : step === 'date' ? 'Choose Date' : 'Choose Time'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step: service */}
      {step === 'service' && (
        <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
          {loadingServices ? (
            <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 40 }} />
          ) : services.length === 0 ? (
            <Text style={s.emptyText}>No services available for this salon.</Text>
          ) : (
            services.map((svc) => (
              <Pressable
                key={svc.id}
                style={[s.optionCard, selectedService?.id === svc.id && s.optionCardSelected]}
                onPress={() => { setSelectedService(svc); setStep('date'); }}
                accessibilityRole="button"
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.optionTitle}>{svc.name}</Text>
                  <Text style={s.optionSub}>
                    {formatDuration(svc.estimatedMinutes)} · {formatPrice(svc.priceCents)}
                  </Text>
                </View>
                <Text style={s.optionArrow}>›</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Step: date */}
      {step === 'date' && (
        <FlatList
          data={dates}
          keyExtractor={(d) => d}
          contentContainerStyle={s.contentInner}
          renderItem={({ item: date }) => (
            <Pressable
              style={[s.optionCard, selectedDate === date && s.optionCardSelected]}
              onPress={() => { setSelectedDate(date); setStep('slot'); }}
              accessibilityRole="button"
            >
              <Text style={s.optionTitle}>{formatDate(date)}</Text>
              <Text style={s.optionArrow}>›</Text>
            </Pressable>
          )}
        />
      )}

      {/* Step: slot */}
      {step === 'slot' && (
        <>
          <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
            {loadingSlots ? (
              <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 40 }} />
            ) : slots.length === 0 ? (
              <Text style={s.emptyText}>No slots available on this day. Try another date.</Text>
            ) : (
              <View style={s.slotsGrid}>
                {slots.map((slot) => (
                  <Pressable
                    key={slot.startsAt}
                    style={[
                      s.slotBtn,
                      !slot.available && s.slotBtnUnavail,
                      selectedSlot?.startsAt === slot.startsAt && s.slotBtnSelected,
                    ]}
                    onPress={() => slot.available && setSelectedSlot(slot)}
                    accessibilityRole="button"
                    disabled={!slot.available}
                  >
                    <Text style={[
                      s.slotTime,
                      !slot.available && s.slotTimeUnavail,
                      selectedSlot?.startsAt === slot.startsAt && s.slotTimeSelected,
                    ]}>
                      {formatTime(slot.startsAt)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          {selectedSlot && (
            <View style={[s.confirmBar, { paddingBottom: insets.bottom + 16 }]}>
              <View style={{ marginBottom: 8 }}>
                <Text style={s.confirmDetail}>
                  {selectedService?.name} · {formatDate(selectedDate!)} · {formatTime(selectedSlot.startsAt)}
                </Text>
              </View>
              <Pressable
                style={[s.confirmBtn, bookMutation.isPending && { opacity: 0.6 }]}
                onPress={handleConfirm}
                accessibilityRole="button"
                disabled={bookMutation.isPending}
              >
                {bookMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.confirmBtnText}>Confirm Booking</Text>
                )}
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function styles(theme: ReturnType<typeof useTheme>) {
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
    content: { flex: 1 },
    contentInner: { padding: theme.spacing.s4 },
    emptyText: { color: theme.colors.inkSoft, textAlign: 'center', marginTop: 40 },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      padding: theme.spacing.s4,
      marginBottom: theme.spacing.s3,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionCardSelected: { borderColor: theme.colors.accent },
    optionTitle: {
      fontSize: theme.type.label.size,
      fontWeight: theme.type.label.weight,
      color: theme.colors.ink,
    },
    optionSub: { fontSize: theme.type.caption.size, color: theme.colors.inkSoft, marginTop: 2 },
    optionArrow: { fontSize: 20, color: theme.colors.inkSoft },
    slotsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.s2,
    },
    slotBtn: {
      paddingVertical: theme.spacing.s2,
      paddingHorizontal: theme.spacing.s3,
      borderRadius: theme.radius.button,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: 'transparent',
      minWidth: 80,
      alignItems: 'center',
    },
    slotBtnUnavail: { opacity: 0.35 },
    slotBtnSelected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '22' },
    slotTime: { fontSize: theme.type.body.size, color: theme.colors.ink },
    slotTimeUnavail: { color: theme.colors.inkSoft },
    slotTimeSelected: { color: theme.colors.accent, fontWeight: '700' },
    confirmBar: {
      padding: theme.spacing.s4,
      borderTopWidth: 1,
      borderTopColor: theme.colors.line,
      backgroundColor: theme.colors.bg,
    },
    confirmDetail: {
      fontSize: theme.type.caption.size,
      color: theme.colors.inkSoft,
      textAlign: 'center',
    },
    confirmBtn: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.button,
      paddingVertical: theme.spacing.s3,
      alignItems: 'center',
    },
    confirmBtnText: { color: theme.colors.accentInk, fontWeight: '700', fontSize: theme.type.label.size },
  });
}
