import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common'
import { TenantAccessService } from '../../common/tenant-access.service'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { BotService } from './bot.service'
import type { TestBotMessageDto, UpdateBotSettingsDto } from './dto'

@Controller('bot')
@RequirePermissions('bot.view')
export class BotController {
  constructor(
    private readonly bot: BotService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private tenantId(tenantId: string | undefined, localTenantId: string | undefined, user: AuthenticatedUser) {
    return this.tenantAccess.requireTenantAccess({ requestedTenantId: localTenantId || tenantId, user })
  }

  @Get('settings')
  settings(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.bot.getSettings(this.tenantId(tenantId, localTenantId, user))
  }

  @Patch('settings')
  @RequirePermissions('bot.manage')
  updateSettings(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Body() dto: UpdateBotSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bot.updateSettings(this.tenantId(tenantId, localTenantId, user), dto)
  }

  @Get('flows')
  flows() {
    return this.bot.getFlows()
  }

  @Post('test-message')
  test(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Body() dto: TestBotMessageDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bot.testMessage(this.tenantId(tenantId, localTenantId, user), dto)
  }

  @Post('conversations/:conversationId/reset')
  reset(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('conversationId') conversationId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bot.reset(this.tenantId(tenantId, localTenantId, user), conversationId)
  }

  @Post('conversations/:conversationId/stop')
  stop(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('conversationId') conversationId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bot.stop(this.tenantId(tenantId, localTenantId, user), conversationId)
  }

  @Get('conversations/:conversationId/state')
  state(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('conversationId') conversationId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bot.getConversationState(this.tenantId(tenantId, localTenantId, user), conversationId)
  }

  @Post('conversations/:conversationId/handoff')
  handoff(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('conversationId') conversationId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bot.handoff(this.tenantId(tenantId, localTenantId, user), conversationId)
  }
}
