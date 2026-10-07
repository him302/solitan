/**
 * Review submission screen. Reached after appointment completion.
 * Customer selects 1-5 stars and optionally writes a comment.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@soliton/ui';
import { useQuery } from '@tanstack/react-query';
import type { AppointmentDto } from '@soliton/api-contract';
import { api } from '../../src/api';
import { useSubmitReview, useReviewForAppointment } from '../../src/hooks/useReviews';

const MAX_COMMENT = 500;

function StarRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginVertical: 16 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          accessibilityRole="button"
          accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
          accessibilityState={{ selected: value >= n }}
          style={{ padding: 4 }}
        >
          <Text style={{ fontSize: 40, color: value >= n ? theme.colors.warmYellow : theme.colors.line }}>
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function ReviewScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: appt } = useQuery<AppointmentDto | null>({
    queryKey: ['appointments', appointmentId],
    queryFn: () => (appointmentId ? api.appointments.get(appointmentId) : null),
    enabled: !!appointmentId,
    staleTime: 60_000,
  });

  const { data: existing } = useReviewForAppointment(appointmentId ?? null);
  const submitMutation = useSubmitReview();

  const s = styles(theme);

  if (existing) {
    return (
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backBtnText}>←</Text>
          </Pressable>
          <Text style={s.headerTitle}>Review</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.centerContent}>
          <Text style={{ fontSize: 48, textAlign: 'center' }}>✅</Text>
          <Text style={[s.title, { marginTop: 16 }]}>Already submitted</Text>
          <Text style={s.subtitle}>You have already reviewed this visit.</Text>
          <Pressable style={s.primaryBtn} onPress={() => router.back()} accessibilityRole="button">
            <Text style={s.primaryBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        <View style={s.centerContent}>
          <Text style={{ fontSize: 64, textAlign: 'center' }}>❤️</Text>
          <Text style={[s.title, { marginTop: 16 }]}>Thanks!</Text>
          <Text style={s.subtitle}>
            Your feedback helps people choose better salons.
          </Text>
          <Pressable
            style={s.primaryBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={s.primaryBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating.');
      return;
    }
    if (!appointmentId) return;
    try {
      await submitMutation.mutateAsync({
        appointmentId,
        rating,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (e: unknown) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backBtnText}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>How was your visit?</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {appt && (
          <Text style={s.salonName}>{appt.salonName}</Text>
        )}

        <StarRow value={rating} onChange={setRating} />

        <Text style={s.label}>Tell us what you think</Text>
        <TextInput
          style={s.textInput}
          multiline
          numberOfLines={4}
          maxLength={MAX_COMMENT}
          placeholder="Great service, quick and friendly…"
          placeholderTextColor={theme.colors.inkSoft}
          value={comment}
          onChangeText={setComment}
          accessibilityLabel="Review comment"
        />
        <Text style={s.charCount}>{comment.length} / {MAX_COMMENT}</Text>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[s.primaryBtn, (rating === 0 || submitMutation.isPending) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitMutation.isPending}
          accessibilityRole="button"
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryBtnText}>Submit Review</Text>
          )}
        </Pressable>
        <Pressable
          style={s.skipBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={s.skipBtnText}>Maybe later</Text>
        </Pressable>
      </View>
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
    content: { padding: theme.spacing.s4, alignItems: 'center' },
    salonName: {
      fontSize: theme.type.section.size,
      fontWeight: theme.type.section.weight,
      color: theme.colors.ink,
      textAlign: 'center',
      marginBottom: theme.spacing.s2,
    },
    label: {
      fontSize: theme.type.label.size,
      color: theme.colors.inkSoft,
      marginBottom: theme.spacing.s2,
      alignSelf: 'flex-start',
    },
    textInput: {
      width: '100%',
      minHeight: 100,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.input,
      borderWidth: 1,
      borderColor: theme.colors.line,
      padding: theme.spacing.s3,
      fontSize: theme.type.body.size,
      color: theme.colors.ink,
      textAlignVertical: 'top',
    },
    charCount: {
      fontSize: theme.type.caption.size,
      color: theme.colors.inkSoft,
      alignSelf: 'flex-end',
      marginTop: 4,
    },
    footer: {
      padding: theme.spacing.s4,
      borderTopWidth: 1,
      borderTopColor: theme.colors.line,
      gap: theme.spacing.s2,
    },
    primaryBtn: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.button,
      paddingVertical: theme.spacing.s3,
      alignItems: 'center',
    },
    primaryBtnText: { color: theme.colors.accentInk, fontWeight: '700', fontSize: theme.type.label.size },
    skipBtn: { paddingVertical: theme.spacing.s2, alignItems: 'center' },
    skipBtnText: { color: theme.colors.inkSoft, fontSize: theme.type.caption.size },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.s6,
    },
    title: {
      fontSize: theme.type.section.size,
      fontWeight: theme.type.section.weight,
      color: theme.colors.ink,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: theme.type.body.size,
      color: theme.colors.inkSoft,
      textAlign: 'center',
      marginTop: theme.spacing.s2,
      marginBottom: theme.spacing.s5,
    },
  });
}
