import { useCallback, useEffect, useRef } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme, Card, LoadingState, ErrorState, EmptyState } from '@soliton/ui';
import type { NotificationDto, NotificationListDto } from '@soliton/api-contract';
import { api } from '../src/api';

const KEY = ['notifications'];

/**
 * The in-app notification inbox (Part 11).
 *
 * This is the `in_app` channel: rows the server persisted. The badge on each row names
 * the channel, because Part 11 requires in-app, local-device and external notifications
 * be distinguishable rather than blurred into "notifications".
 */
export default function NotificationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<NotificationListDto>({
    queryKey: KEY,
    queryFn: () => api.notifications.list({ limit: 50 }),
  });

  const markRead = useMutation({
    mutationFn: (ids?: string[]) => api.notifications.markRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  // Opening the inbox is the act of reading it, so everything is marked read on entry
  // rather than requiring a separate tap. Guarded by a ref rather than by the unread
  // count: marking read changes that count, which would otherwise re-trigger the effect.
  const markedOnOpen = useRef(false);
  useEffect(() => {
    if (markedOnOpen.current) return;
    if (!data || data.unreadCount === 0) return;
    markedOnOpen.current = true;
    markRead.mutate(undefined);
  }, [data, markRead]);

  const open = useCallback(
    (item: NotificationDto) => {
      // Deep-link where the payload allows it; otherwise the row is informational.
      const entryId = typeof item.data.entryId === 'string' ? item.data.entryId : null;
      if (entryId) router.push(`/queue/${entryId}`);
    },
    [router],
  );

  if (isLoading) return <LoadingState label="Loading notifications…" />;
  if (isError) {
    return (
      <ErrorState
        title="Could not load notifications"
        onRetry={() => refetch()}
        retryLabel="Retry"
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.s3,
          paddingHorizontal: theme.spacing.s4,
          paddingBottom: theme.spacing.s3,
        }}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={{ fontSize: 22, color: theme.colors.ink }}>‹</Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: theme.type.title.size,
            fontWeight: theme.type.title.weight,
            color: theme.colors.ink,
          }}
        >
          Notifications
        </Text>
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s5,
          gap: theme.spacing.s2,
        }}
        ListEmptyComponent={
          <EmptyState
            title="Nothing yet"
            body="Updates about your queue will appear here — when your turn is close, when a salon runs late, and when your service is done."
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} accessibilityRole="button">
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 }}>
                <Text
                  style={{
                    flex: 1,
                    fontSize: theme.type.label.size,
                    fontWeight: theme.type.label.weight,
                    color: theme.colors.ink,
                  }}
                >
                  {item.title}
                </Text>
                {item.readAt === null && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.colors.accent,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  color: theme.colors.inkSoft,
                  fontSize: theme.type.body.size,
                  marginTop: 2,
                }}
              >
                {item.body}
              </Text>
              <Text
                style={{
                  color: theme.colors.inkSoft,
                  fontSize: theme.type.caption.size,
                  marginTop: theme.spacing.s2,
                }}
              >
                {formatWhen(item.createdAt)} · In-app
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

/** Relative for recent items, absolute once it stops being useful. */
function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) {
    const hours = Math.round(minutes / 60);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  return new Date(iso).toLocaleDateString();
}
