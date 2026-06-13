import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AutomationService } from './automation.service'
import {
  ListAutomationLogsQueryDto,
  ListAutomationRulesQueryDto,
  SaveAutomationRuleDto,
  TestAutomationRuleDto,
  ToggleAutomationRuleDto,
} from './dto'

@RequirePermissions('automation.view')
@Controller('automation')
export class AutomationController {
  constructor(
    private readonly automation: AutomationService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get('workflows')
  async listWorkflows(@Headers('x-tenant-id') tenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    const rules = await this.automation.listRules(this.resolveTenant(tenantId, user), {})
    return { module: 'automation', workflows: rules }
  }

  @Get('rules')
  listRules(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ListAutomationRulesQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.automation.listRules(this.resolveTenant(tenantId, user), query)
  }

  @Get('rules/:id')
  getRule(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.automation.findRuleById(this.resolveTenant(tenantId, user), id)
  }

  @Post('rules')
  @RequirePermissions('automation.manage')
  createRule(@Headers('x-tenant-id') tenantId: string | undefined, @Body() dto: SaveAutomationRuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.automation.createRule(this.resolveTenant(tenantId, user), dto)
  }

  @Patch('rules/:id')
  @RequirePermissions('automation.manage')
  updateRule(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() dto: SaveAutomationRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.automation.updateRule(this.resolveTenant(tenantId, user), id, dto)
  }

  @Patch('rules/:id/toggle')
  @RequirePermissions('automation.manage')
  toggleRule(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ToggleAutomationRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.automation.toggleRule(this.resolveTenant(tenantId, user), id, dto.isActive)
  }

  @Post('rules/:id/test')
  @RequirePermissions('automation.manage')
  testRule(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() dto: TestAutomationRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.automation.testRule(this.resolveTenant(tenantId, user), id, dto.targetType, dto.targetId)
  }

  @Delete('rules/:id')
  @RequirePermissions('automation.manage')
  deleteRule(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.automation.softDeleteRule(this.resolveTenant(tenantId, user), id)
  }

  @Get('logs')
  listLogs(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ListAutomationLogsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.automation.listLogs(this.resolveTenant(tenantId, user), query)
  }

  private resolveTenant(tenantId: string | undefined, user: AuthenticatedUser) {
    return this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user })
  }
}
