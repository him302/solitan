import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { OnGatewayConnection, OnGatewayInit } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { forwardRef, Inject } from '@nestjs/common';
import {
  parseRoom,
  snapshotRequestSchema,
  subscribeMessageSchema,
  type Snapshot,
} from '@soliton/api-contract';
import { TokenService } from '../auth/tokens/token.service';
import { RoomAuthorizer, type RealtimeUser } from './room-authorizer';
import { QueueService } from '../queue/queue.service';

interface SocketData {
  user?: RealtimeUser;
}

type Ack = { ok: true; room?: string } | { ok: false; error: string };

@WebSocketGateway({
  cors: {
    // Mirrors the HTTP CORS policy. '*' in dev reflects any origin; in production only the
    // configured allowlist is accepted. This prevents cross-origin WebSocket abuse.
    origin: process.env['CORS_ORIGINS'] === '*' || !process.env['CORS_ORIGINS']
      ? true
      : process.env['CORS_ORIGINS'].split(',').map((o) => o.trim()),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly tokens: TokenService,
    private readonly authorizer: RoomAuthorizer,
    @Inject(forwardRef(() => QueueService)) private readonly queueService: QueueService,
  ) {}

  afterInit(server: Server): void {
    this.queueService.setServer(server);
  }

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

    const ref = parseRoom(parsed.data.room);
    if (!ref) return { ok: false, error: 'unknown_room' };

    try {
      if (ref.kind === 'salon') {
        const snapshot = await this.queueService.buildSalonSnapshot(ref.id);
        return { room: parsed.data.room, version: snapshot.version, state: snapshot };
      }
      // Entry room: return the customer's entry detail.
      // We get the entry's salonId from the entry, then build the entry DTO.
      const entry = await this.queueService.getEntrySnapshot(ref.id, user.id);
      return {
        room: parsed.data.room,
        version: entry.queueVersion,
        state: entry,
      };
    } catch {
      return { room: parsed.data.room, version: 0, state: null };
    }
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
