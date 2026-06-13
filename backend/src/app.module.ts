import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import configuration from './config/configuration'
import { validateEnvironment } from './config/env.validation'
import { CommonModule } from './common/common.module'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RolesGuard } from './guards/roles.guard'
import { PermissionGuard } from './guards/permission.guard'
import { PlatformAdminGuard } from './guards/platform-admin.guard'
import { DatabaseModule } from './database/database.module'
import { EventsModule } from './events/events.module'
import { AuthModule } from './modules/auth/auth.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { UsersModule } from './modules/users/users.module'
import { InboxModule } from './modules/inbox/inbox.module'
import { ConversationsModule } from './modules/conversations/conversations.module'
import { CustomersModule } from './modules/customers/customers.module'
import { MessagesModule } from './modules/messages/messages.module'
import { ChannelsModule } from './modules/channels/channels.module'
import { OnboardingRequestsModule } from './modules/onboarding-requests/onboarding-requests.module'
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { AutomationModule } from './modules/automation/automation.module'
import { RealtimeModule } from './modules/realtime/realtime.module'
import { TemplatesModule } from './modules/templates/templates.module'
import { AppointmentsModule } from './modules/appointments/appointments.module'
import { MeetingsModule } from './modules/meetings/meetings.module'
import { TicketsModule } from './modules/tickets/tickets.module'
import { ReportsModule } from './modules/reports/reports.module'
import { BillingModule } from './modules/billing/billing.module'
import { MetaModule } from './modules/meta/meta.module'
import { SettingsModule } from './modules/settings/settings.module'
import { RolesModule } from './modules/roles/roles.module'
import { TeamsModule } from './modules/teams/teams.module'
import { SlaModule } from './modules/sla/sla.module'
import { BotModule } from './modules/bot/bot.module'

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
    CustomersModule,
    MessagesModule,
    ChannelsModule,
    OnboardingRequestsModule,
    WhatsAppModule,
    NotificationsModule,
    AutomationModule,
    RealtimeModule,
    TemplatesModule,
    AppointmentsModule,
    MeetingsModule,
    TicketsModule,
    ReportsModule,
    BillingModule,
    MetaModule,
    SettingsModule,
    RolesModule,
    TeamsModule,
    SlaModule,
    BotModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_GUARD, useClass: PlatformAdminGuard },
  ],
})
export class AppModule {}
