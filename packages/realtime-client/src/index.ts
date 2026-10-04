/**
 * @soliton/realtime-client
 *
 * Client abstraction over Socket.IO. The Socket.IO implementation is hidden behind a
 * minimal {@link SocketLike} seam so the client is unit-testable without a real socket
 * and consuming apps never touch Socket.IO directly.
 */
import { io, type Socket } from 'socket.io-client';
import {
  parseRoom,
  realtimeEventSchema,
  type RealtimeEvent,
  type Snapshot,
} from '@soliton/api-contract';

export type ConnectionStatus =
  'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export const REALTIME_EVENT = 'realtime:event';
export const SNAPSHOT_EVENT = 'snapshot';

/** Minimal socket surface the client depends on (satisfied by a Socket.IO socket). */
export interface SocketLike {
  readonly connected: boolean;
  on(event: string, listener: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  connect(): void;
  disconnect(): void;
}

export interface RealtimeClientConfig {
  url: string;
  /** Supplies the current access token for the authenticated handshake. */
  getToken?: () => string | undefined;
}

export type SocketFactory = (config: RealtimeClientConfig) => SocketLike;

type EventHandler = (event: RealtimeEvent) => void;
type SnapshotHandler = (snapshot: Snapshot) => void;

function defaultSocketFactory(config: RealtimeClientConfig): SocketLike {
  const socket: Socket = io(config.url, {
    autoConnect: false,
    transports: ['websocket'],
    auth: { token: config.getToken?.() },
  });
  // The Socket.IO socket satisfies SocketLike at runtime; cast past its richer typings.
  return socket as unknown as SocketLike;
}

export class RealtimeClient {
  private socket: SocketLike | null = null;
  private status: ConnectionStatus = 'idle';
  private readonly rooms = new Set<string>();
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>();
  private readonly roomHandlers = new Map<string, Set<EventHandler>>();
  private readonly snapshotHandlers = new Set<SnapshotHandler>();

  constructor(
    private readonly config: RealtimeClientConfig,
    private readonly socketFactory: SocketFactory = defaultSocketFactory,
  ) {}

  get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  connect(): void {
    if (this.socket) return;
    this.setStatus('connecting');
    const socket = this.socketFactory(this.config);
    this.socket = socket;
    socket.on('connect', () => this.handleConnect());
    socket.on('disconnect', () => this.setStatus('disconnected'));
    socket.on('reconnect_attempt', () => this.setStatus('reconnecting'));
    socket.on(REALTIME_EVENT, (raw) => this.dispatchEvent(raw));
    socket.on(SNAPSHOT_EVENT, (raw) => this.dispatchSnapshot(raw));
    socket.connect();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.rooms.clear();
    this.setStatus('disconnected');
  }

  /** Subscribe to a room; returns an unsubscribe function. */
  subscribe(room: string, handler?: EventHandler): () => void {
    this.rooms.add(room);
    if (handler) {
      const set = this.roomHandlers.get(room) ?? new Set<EventHandler>();
      set.add(handler);
      this.roomHandlers.set(room, set);
    }
    if (this.status === 'connected') {
      this.socket?.emit('subscribe', { room });
    }
    return () => this.unsubscribe(room, handler);
  }

  unsubscribe(room: string, handler?: EventHandler): void {
    if (handler) this.roomHandlers.get(room)?.delete(handler);
    if (!handler || (this.roomHandlers.get(room)?.size ?? 0) === 0) {
      this.rooms.delete(room);
      this.roomHandlers.delete(room);
      this.socket?.emit('unsubscribe', { room });
    }
  }

  /** Explicitly request a fresh snapshot for a room (also done on reconnect). */
  requestSnapshot(room: string): void {
    this.socket?.emit('snapshot:request', { room });
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onSnapshot(handler: SnapshotHandler): () => void {
    this.snapshotHandlers.add(handler);
    return () => this.snapshotHandlers.delete(handler);
  }

  private handleConnect(): void {
    const reconnected = this.status === 'reconnecting';
    this.setStatus('connected');
    // Re-subscribe tracked rooms; on reconnect also request a fresh snapshot so the
    // client recovers authoritative state rather than relying on missed events.
    for (const room of this.rooms) {
      this.socket?.emit('subscribe', { room });
      if (reconnected) this.socket?.emit('snapshot:request', { room });
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }

  private dispatchEvent(raw: unknown): void {
    const parsed = realtimeEventSchema.safeParse(raw);
    if (!parsed.success) return;
    const event = parsed.data;
    for (const [room, handlers] of this.roomHandlers) {
      if (parseRoom(room)?.id === event.entityId) {
        for (const handler of handlers) handler(event);
      }
    }
  }

  private dispatchSnapshot(raw: unknown): void {
    for (const handler of this.snapshotHandlers) handler(raw as Snapshot);
  }
}
