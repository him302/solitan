import { useEffect, useRef } from 'react';
import { RealtimeClient } from '@soliton/realtime-client';
import { entryRoom } from '@soliton/api-contract';
import type { RealtimeEvent, Snapshot, QueueEntryDto } from '@soliton/api-contract';
import { tokenStorage } from '../auth/tokenStorage';
import { env } from '../env';

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
 */
export function useEntryRealtime(
  entryId: string | null | undefined,
  onUpdate: (entry: QueueEntryDto) => void,
): void {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!entryId) return;
    const room = entryRoom(entryId);
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const client = await getClient();
        if (cancelled) return;

        const handleEvent = (event: RealtimeEvent) => {
          if (event.payload && typeof event.payload === 'object') {
            onUpdateRef.current(event.payload as QueueEntryDto);
          }
        };

        const handleSnapshot = (snapshot: Snapshot) => {
          if (snapshot.room === room && snapshot.state) {
            onUpdateRef.current(snapshot.state as QueueEntryDto);
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
      cleanup?.();
    };
  }, [entryId]);
}
