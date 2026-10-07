/**
 * Complaint / report-a-problem screen.
 * Reached from appointment detail → Help / Report Problem.
 * Query params: appointmentId (optional), salonId (optional).
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
import { COMPLAINT_CATEGORIES, type ComplaintCategory } from '@soliton/api-contract';
import { useSubmitComplaint } from '../../src/hooks/useComplaints';

const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  service: 'Service issue',
  wait_time: 'Long waiting time',
  booking: 'Booking issue',
  staff_behaviour: 'Staff behaviour',
  payment: 'Payment issue',
  other: 'Other',
};

export default function ComplaintScreen() {
  const { appointmentId, salonId } = useLocalSearchParams<{
    appointmentId?: string;
    salonId?: string;
  }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState<ComplaintCategory | null>(null);
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useSubmitComplaint();

  const s = styles(theme);

  if (submitted) {
    return (
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        <View style={s.centerContent}>
          <Text style={{ fontSize: 64, textAlign: 'center' }}>✅</Text>
          <Text style={[s.title, { marginTop: 16 }]}>Complaint Submitted</Text>
          <Text style={s.subtitle}>Your complaint has been submitted. Our team will review it shortly.</Text>
          <Pressable style={s.primaryBtn} onPress={() => router.back()} accessibilityRole="button">
            <Text style={s.primaryBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  async function handleSubmit() {
    if (!category) {
      Alert.alert('Category required', 'Please select what went wrong.');
      return;
    }
    if (body.trim().length < 10) {
      Alert.alert('Description too short', 'Please describe what happened (at least 10 characters).');
      return;
    }
    try {
      await submitMutation.mutateAsync({
        category,
        body: body.trim(),
        appointmentId: appointmentId || undefined,
        salonId: salonId || undefined,
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
        <Text style={s.headerTitle}>Report a Problem</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.sectionLabel}>What went wrong?</Text>

        {COMPLAINT_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[s.categoryRow, category === cat && s.categoryRowSelected]}
            onPress={() => setCategory(cat)}
            accessibilityRole="radio"
            accessibilityState={{ selected: category === cat }}
          >
            <View style={[s.radio, category === cat && s.radioSelected]} />
            <Text style={[s.categoryLabel, category === cat && s.categoryLabelSelected]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        ))}

        <Text style={[s.sectionLabel, { marginTop: theme.spacing.s5 }]}>Description</Text>
        <TextInput
          style={s.textInput}
          multiline
          numberOfLines={5}
          maxLength={1000}
          placeholder="Describe what happened…"
          placeholderTextColor={theme.colors.inkSoft}
          value={body}
          onChangeText={setBody}
          accessibilityLabel="Complaint description"
        />
        <Text style={s.charCount}>{body.length} / 1000</Text>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[s.primaryBtn, submitMutation.isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitMutation.isPending}
          accessibilityRole="button"
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryBtnText}>Submit</Text>
          )}
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
    content: { padding: theme.spacing.s4 },
    sectionLabel: {
      fontSize: theme.type.label.size,
      fontWeight: theme.type.label.weight,
      color: theme.colors.ink,
      marginBottom: theme.spacing.s3,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.s3,
      borderRadius: theme.radius.card,
      marginBottom: theme.spacing.s2,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: 'transparent',
      gap: theme.spacing.s3,
    },
    categoryRowSelected: { borderColor: theme.colors.accent },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.line,
    },
    radioSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent,
    },
    categoryLabel: {
      fontSize: theme.type.body.size,
      color: theme.colors.ink,
    },
    categoryLabelSelected: { color: theme.colors.accent, fontWeight: '600' },
    textInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.input,
      borderWidth: 1,
      borderColor: theme.colors.line,
      padding: theme.spacing.s3,
      fontSize: theme.type.body.size,
      color: theme.colors.ink,
      textAlignVertical: 'top',
      minHeight: 120,
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
    },
    primaryBtn: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.button,
      paddingVertical: theme.spacing.s3,
      alignItems: 'center',
    },
    primaryBtnText: { color: theme.colors.accentInk, fontWeight: '700', fontSize: theme.type.label.size },
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
