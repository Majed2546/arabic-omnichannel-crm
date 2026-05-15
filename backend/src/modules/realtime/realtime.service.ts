import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type Redis from 'ioredis'
import type { Server, Socket } from 'socket.io'
import { REDIS_CLIENT } from '../../database/redis.provider'
import {
  agentRoom,
  conversationRoom,
  realtimeEventNamespaces,
  tenantRoom,
  type PresenceRecord,
  type PresenceState,
  type RealtimeEnvelope,
  type RealtimeEventName,
  type RealtimeNamespace,
  type SocketAuthContext,
} from './realtime.events'

const REDIS_CHANNEL = 'omni-crm:realtime-events'

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name)
  private readonly instanceId = randomUUID()
  private readonly servers = new Map<RealtimeNamespace, Server>()
  private readonly presence = new Map<string, PresenceRecord>()
  private readonly latestEvents: RealtimeEnvelope[] = []
  private readonly subscriber: Redis

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    this.subscriber = redis.duplicate()
    this.subscribeRedis()
  }

  async onModuleDestroy() {
    await this.subscriber.quit()
  }

  registerNamespace(namespace: RealtimeNamespace, server: Server) {
    this.servers.set(namespace, server)
    this.logger.log(`Realtime namespace registered: /${namespace}`)
  }

  authenticateSocket(socket: Socket): SocketAuthContext {
    const auth = socket.handshake.auth as Record<string, string | undefined>
    const query = socket.handshake.query as Record<string, string | string[] | undefined>
    const tenantId = auth.tenantId ?? this.firstQueryValue(query.tenantId)

    if (!tenantId) {
      throw new Error('tenantId is required for realtime socket isolation')
    }

    return {
      tenantId,
      userId: auth.userId ?? this.firstQueryValue(query.userId),
      agentId: auth.agentId ?? this.firstQueryValue(query.agentId),
    }
  }

  async handleConnection(namespace: RealtimeNamespace, socket: Socket) {
    const auth = this.authenticateSocket(socket)
    socket.data.auth = auth
    await socket.join(tenantRoom(auth.tenantId))

    if (auth.agentId) {
      await socket.join(agentRoom(auth.tenantId, auth.agentId))
      this.setPresence(auth.tenantId, auth.agentId, 'online', socket.id)
    }

    socket.emit('connection.ready', {
      namespace,
      tenantId: auth.tenantId,
      socketId: socket.id,
    })

    this.logger.log(`Socket connected namespace=/${namespace} tenant=${auth.tenantId} socket=${socket.id}`)
  }

  handleDisconnect(namespace: RealtimeNamespace, socket: Socket) {
    const auth = socket.data.auth as SocketAuthContext | undefined
    if (auth?.agentId) {
      this.setPresence(auth.tenantId, auth.agentId, 'offline')
    }

    this.logger.log(`Socket disconnected namespace=/${namespace} socket=${socket.id}`)
  }

  async joinTenant(socket: Socket, tenantId: string) {
    this.assertTenantAccess(socket, tenantId)
    await socket.join(tenantRoom(tenantId))
    return { room: tenantRoom(tenantId) }
  }

  async joinConversation(socket: Socket, conversationId: string) {
    const auth = this.getAuth(socket)
    const room = conversationRoom(auth.tenantId, conversationId)
    await socket.join(room)
    return { room }
  }

  async joinAgent(socket: Socket, agentId: string) {
    const auth = this.getAuth(socket)
    const room = agentRoom(auth.tenantId, agentId)
    await socket.join(room)
    return { room }
  }

  heartbeat(socket: Socket) {
    const auth = this.getAuth(socket)
    if (auth.agentId) this.setPresence(auth.tenantId, auth.agentId, 'online', socket.id)
    return { ok: true, at: new Date().toISOString() }
  }

  setPresence(tenantId: string, agentId: string, state: PresenceState, socketId?: string) {
    const record: PresenceRecord = {
      tenantId,
      agentId,
      state,
      socketId,
      updatedAt: new Date().toISOString(),
    }
    this.presence.set(`${tenantId}:${agentId}`, record)
    this.publish({
      type: state === 'offline' ? 'agent.offline' : 'agent.online',
      tenantId,
      namespace: 'presence',
      payload: record,
      source: 'socket',
    })
  }

  getPresence(tenantId?: string) {
    const records = Array.from(this.presence.values())
    return tenantId ? records.filter((record) => record.tenantId === tenantId) : records
  }

  publish<TPayload extends Record<string, unknown>>(
    input: Omit<RealtimeEnvelope<TPayload>, 'id' | 'occurredAt'> & { occurredAt?: string },
  ) {
    const event: RealtimeEnvelope<TPayload> = {
      id: randomUUID(),
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      instanceId: this.instanceId,
      ...input,
    }

    this.broadcastLocal(event)
    this.latestEvents.unshift(event)
    this.latestEvents.splice(50)
    this.redis.publish(REDIS_CHANNEL, JSON.stringify(event)).catch((error: unknown) => {
      this.logger.warn(`Redis publish failed: ${String(error)}`)
    })

    this.logger.debug(`Realtime event ${event.type} tenant=${event.tenantId} source=${event.source}`)
    return event
  }

  publishDomainEvent<TPayload extends Record<string, unknown>>(
    type: RealtimeEventName,
    tenantId: string,
    payload: TPayload,
    source: RealtimeEnvelope['source'] = 'queue',
  ) {
    return this.publish({
      type,
      tenantId,
      namespace: realtimeEventNamespaces[type],
      payload,
      source,
    })
  }

  simulate(tenantId: string) {
    const now = Date.now()
    const variants: Array<[RealtimeEventName, Record<string, unknown>]> = [
      ['message.created', { conversationId: 'conv-demo', content: 'رسالة تجريبية مباشرة', externalMessageId: `wa-${now}` }],
      ['sla.warning', { conversationId: 'conv-demo', slaDeadline: new Date(now + 10 * 60_000).toISOString() }],
      ['queue.updated', { queueId: 'support', activeCount: 12, waitingCount: 3 }],
      ['notification.created', { title: 'تنبيه تجريبي', body: 'وصل حدث من محاكي realtime.' }],
      ['agent.online', { agentId: 'agent-demo', state: 'online' }],
    ]
    const [type, payload] = variants[now % variants.length]
    return this.publishDomainEvent(type, tenantId, payload, 'simulator')
  }

  getHealth() {
    return {
      status: 'ok',
      namespaces: Array.from(this.servers.keys()),
      latestEvents: this.latestEvents.slice(0, 10),
      onlineAgents: this.getPresence().filter((record) => record.state === 'online').length,
    }
  }

  getLatestEvents() {
    return this.latestEvents
  }

  private broadcastLocal(event: RealtimeEnvelope) {
    const server = this.servers.get(event.namespace)
    if (!server) return
    server.to(tenantRoom(event.tenantId)).emit(event.type, event)
  }

  private subscribeRedis() {
    this.subscriber.subscribe(REDIS_CHANNEL).catch((error: unknown) => {
      this.logger.warn(`Redis subscribe failed: ${String(error)}`)
    })
    this.subscriber.on('message', (_channel, message) => {
      try {
        const event = JSON.parse(message) as RealtimeEnvelope
        if (event.instanceId === this.instanceId) return
        this.broadcastLocal({ ...event, source: 'redis' })
      } catch (error) {
        this.logger.warn(`Invalid realtime redis payload: ${String(error)}`)
      }
    })
  }

  private assertTenantAccess(socket: Socket, tenantId: string) {
    const auth = this.getAuth(socket)
    if (auth.tenantId !== tenantId) throw new Error('tenant room access denied')
  }

  private getAuth(socket: Socket) {
    const auth = socket.data.auth as SocketAuthContext | undefined
    if (!auth) throw new Error('socket is not authenticated')
    return auth
  }

  private firstQueryValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value
  }
}
