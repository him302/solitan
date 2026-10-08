import { useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
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
  useOpenQueue,
  useLimitQueue,
  useUndoComplete,
  useQueueSearch,
  useRespondLate,
  usePostAnnouncement,
  useAnnouncements,
} from '../../src/hooks/useQueue';

type QueueStatus = 'open' | 'limited' | 'paused' | 'closed';

function statusKind(s: QueueStatus): 'success' | 'warning' | 'neutral' {
  if (s === 'open') return 'success';
  if (s === 'limited' || s === 'paused') return 'warning';
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
  const [searchText, setSearchText] = useState('');
  const [announceText, setAnnounceText] = useState('');
  const [showAnnounceBox, setShowAnnounceBox] = useState(false);

  const { data: salon, isLoading: salonLoading } = useMySalon();
  const salonId = salon?.id;

  const { data: queue, isLoading: queueLoading, isError, refetch, isRefetching } = useSalonQueue(salonId);
  const { data: announcements = [] } = useAnnouncements(salonId);

  const notify       = useNotifyEntry(salonId);
  const checkIn      = useCheckInEntry(salonId);
  const startService = useStartService(salonId);
  const complete     = useCompleteService(salonId);
  const noShow       = useMarkNoShow(salonId);
  const pause        = usePauseQueue(salonId);
  const resume       = useResumeQueue(salonId);
  const close        = useCloseQueue(salonId);
  const open         = useOpenQueue(salonId);
  const limit        = useLimitQueue(salonId);
  const undoComplete = useUndoComplete(salonId);
  const respondLate  = useRespondLate(salonId);
  const postAnnounce = usePostAnnouncement(salonId);
  const search       = useQueueSearch(salonId);

  const isLoading = salonLoading || (queueLoading && !queue);

  if (isLoading) return <LoadingState label="Loading queue…" />;
  if (isError || !queue) {
    return <ErrorState title="Could not load queue" onRetry={() => void refetch()} retryLabel="Retry" />;
  }

  const queueStatus = queue.status as QueueStatus;
  const waiting   = queue.entries.filter((e) => ['waiting', 'notified', 'checked_in'].includes(e.entryState));
  const inService = queue.entries.filter((e) => e.entryState === 'in_service');
  const recentCompleted = queue.entries.filter((e) => e.entryState === 'completed').slice(0, 3);

  // Entries that need late response from owner
  const lateEntries = waiting.filter((e) => e.lateMinutes != null && !e.lateAction);

  const displayEntries = searchText.trim().length >= 1 && search.data
    ? search.data
    : null;

  function confirmAction(message: string, onConfirm: () => void) {
    Alert.alert('', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: onConfirm },
    ]);
  }

  async function handleSearch(text: string) {
    setSearchText(text);
    if (text.trim().length >= 1) {
      await search.mutateAsync(text.trim()).catch(() => null);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + theme.spacing.s4, paddingBottom: insets.bottom + theme.spacing.s6, paddingHorizontal: theme.spacing.s4, gap: theme.spacing.s4 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: theme.type.title.size, fontWeight: theme.type.title.weight, color: theme.colors.ink }}>
          Live Queue
        </Text>
        <Status kind={statusKind(queueStatus)} label={capitalize(queueStatus)} />
      </View>

      {/* Stats */}
      <Card>
        <View style={{ flexDirection: 'row', gap: theme.spacing.s4 }}>
          <StatBox label="Waiting"    value={String(waiting.length)}   theme={theme} />
          <StatBox label="In Service" value={String(inService.length)} theme={theme} />
          {queue.etaMinutes !== null && (
            <StatBox label="ETA" value={`~${queue.etaMinutes}m`} theme={theme} />
          )}
        </View>
      </Card>

      {/* Queue controls — scenario 4, 23, 26 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s2 }}>
        {(queueStatus === 'paused' || queueStatus === 'closed' || queueStatus === 'limited') && (
          <ActionButton label="Open Queue"    color={theme.colors.success} onPress={() => void open.mutateAsync()}   loading={open.isPending}   theme={theme} />
        )}
        {queueStatus === 'open' && (
          <ActionButton label="Limit Queue"   color={theme.colors.warning} onPress={() => void limit.mutateAsync()}  loading={limit.isPending}  theme={theme} />
        )}
        {(queueStatus === 'open' || queueStatus === 'limited') && (
          <ActionButton label="Pause Queue"   color={theme.colors.warning} onPress={() => void pause.mutateAsync()}  loading={pause.isPending}  theme={theme} />
        )}
        {queueStatus === 'paused' && (
          <ActionButton label="Resume Queue"  color={theme.colors.accent}  onPress={() => void resume.mutateAsync()} loading={resume.isPending} theme={theme} />
        )}
        {queueStatus !== 'closed' && (
          <ActionButton label="Close Queue"   color={theme.colors.danger}  onPress={() => confirmAction('Close queue for the day?', () => void close.mutateAsync())} loading={close.isPending}  theme={theme} />
        )}
        <ActionButton label="Announce"        color={theme.colors.inkSoft} onPress={() => setShowAnnounceBox(!showAnnounceBox)} loading={false} theme={theme} />
      </View>

      {/* Announce panel — scenario 3 */}
      {showAnnounceBox && (
        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.ink, marginBottom: 8 }}>Post Announcement</Text>
          <TextInput
            value={announceText}
            onChangeText={setAnnounceText}
            placeholder="e.g. Taking a 15-minute break, back shortly…"
            placeholderTextColor={theme.colors.inkSoft}
            multiline
            style={{ borderWidth: 1, borderColor: theme.colors.line, borderRadius: 8, padding: 10, color: theme.colors.ink, fontSize: 14, minHeight: 60 }}
          />
          <Pressable
            onPress={async () => {
              if (!announceText.trim()) return;
              await postAnnounce.mutateAsync({ body: announceText.trim(), type: 'info' }).catch(() => null);
              setAnnounceText('');
              setShowAnnounceBox(false);
            }}
            disabled={postAnnounce.isPending}
            style={{ marginTop: 8, backgroundColor: theme.colors.accent, borderRadius: 8, paddingVertical: 8, alignItems: 'center', opacity: postAnnounce.isPending ? 0.5 : 1 }}
          >
            <Text style={{ color: theme.colors.accentInk, fontWeight: '600' }}>Post</Text>
          </Pressable>
        </Card>
      )}

      {/* Search — scenario 20 */}
      <View style={{ borderWidth: 1, borderColor: theme.colors.line, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: theme.colors.surface2 }}>
        <Text style={{ color: theme.colors.inkSoft, fontSize: 16, marginRight: 6 }}>🔍</Text>
        <TextInput
          value={searchText}
          onChangeText={(t) => void handleSearch(t)}
          placeholder="Search by name, token or phone…"
          placeholderTextColor={theme.colors.inkSoft}
          style={{ flex: 1, paddingVertical: 10, color: theme.colors.ink, fontSize: 14 }}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {/* Search results */}
      {searchText.trim().length >= 1 && (
        <View style={{ gap: theme.spacing.s2 }}>
          <Text style={{ fontSize: theme.type.section.size, fontWeight: theme.type.section.weight, color: theme.colors.ink }}>
            Search Results {search.data ? `(${search.data.length})` : ''}
          </Text>
          {search.isPending && <Text style={{ color: theme.colors.inkSoft }}>Searching…</Text>}
          {search.data?.length === 0 && <Text style={{ color: theme.colors.inkSoft }}>No entries found.</Text>}
          {(displayEntries ?? []).map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onComplete={entry.entryState === 'in_service' ? () => void complete.mutateAsync(entry.id) : undefined}
              onNoShow={['waiting','notified','checked_in'].includes(entry.entryState) ? () => confirmAction('Mark as no-show?', () => void noShow.mutateAsync(entry.id)) : undefined}
              onUndoComplete={entry.entryState === 'completed' ? () => void undoComplete.mutateAsync(entry.id) : undefined}
              isCompletePending={complete.isPending}
              isNoShowPending={noShow.isPending}
              isUndoPending={undoComplete.isPending}
              theme={theme}
            />
          ))}
        </View>
      )}

      {/* Late reports needing response — scenario 1 */}
      {searchText.trim().length === 0 && lateEntries.length > 0 && (
        <View style={{ gap: theme.spacing.s2 }}>
          <Text style={{ fontSize: theme.type.section.size, fontWeight: theme.type.section.weight, color: theme.colors.danger }}>
            ⚠️ Running Late ({lateEntries.length})
          </Text>
          {lateEntries.map((entry) => (
            <LateResponseCard
              key={entry.id}
              entry={entry}
              onRespond={(action) => void respondLate.mutateAsync({ entryId: entry.id, input: { action } })}
              isPending={respondLate.isPending}
              theme={theme}
            />
          ))}
        </View>
      )}

      {/* In Service */}
      {searchText.trim().length === 0 && inService.length > 0 && (
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

      {/* Waiting */}
      {searchText.trim().length === 0 && (
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
      )}

      {/* Undo-complete for recent completions — scenario 19 */}
      {searchText.trim().length === 0 && recentCompleted.length > 0 && (
        <View style={{ gap: theme.spacing.s2 }}>
          <Text style={{ fontSize: theme.type.section.size, fontWeight: theme.type.section.weight, color: theme.colors.ink }}>
            Recently Completed
          </Text>
          {recentCompleted.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onUndoComplete={() => void undoComplete.mutateAsync(entry.id)}
              isUndoPending={undoComplete.isPending}
              theme={theme}
            />
          ))}
        </View>
      )}

      {/* Recent announcements feed */}
      {searchText.trim().length === 0 && announcements.length > 0 && (
        <View style={{ gap: theme.spacing.s2 }}>
          <Text style={{ fontSize: theme.type.section.size, fontWeight: theme.type.section.weight, color: theme.colors.ink }}>
            Announcements
          </Text>
          {announcements.slice(0, 5).map((a) => (
            <Card key={a.id} style={{ backgroundColor: theme.colors.surface2 }}>
              <Text style={{ color: theme.colors.inkSoft, fontSize: 11 }}>
                {new Date(a.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
              <Text style={{ color: theme.colors.ink, fontSize: 13, marginTop: 2 }}>{a.body}</Text>
            </Card>
          ))}
        </View>
      )}
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

function EntryCard({
  entry,
  onNotify, onCheckIn, onStart, onComplete, onNoShow, onUndoComplete,
  isNotifyPending = false, isCheckInPending = false, isStartPending = false,
  isCompletePending = false, isNoShowPending = false, isUndoPending = false,
  theme,
}: {
  entry: StaffEntryRow;
  onNotify?: () => void;
  onCheckIn?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onNoShow?: () => void;
  onUndoComplete?: () => void;
  isNotifyPending?: boolean;
  isCheckInPending?: boolean;
  isStartPending?: boolean;
  isCompletePending?: boolean;
  isNoShowPending?: boolean;
  isUndoPending?: boolean;
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
      {entry.customerName && (
        <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>{entry.customerName}</Text>
      )}
      {entry.customerPhone && (
        <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>{entry.customerPhone}</Text>
      )}
      {entry.preferredStaffName && (
        <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>Prefers: {entry.preferredStaffName}</Text>
      )}
      {entry.chairLabel && (
        <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>Chair: {entry.chairLabel}</Text>
      )}
      {entry.lateMinutes != null && (
        <Text style={{ color: entry.lateAction ? theme.colors.inkSoft : theme.colors.danger, fontSize: 12, marginTop: 2, fontWeight: '600' }}>
          {entry.lateMinutes === 0 ? "Can't make it" : `Running ~${entry.lateMinutes}m late`}
          {entry.lateAction ? ` → ${entry.lateAction}` : ' (awaiting response)'}
        </Text>
      )}
      {entry.slotStartAt && entry.slotEndAt && (
        <Text style={{ color: theme.colors.inkSoft, fontSize: 12, marginTop: 2 }}>
          Slot: {new Date(entry.slotStartAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          {' – '}
          {new Date(entry.slotEndAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </Text>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s2, marginTop: theme.spacing.s3 }}>
        {onNotify     && <SmallAction label="Notify"       color={theme.colors.accent}  onPress={onNotify}     loading={isNotifyPending}   theme={theme} />}
        {onCheckIn    && <SmallAction label="Check In"     color={theme.colors.accent}  onPress={onCheckIn}    loading={isCheckInPending}  theme={theme} />}
        {onStart      && <SmallAction label="Start"        color={theme.colors.success} onPress={onStart}      loading={isStartPending}    theme={theme} />}
        {onComplete   && <SmallAction label="Complete"     color={theme.colors.success} onPress={onComplete}   loading={isCompletePending} theme={theme} />}
        {onUndoComplete && <SmallAction label="Undo"       color={theme.colors.warning} onPress={onUndoComplete} loading={isUndoPending}   theme={theme} />}
        {onNoShow     && <SmallAction label="No Show"      color={theme.colors.danger}  onPress={onNoShow}     loading={isNoShowPending}   theme={theme} />}
      </View>
    </Card>
  );
}

function LateResponseCard({ entry, onRespond, isPending, theme }: {
  entry: StaffEntryRow;
  onRespond: (action: 'keep' | 'move_behind' | 'skip' | 'contact') => void;
  isPending: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Card style={{ borderWidth: 1.5, borderColor: theme.colors.danger }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: theme.type.numeric.size, fontWeight: theme.type.numeric.weight, color: theme.colors.ink }}>#{entry.tokenNumber}</Text>
        <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 13 }}>
          {entry.lateMinutes === 0 ? "Can't make it" : `~${entry.lateMinutes}m late`}
        </Text>
      </View>
      {entry.customerName && <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>{entry.customerName}</Text>}
      <Text style={{ color: theme.colors.ink, fontSize: 13, marginTop: 2 }}>{entry.serviceName}</Text>
      <Text style={{ color: theme.colors.inkSoft, fontSize: 12, marginTop: 4 }}>How to handle?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        <SmallAction label="Keep Slot"    color={theme.colors.success} onPress={() => onRespond('keep')}        loading={isPending} theme={theme} />
        <SmallAction label="Move Behind"  color={theme.colors.warning} onPress={() => onRespond('move_behind')} loading={isPending} theme={theme} />
        <SmallAction label="Skip"         color={theme.colors.danger}  onPress={() => onRespond('skip')}        loading={isPending} theme={theme} />
        <SmallAction label="Contact"      color={theme.colors.inkSoft} onPress={() => onRespond('contact')}     loading={isPending} theme={theme} />
      </View>
    </Card>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
