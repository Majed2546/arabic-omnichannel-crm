import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { RealtimeService } from './realtime.service'

type JoinTenantBody = { tenantId: string }
type JoinConversationBody = { conversationId: string }
type JoinAgentBody = { agentId: string }

@WebSocketGateway({ namespace: 'inbox', cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  constructor(private readonly realtime: RealtimeService) {}

  afterInit(server: Server) {
    server.use((socket, next) => {
      try {
        this.realtime.authenticateSocket(socket)
        next()
      } catch (error) {
        next(error as Error)
      }
    })
    this.realtime.registerNamespace('inbox', server)
  }

  async handleConnection(client: Socket) {
    await this.realtime.handleConnection('inbox', client)
  }

  handleDisconnect(client: Socket) {
    this.realtime.handleDisconnect('inbox', client)
  }

  @SubscribeMessage('tenant.join')
  joinTenant(@ConnectedSocket() client: Socket, @MessageBody() body: JoinTenantBody) {
    return this.realtime.joinTenant(client, body.tenantId)
  }

  @SubscribeMessage('conversation.join')
  joinConversation(@ConnectedSocket() client: Socket, @MessageBody() body: JoinConversationBody) {
    return this.realtime.joinConversation(client, body.conversationId)
  }

  @SubscribeMessage('agent.join')
  joinAgent(@ConnectedSocket() client: Socket, @MessageBody() body: JoinAgentBody) {
    return this.realtime.joinAgent(client, body.agentId)
  }

  @SubscribeMessage('heartbeat')
  heartbeat(@ConnectedSocket() client: Socket) {
    return this.realtime.heartbeat(client)
  }
}

@WebSocketGateway({ namespace: 'notifications', cors: { origin: '*' } })
export class NotificationsRealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  constructor(private readonly realtime: RealtimeService) {}

  afterInit(server: Server) {
    server.use((socket, next) => {
      try {
        this.realtime.authenticateSocket(socket)
        next()
      } catch (error) {
        next(error as Error)
      }
    })
    this.realtime.registerNamespace('notifications', server)
  }

  async handleConnection(client: Socket) {
    await this.realtime.handleConnection('notifications', client)
  }

  handleDisconnect(client: Socket) {
    this.realtime.handleDisconnect('notifications', client)
  }

  @SubscribeMessage('tenant.join')
  joinTenant(@ConnectedSocket() client: Socket, @MessageBody() body: JoinTenantBody) {
    return this.realtime.joinTenant(client, body.tenantId)
  }

  @SubscribeMessage('heartbeat')
  heartbeat(@ConnectedSocket() client: Socket) {
    return this.realtime.heartbeat(client)
  }
}

@WebSocketGateway({ namespace: 'presence', cors: { origin: '*' } })
export class PresenceRealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  constructor(private readonly realtime: RealtimeService) {}

  afterInit(server: Server) {
    server.use((socket, next) => {
      try {
        this.realtime.authenticateSocket(socket)
        next()
      } catch (error) {
        next(error as Error)
      }
    })
    this.realtime.registerNamespace('presence', server)
  }

  async handleConnection(client: Socket) {
    await this.realtime.handleConnection('presence', client)
  }

  handleDisconnect(client: Socket) {
    this.realtime.handleDisconnect('presence', client)
  }

  @SubscribeMessage('agent.join')
  joinAgent(@ConnectedSocket() client: Socket, @MessageBody() body: JoinAgentBody) {
    return this.realtime.joinAgent(client, body.agentId)
  }

  @SubscribeMessage('presence.away')
  setAway(@ConnectedSocket() client: Socket) {
    const auth = client.data.auth as { tenantId: string; agentId?: string } | undefined
    if (auth?.agentId) this.realtime.setPresence(auth.tenantId, auth.agentId, 'away', client.id)
    return { ok: true }
  }

  @SubscribeMessage('heartbeat')
  heartbeat(@ConnectedSocket() client: Socket) {
    return this.realtime.heartbeat(client)
  }
}
