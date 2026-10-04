import { useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
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

function statusKind(
  queueStatus: QueueStatus,
): 'success' | 'warning' | 'neutral' {
  if (queueStatus === 'open') return 'success';
  if (queueStatus === 'paused') return 'warning';
  return 'neutral';
}

function entryStateColor(state: EntryState, colors: ReturnType<typeof useTheme>['colors']): string {
  switch (state) {
    case 'in_service':
      return colors.warmYellow;
    case 'notified':
    case 'checked_in':
      return colors.accent;
    case 'completed':
      return colors.success;
    case 'no_show':
    case 'cancelled':
    case 'bumped':
      return colors.danger;
    default:
      return colors.inkSoft;
  }
}

/** Live queue dashboard for staff/owners. */
export default function QueueScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: salon, isLoading: salonLoading } = useMySalon();
  const salonId = salon?.id;

  const {
    data: queue,
    isLoading: queueLoading,
    isError,
    refetch,
    isRefetching,
  } = useSalonQueue(salonId);

  const notify = useNotifyEntry(salonId);
  const checkIn = useCheckInEntry(salonId);
  const startService = useStartService(salonId);
  const complete = useCompleteService(salonId);
  const noShow = useMarkNoShow(salonId);
  const pause = usePauseQueue(salonId);
  const resume = useResumeQueue(salonId);
  const close = useCloseQueue(salonId);

  const isLoading = salonLoading || (queueLoading && !queue);

  if (isLoading) return <LoadingState label={t('common.loading')} />;
  if (isError || !queue) {
    return (
      <ErrorState
        title={t('errors.loadFailed')}
        body={t('errors.networkError')}
        onRetry={() => void refetch()}
        retryLabel={t('common.retry')}
      />
    );
  }

  const queueStatus = queue.status as QueueStatus;
  const waiting = queue.entries.filter((e) =>
    ['waiting', 'notified', 'checked_in'].includes(e.entryState),
  );
  const inService = queue.entries.filter((e) => e.entryState === 'in_service');

  function confirmAction(message: string, onConfirm: () => void) {
    Alert.alert('', message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.done'), onPress: onConfirm },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.s4,
        paddingBottom: insets.bottom + theme.spacing.s6,
        paddingHorizontal: theme.spacing.s4,
        gap: theme.spacing.s4,
      }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
      }
    >
      {/* Title + queue status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            fontSize: theme.type.title.size,
            fontWeight: theme.type.title.weight,
            color: theme.colors.ink,
          }}
        >
          {t('staffQueue.title')}
        </Text>
        <Status
          kind={statusKind(queueStatus)}
          label={t(`staffQueue.queue${capitalize(queueStatus)}`)}
        />
      </View>

      {/* Stats row */}
      <Card>
        <View style={{ flexDirection: 'row', gap: theme.spacing.s4 }}>
          <StatBox label={t('staffQueue.waiting')} value={String(waiting.length)} theme={theme} />
          <StatBox label={t('staffQueue.inService')} value={String(inService.length)} theme={theme} />
          {queue.etaMinutes !== null && (
            <StatBox
              label={t('staffQueue.etaLabel', { minutes: queue.etaMinutes })}
              value={`~${queue.etaMinutes}m`}
              theme={theme}
            />
          )}
        </View>
      </Card>

      {/* Queue control buttons */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s2 }}>
        {queueStatus === 'open' && (
          <ActionButton
            label={t('staffQueue.pauseQueue')}
            color={theme.colors.warning}
            onPress={() => void pause.mutateAsync()}
            loading={pause.isPending}
            theme={theme}
          />
        )}
        {queueStatus === 'paused' && (
          <ActionButton
            label={t('staffQueue.resumeQueue')}
            color={theme.colors.accent}
            onPress={() => void resume.mutateAsync()}
            loading={resume.isPending}
            theme={theme}
          />
        )}
        {queueStatus !== 'closed' && (
          <ActionButton
            label={t('staffQueue.closeQueue')}
            color={theme.colors.danger}
            onPress={() =>
              confirmAction(t('staffQueue.confirmClose'), () => void close.mutateAsync())
            }
            loading={close.isPending}
            theme={theme}
          />
        )}
      </View>

      {/* In-service entries */}
      {inService.length > 0 && (
        <View style={{ gap: theme.spacing.s2 }}>
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
            }}
          >
            {t('staffQueue.inService')}
          </Text>
          {inService.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onComplete={() => void complete.mutateAsync(entry.id)}
              isCompletePending={complete.isPending}
              theme={theme}
              t={t}
            />
          ))}
        </View>
      )}

      {/* Waiting entries */}
      <View style={{ gap: theme.spacing.s2 }}>
        <Text
          style={{
            fontSize: theme.type.section.size,
            fontWeight: theme.type.section.weight,
            color: theme.colors.ink,
          }}
        >
          {t('staffQueue.waiting')}
        </Text>

        {waiting.length === 0 ? (
          <Card>
            <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
              {t('staffQueue.noEntries')}
            </Text>
            <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, textAlign: 'center', marginTop: theme.spacing.s1 }}>
              {t('staffQueue.noEntriesBody')}
            </Text>
          </Card>
        ) : (
          waiting.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onNotify={
                entry.entryState === 'waiting'
                  ? () => void notify.mutateAsync(entry.id)
                  : undefined
              }
              onCheckIn={
                entry.entryState === 'notified'
                  ? () => void checkIn.mutateAsync(entry.id)
                  : undefined
              }
              onStart={
                entry.entryState === 'checked_in'
                  ? () => void startService.mutateAsync({ entryId: entry.id, input: {} })
                  : undefined
              }
              onNoShow={() =>
                confirmAction(
                  t('staffQueue.confirmNoShow'),
                  () => void noShow.mutateAsync(entry.id),
                )
              }
              isNotifyPending={notify.isPending}
              isCheckInPending={checkIn.isPending}
              isStartPending={startService.isPending}
              isNoShowPending={noShow.isPending}
              theme={theme}
              t={t}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        style={{
          fontSize: theme.type.numeric.size,
          fontWeight: theme.type.numeric.weight,
          color: theme.colors.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: theme.type.caption.size, color: theme.colors.inkSoft }}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  color,
  onPress,
  loading,
  theme,
}: {
  label: string;
  color: string;
  onPress: () => void;
  loading: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={{
        borderWidth: theme.borderWidth.hairline,
        borderColor: color,
        borderRadius: theme.radius.button,
        paddingHorizontal: theme.spacing.s4,
        paddingVertical: theme.spacing.s2,
        minHeight: theme.minTouchTarget,
        justifyContent: 'center',
        opacity: loading ? 0.5 : 1,
      }}
    >
      <Text style={{ color, fontWeight: '600', fontSize: theme.type.caption.size }}>{label}</Text>
    </Pressable>
  );
}

function SmallAction({
  label,
  color,
  onPress,
  loading,
  theme,
}: {
  label: string;
  color: string;
  onPress: () => void;
  loading: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={{
        backgroundColor: color,
        borderRadius: theme.radius.button,
        paddingHorizontal: theme.spacing.s3,
        paddingVertical: theme.spacing.s1,
        opacity: loading ? 0.5 : 1,
      }}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontWeight: '600',
          fontSize: theme.type.caption.size,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EntryCard({
  entry,
  onNotify,
  onCheckIn,
  onStart,
  onComplete,
  onNoShow,
  isNotifyPending = false,
  isCheckInPending = false,
  isStartPending = false,
  isCompletePending = false,
  isNoShowPending = false,
  theme,
  t,
}: {
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
  t: ReturnType<typeof import('react-i18next').useTranslation>['t'];
}) {
  const stateColor = entryStateColor(entry.entryState, theme.colors);

  return (
    <Card>
      {/* Token + service */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 }}>
          <Text
            style={{
              fontSize: theme.type.numeric.size,
              fontWeight: theme.type.numeric.weight,
              color: theme.colors.ink,
              fontVariant: ['tabular-nums'],
            }}
          >
            {t('staffQueue.tokenLabel', { token: entry.tokenNumber })}
          </Text>
          <View
            style={{
              backgroundColor: stateColor,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.spacing.s2,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
              {t(`staffQueue.state.${entry.entryState}`)}
            </Text>
          </View>
        </View>
        {entry.etaMinutes !== null && (
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
            {t('staffQueue.etaLabel', { minutes: entry.etaMinutes })}
          </Text>
        )}
      </View>

      {/* Service name + chair */}
      <Text
        style={{
          color: theme.colors.ink,
          fontSize: theme.type.body.size,
          marginTop: theme.spacing.s1,
        }}
      >
        {entry.serviceName}
      </Text>
      {entry.chairLabel && (
        <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
          {t('staffQueue.chairLabel', { label: entry.chairLabel })}
        </Text>
      )}

      {/* Action buttons */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.s2,
          marginTop: theme.spacing.s3,
        }}
      >
        {onNotify && (
          <SmallAction
            label={t('staffQueue.notify')}
            color={theme.colors.accent}
            onPress={onNotify}
            loading={isNotifyPending}
            theme={theme}
          />
        )}
        {onCheckIn && (
          <SmallAction
            label={t('staffQueue.checkIn')}
            color={theme.colors.accent}
            onPress={onCheckIn}
            loading={isCheckInPending}
            theme={theme}
          />
        )}
        {onStart && (
          <SmallAction
            label={t('staffQueue.startService')}
            color={theme.colors.success}
            onPress={onStart}
            loading={isStartPending}
            theme={theme}
          />
        )}
        {onComplete && (
          <SmallAction
            label={t('staffQueue.complete')}
            color={theme.colors.success}
            onPress={onComplete}
            loading={isCompletePending}
            theme={theme}
          />
        )}
        {onNoShow && (
          <SmallAction
            label={t('staffQueue.noShow')}
            color={theme.colors.danger}
            onPress={onNoShow}
            loading={isNoShowPending}
            theme={theme}
          />
        )}
      </View>
    </Card>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
