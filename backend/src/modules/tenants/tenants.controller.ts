import { Controller, Get } from '@nestjs/common'
import { RequirePermissions } from '../auth/auth.decorators'

@RequirePermissions('settings.view')
@Controller('tenants')
export class TenantsController {
  @Get()
  list() {
    return { module: 'tenants', items: [] }
  }
}
