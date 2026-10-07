import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Card, Status, LoadingState, ErrorState } from '@soliton/ui';
import type { EntryState, StaffEntryRow } from '@soliton/api-contract';
import { useMySalon } from '../../src/hooks/useMySalon';
import {
  useSalonQueue,
  useNotifyEntry,
  useCheckInEntry,
  useStartService,
  useCompleteService,
  useMarkNoShow,
  usePauseQueue,
  useResumeQueue,
  useCloseQueue,
} from '../../src/hooks/useQueue';

type QueueStatus = 'open' | 'paused' | 'closed';

function statusKind(queueStatus: QueueStatus): 'success' | 'warning' | 'neutral' {
  if (queueStatus === 'open') return 'success';
  if (queueStatus === 'paused') return 'warning';
  return 'neutral';
}

function entryStateColor(state: EntryState, colors: ReturnType<typeof useTheme>['colors']): string {
  switch (state) {
    case 'in_service': return colors.warmYellow;
    case 'notified':
    case 'checked_in': return colors.accent;
    case 'completed': return colors.success;
    case 'no_show':
    case 'cancelled':
    case 'bumped': return colors.danger;
    default: return colors.inkSoft;
  }
}

export default function QueueScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: salon, isLoading: salonLoading } = useMySalon();
  const salonId = salon?.id;

  const { data: queue, isLoading: queueLoading, isError, refetch, isRefetching } = useSalonQueue(salonId);

  const notify       = useNotifyEntry(salonId);
  const checkIn      = useCheckInEntry(salonId);
  const startService = useStartService(salonId);
  const complete     = useCompleteService(salonId);
  const noShow       = useMarkNoShow(salonId);
  const pause        = usePauseQueue(salonId);
  const resume       = useResumeQueue(salonId);
  const close        = useCloseQueue(salonId);

  const isLoading = salonLoading || (queueLoading && !queue);

  if (isLoading) return <LoadingState label="Loading queue…" />;
  if (isError || !queue) {
    return <ErrorState title="Could not load queue" onRetry={() => void refetch()} retryLabel="Retry" />;
  }

  const queueStatus = queue.status as QueueStatus;
  const waiting   = queue.entries.filter((e) => ['waiting', 'notified', 'checked_in'].includes(e.entryState));
  const inService = queue.entries.filter((e) => e.entryState === 'in_service');

  function confirmAction(message: string, onConfirm: () => void) {
    Alert.alert('', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: onConfirm },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + theme.spacing.s4, paddingBottom: insets.bottom + theme.spacing.s6, paddingHorizontal: theme.spacing.s4, gap: theme.spacing.s4 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: theme.type.title.size, fontWeight: theme.type.title.weight, color: theme.colors.ink }}>
          Live Queue
        </Text>
        <Status kind={statusKind(queueStatus)} label={capitalize(queueStatus)} />
      </View>

      <Card>
        <View style={{ flexDirection: 'row', gap: theme.spacing.s4 }}>
          <StatBox label="Waiting"    value={String(waiting.length)}   theme={theme} />
          <StatBox label="In Service" value={String(inService.length)} theme={theme} />
          {queue.etaMinutes !== null && (
            <StatBox label="ETA" value={`~${queue.etaMinutes}m`} theme={theme} />
          )}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s2 }}>
        {queueStatus === 'open' && (
          <ActionButton label="Pause Queue"  color={theme.colors.warning} onPress={() => void pause.mutateAsync()}  loading={pause.isPending}  theme={theme} />
        )}
        {queueStatus === 'paused' && (
          <ActionButton label="Resume Queue" color={theme.colors.accent}  onPress={() => void resume.mutateAsync()} loading={resume.isPending} theme={theme} />
        )}
        {queueStatus !== 'closed' && (
          <ActionButton label="Close Queue"  color={theme.colors.danger}  onPress={() => confirmAction('Close queue?', () => void close.mutateAsync())} loading={close.isPending}  theme={theme} />
        )}
      </View>

      {inService.length > 0 && (
        <View style={{ gap: theme.spacing.s2 }}>
          <Text style={{ fontSize: theme.type.section.size, fontWeight: theme.type.section.weight, color: theme.colors.ink }}>In Service</Text>
          {inService.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onComplete={() => void complete.mutateAsync(entry.id)}
              isCompletePending={complete.isPending}
              theme={theme}
            />
          ))}
        </View>
      )}

      <View style={{ gap: theme.spacing.s2 }}>
        <Text style={{ fontSize: theme.type.section.size, fontWeight: theme.type.section.weight, color: theme.colors.ink }}>Waiting</Text>
        {waiting.length === 0 ? (
          <Card>
            <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>Queue is empty</Text>
            <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, textAlign: 'center', marginTop: theme.spacing.s1 }}>
              Customers will appear here when they join.
            </Text>
          </Card>
        ) : (
          waiting.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onNotify={entry.entryState === 'waiting' ? () => void notify.mutateAsync(entry.id) : undefined}
              onCheckIn={entry.entryState === 'notified' ? () => void checkIn.mutateAsync(entry.id) : undefined}
              onStart={entry.entryState === 'checked_in' ? () => void startService.mutateAsync({ entryId: entry.id, input: {} }) : undefined}
              onNoShow={() => confirmAction('Mark as no-show?', () => void noShow.mutateAsync(entry.id))}
              isNotifyPending={notify.isPending}
              isCheckInPending={checkIn.isPending}
              isStartPending={startService.isPending}
              isNoShowPending={noShow.isPending}
              theme={theme}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatBox({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: theme.type.numeric.size, fontWeight: theme.type.numeric.weight, color: theme.colors.ink, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text style={{ fontSize: theme.type.caption.size, color: theme.colors.inkSoft }}>{label}</Text>
    </View>
  );
}

function ActionButton({ label, color, onPress, loading, theme }: { label: string; color: string; onPress: () => void; loading: boolean; theme: ReturnType<typeof useTheme> }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={{ borderWidth: theme.borderWidth.hairline, borderColor: color, borderRadius: theme.radius.button, paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s2, minHeight: theme.minTouchTarget, justifyContent: 'center', opacity: loading ? 0.5 : 1 }}
    >
      <Text style={{ color, fontWeight: '600', fontSize: theme.type.caption.size }}>{label}</Text>
    </Pressable>
  );
}

function SmallAction({ label, color, onPress, loading, theme }: { label: string; color: string; onPress: () => void; loading: boolean; theme: ReturnType<typeof useTheme> }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={{ backgroundColor: color, borderRadius: theme.radius.button, paddingHorizontal: theme.spacing.s3, paddingVertical: theme.spacing.s1, opacity: loading ? 0.5 : 1 }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: theme.type.caption.size }}>{label}</Text>
    </Pressable>
  );
}

function EntryCard({ entry, onNotify, onCheckIn, onStart, onComplete, onNoShow, isNotifyPending = false, isCheckInPending = false, isStartPending = false, isCompletePending = false, isNoShowPending = false, theme }: {
  entry: StaffEntryRow;
  onNotify?: () => void;
  onCheckIn?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onNoShow?: () => void;
  isNotifyPending?: boolean;
  isCheckInPending?: boolean;
  isStartPending?: boolean;
  isCompletePending?: boolean;
  isNoShowPending?: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  const stateColor = entryStateColor(entry.entryState, theme.colors);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 }}>
          <Text style={{ fontSize: theme.type.numeric.size, fontWeight: theme.type.numeric.weight, color: theme.colors.ink, fontVariant: ['tabular-nums'] }}>
            #{entry.tokenNumber}
          </Text>
          <View style={{ backgroundColor: stateColor, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.s2, paddingVertical: 2 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
              {entry.entryState.replace('_', ' ')}
            </Text>
          </View>
        </View>
        {entry.etaMinutes !== null && (
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>~{entry.etaMinutes}m</Text>
        )}
      </View>

      <Text style={{ color: theme.colors.ink, fontSize: theme.type.body.size, marginTop: theme.spacing.s1 }}>{entry.serviceName}</Text>
      {entry.chairLabel && (
        <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>Chair: {entry.chairLabel}</Text>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s2, marginTop: theme.spacing.s3 }}>
        {onNotify  && <SmallAction label="Notify"       color={theme.colors.accent}  onPress={onNotify}  loading={isNotifyPending}  theme={theme} />}
        {onCheckIn && <SmallAction label="Check In"     color={theme.colors.accent}  onPress={onCheckIn} loading={isCheckInPending} theme={theme} />}
        {onStart   && <SmallAction label="Start"        color={theme.colors.success} onPress={onStart}   loading={isStartPending}   theme={theme} />}
        {onComplete && <SmallAction label="Complete"    color={theme.colors.success} onPress={onComplete} loading={isCompletePending} theme={theme} />}
        {onNoShow  && <SmallAction label="No Show"      color={theme.colors.danger}  onPress={onNoShow}  loading={isNoShowPending}  theme={theme} />}
      </View>
    </Card>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
