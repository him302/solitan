import { useEffect, useRef } from 'react';
import { RealtimeClient } from '@soliton/realtime-client';
import { entryRoom } from '@soliton/api-contract';
import type { RealtimeEvent, Snapshot, QueueEntryDto } from '@soliton/api-contract';
import { tokenStorage } from '../auth/tokenStorage';
import { env } from '../env';
import { describeQueueChange, presentLocalNotification } from '../notifications/localNotifications';

/** Module-level client so we don't create a new socket on every re-render. */
let cachedClient: RealtimeClient | null = null;
let cachedToken: string | null = null;

async function getClient(): Promise<RealtimeClient> {
  const token = await tokenStorage.getAccessToken();
  // Recreate if the token changed (e.g. after refresh).
  if (cachedClient && cachedToken === token) return cachedClient;
  cachedClient?.disconnect();
  cachedToken = token;
  cachedClient = new RealtimeClient({
    url: env.apiBaseUrl,
    getToken: () => token ?? undefined,
  });
  cachedClient.connect();
  return cachedClient;
}

/**
 * Subscribes to an entry's realtime room.
 * Calls `onUpdate` whenever the server pushes a new entry state.
 * Requests a snapshot on subscribe so the view is immediately authoritative.
 *
 * Also raises a local device notification when the state change is one the customer needs
 * to act on (Part 11's local_device channel). Only state transitions are announced, and
 * only the ones that change what they should do — a notification per position change
 * would be unusable in a ten-person queue.
 */
export function useEntryRealtime(
  entryId: string | null | undefined,
  onUpdate: (entry: QueueEntryDto) => void,
): void {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Last seen state, so a notification is raised on genuine transitions rather than on
  // every snapshot. Reset when the subscription moves to a different entry.
  const previousRef = useRef<QueueEntryDto | null>(null);

  useEffect(() => {
    if (!entryId) return;
    const room = entryRoom(entryId);
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const client = await getClient();
        if (cancelled) return;

        const apply = (entry: QueueEntryDto) => {
          const change = describeQueueChange(previousRef.current, entry);
          previousRef.current = entry;
          onUpdateRef.current(entry);
          // Fire-and-forget: a notification must never delay the screen update.
          if (change) void presentLocalNotification(change.title, change.body);
        };

        const handleEvent = (event: RealtimeEvent) => {
          if (event.payload && typeof event.payload === 'object') {
            apply(event.payload as QueueEntryDto);
          }
        };

        const handleSnapshot = (snapshot: Snapshot) => {
          if (snapshot.room === room && snapshot.state) {
            apply(snapshot.state as QueueEntryDto);
          }
        };

        const unsubEvent = client.subscribe(room, handleEvent);
        const unsubSnapshot = client.onSnapshot(handleSnapshot);
        client.requestSnapshot(room);

        cleanup = () => {
          unsubEvent();
          unsubSnapshot();
        };
      } catch {
        // Realtime unavailable — screen falls back to HTTP polling via TanStack Query.
      }
    })();

    return () => {
      cancelled = true;
      previousRef.current = null;
      cleanup?.();
    };
  }, [entryId]);
}
