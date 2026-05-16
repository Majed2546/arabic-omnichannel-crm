import type { Conversation } from '../../features/inbox/inboxMock'
import type { RealtimeEnvelope } from './realtimeEvents'

type RealtimeHandler = (event: RealtimeEnvelope) => void
type ConversationProvider = () => Conversation[]

class SocketClientFacade {
  private handlers = new Set<RealtimeHandler>()

  connect() {
    return Promise.resolve()
  }

  disconnect() {
    this.handlers.clear()
  }

  subscribe(handler: RealtimeHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  emit(event: RealtimeEnvelope) {
    this.handlers.forEach((handler) => handler(event))
  }

  startSimulator(_getConversations: ConversationProvider) {
    return () => undefined
  }

  stopSimulator() {
    return undefined
  }
}

export const socketClient = new SocketClientFacade()
