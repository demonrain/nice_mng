import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { WS_EVENTS } from '@nice-admin/shared';

interface OnlineClient {
  socketId: string;
  userId: number;
  username: string;
  ip: string;
  connectedAt: number;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationGateway.name);
  private readonly clients = new Map<string, OnlineClient>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');
      const payload = await this.jwt.verifyAsync<{ sub: number; username: string }>(token, {
        secret: this.config.get('jwt.accessSecret'),
      });
      this.clients.set(client.id, {
        socketId: client.id,
        userId: payload.sub,
        username: payload.username,
        ip: client.handshake.address,
        connectedAt: Date.now(),
      });
      this.broadcastOnlineCount();
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
    this.broadcastOnlineCount();
  }

  private broadcastOnlineCount() {
    this.server.emit(WS_EVENTS.ONLINE_COUNT, { count: this.clients.size });
  }

  /** 推送通知给全部在线用户 */
  broadcastNotice(payload: { title: string; content: string; type?: string }) {
    this.server.emit(WS_EVENTS.NOTICE, { ...payload, time: Date.now() });
  }

  /** 推送给指定用户 */
  sendToUser(userId: number, event: string, payload: unknown) {
    for (const c of this.clients.values()) {
      if (c.userId === userId) this.server.to(c.socketId).emit(event, payload);
    }
  }

  getOnlineList(): OnlineClient[] {
    return [...this.clients.values()];
  }

  forceLogout(socketId: string): boolean {
    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit(WS_EVENTS.NOTICE, { title: '系统提示', content: '您已被管理员强制下线', type: 'WARN' });
      socket.disconnect(true);
      this.clients.delete(socketId);
      this.broadcastOnlineCount();
      return true;
    }
    return false;
  }
}
