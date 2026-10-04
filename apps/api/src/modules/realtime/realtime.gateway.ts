import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { OnGatewayConnection } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  snapshotRequestSchema,
  subscribeMessageSchema,
  type Snapshot,
} from '@soliton/api-contract';
import { TokenService } from '../auth/tokens/token.service';
import { RoomAuthorizer, type RealtimeUser } from './room-authorizer';

interface SocketData {
  user?: RealtimeUser;
}

type Ack = { ok: true; room?: string } | { ok: false; error: string };

/**
 * Realtime gateway. The server is the source of truth: clients authenticate at the
 * handshake, may only subscribe to rooms they are authorized for, and receive a
 * snapshot stub on request. No queue mutation/ETA logic lives here.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly tokens: TokenService,
    private readonly authorizer: RoomAuthorizer,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const payload = this.tokens.verifyAccessToken(this.extractToken(client));
      (client.data as SocketData).user = { id: payload.sub, role: payload.role };
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('subscribe')
  async onSubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<Ack> {
    const parsed = subscribeMessageSchema.safeParse(body);
    if (!parsed.success) return { ok: false, error: 'invalid_payload' };
    const user = this.userOf(client);
    if (!user) return { ok: false, error: 'unauthorized' };
    if (!(await this.authorizer.authorize(user, parsed.data.room))) {
      return { ok: false, error: 'forbidden' };
    }
    await client.join(parsed.data.room);
    return { ok: true, room: parsed.data.room };
  }

  @SubscribeMessage('unsubscribe')
  async onUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<Ack> {
    const parsed = subscribeMessageSchema.safeParse(body);
    if (!parsed.success) return { ok: false, error: 'invalid_payload' };
    await client.leave(parsed.data.room);
    return { ok: true, room: parsed.data.room };
  }

  @SubscribeMessage('snapshot:request')
  async onSnapshotRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<Snapshot | Ack> {
    const parsed = snapshotRequestSchema.safeParse(body);
    if (!parsed.success) return { ok: false, error: 'invalid_payload' };
    const user = this.userOf(client);
    if (!user) return { ok: false, error: 'unauthorized' };
    if (!(await this.authorizer.authorize(user, parsed.data.room))) {
      return { ok: false, error: 'forbidden' };
    }
    // Foundation snapshot — authoritative queue state is populated in Phase 1.
    return { room: parsed.data.room, version: 0, state: null };
  }

  private userOf(client: Socket): RealtimeUser | undefined {
    return (client.data as SocketData).user;
  }

  private extractToken(client: Socket): string {
    const auth = client.handshake.auth as { token?: string };
    const query = client.handshake.query as { token?: string | string[] };
    const fromAuth = typeof auth?.token === 'string' ? auth.token : undefined;
    const fromQuery =
      typeof query?.token === 'string'
        ? query.token
        : Array.isArray(query?.token)
          ? query.token[0]
          : undefined;
    const token = fromAuth ?? fromQuery;
    if (!token) throw new Error('missing token');
    return token;
  }
}
