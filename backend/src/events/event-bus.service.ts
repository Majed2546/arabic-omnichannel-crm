import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name)

  publish(eventName: string, payload: Record<string, unknown>) {
    this.logger.debug(`Event placeholder published: ${eventName}`)
    return { eventName, payload }
  }
}
