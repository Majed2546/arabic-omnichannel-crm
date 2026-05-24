import { Controller, Get } from '@nestjs/common'

@Controller('tenants')
export class TenantsController {
  @Get()
  list() {
    return { module: 'tenants', items: [] }
  }
}
