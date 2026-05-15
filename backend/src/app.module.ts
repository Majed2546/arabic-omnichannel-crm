import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import configuration from './config/configuration'
import { validateEnvironment } from './config/env.validation'
import { CommonModule } from './common/common.module'
import { DatabaseModule } from './database/database.module'
import { EventsModule } from './events/events.module'
import { AuthModule } from './modules/auth/auth.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { UsersModule } from './modules/users/users.module'
import { InboxModule } from './modules/inbox/inbox.module'
import { ConversationsModule } from './modules/conversations/conversations.module'
import { MessagesModule } from './modules/messages/messages.module'
import { ChannelsModule } from './modules/channels/channels.module'
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { AutomationModule } from './modules/automation/automation.module'
import { RealtimeModule } from './modules/realtime/realtime.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
      validate: validateEnvironment,
    }),
    CommonModule,
    DatabaseModule,
    EventsModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    InboxModule,
    ConversationsModule,
    MessagesModule,
    ChannelsModule,
    WhatsAppModule,
    NotificationsModule,
    AutomationModule,
    RealtimeModule,
  ],
})
export class AppModule {}
