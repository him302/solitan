import { buildRealtimeEvent, salonRoom } from '@soliton/api-contract';
import { RealtimeClient, type SocketLike } from './index';

/** Controllable fake socket implementing SocketLike. */
class FakeSocket implements SocketLike {
  connected = false;
  emitted: Array<{ event: string; args: unknown[] }> = [];
  private listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  on(event: string, listener: (...args: unknown[]) => void): void {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
  }
  emit(event: string, ...args: unknown[]): void {
    this.emitted.push({ event, args });
  }
  connect(): void {
    this.connected = true;
    this.fire('connect');
  }
  disconnect(): void {
    this.connected = false;
    this.fire('disconnect');
  }
  fire(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
}

function makeClient() {
  const socket = new FakeSocket();
  const client = new RealtimeClient({ url: 'ws://test', getToken: () => 'tok' }, () => socket);
  return { client, socket };
}

describe('RealtimeClient', () => {
  it('tracks connection status through its lifecycle', () => {
    const { client, socket } = makeClient();
    expect(client.connectionStatus).toBe('idle');
    client.connect();
    expect(client.connectionStatus).toBe('connected'); // fake connects synchronously
    socket.disconnect();
    expect(client.connectionStatus).toBe('disconnected');
  });

  it('emits subscribe for a room when connected', () => {
    const { client, socket } = makeClient();
    client.connect();
    client.subscribe(salonRoom('s1'));
    expect(socket.emitted).toContainEqual({ event: 'subscribe', args: [{ room: 'salon:s1' }] });
  });

  it('on reconnect, re-subscribes AND requests a fresh snapshot', () => {
    const { client, socket } = makeClient();
    client.connect();
    client.subscribe(salonRoom('s1'));
    socket.emitted = [];
    // simulate a reconnection cycle
    socket.fire('reconnect_attempt');
    expect(client.connectionStatus).toBe('reconnecting');
    socket.fire('connect');
    expect(socket.emitted).toContainEqual({ event: 'subscribe', args: [{ room: 'salon:s1' }] });
    expect(socket.emitted).toContainEqual({
      event: 'snapshot:request',
      args: [{ room: 'salon:s1' }],
    });
  });

  it('routes events to the matching room handler by entityId', () => {
    const { client, socket } = makeClient();
    client.connect();
    const received: unknown[] = [];
    client.subscribe(salonRoom('s1'), (event) => received.push(event));
    socket.fire(
      'realtime:event',
      buildRealtimeEvent({ type: 'queue.updated', entityId: 's1', version: 1 }),
    );
    socket.fire(
      'realtime:event',
      buildRealtimeEvent({ type: 'queue.updated', entityId: 'other', version: 1 }),
    );
    expect(received).toHaveLength(1);
  });

  it('stops tracking a room on unsubscribe', () => {
    const { client, socket } = makeClient();
    client.connect();
    client.subscribe(salonRoom('s1'));
    socket.emitted = [];
    client.unsubscribe(salonRoom('s1'));
    expect(socket.emitted).toContainEqual({ event: 'unsubscribe', args: [{ room: 'salon:s1' }] });
  });
});
