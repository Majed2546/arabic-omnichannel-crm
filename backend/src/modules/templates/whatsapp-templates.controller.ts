import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ListWhatsAppTemplatesQueryDto, SaveWhatsAppTemplateDto } from './dto'
import { TemplatesService } from './templates.service'

@RequirePermissions('templates.view')
@Controller('whatsapp-templates')
export class WhatsAppTemplatesController {
  constructor(
    private readonly templates: TemplatesService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ListWhatsAppTemplatesQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.templates.listWhatsAppTemplates(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), query)
  }

  @Post()
  @RequirePermissions('templates.manage')
  create(@Headers('x-tenant-id') tenantId: string | undefined, @Body() dto: SaveWhatsAppTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.templates.createWhatsAppTemplate(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), dto)
  }

  @Patch(':id')
  @RequirePermissions('templates.manage')
  update(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @Body() dto: SaveWhatsAppTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.templates.updateWhatsAppTemplate(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id, dto)
  }

  @Post(':id/submit')
  @RequirePermissions('templates.manage')
  submit(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.templates.submitWhatsAppTemplate(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id)
  }
}
