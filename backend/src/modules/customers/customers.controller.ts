import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CreateCustomerDto, ListCustomersQueryDto, UpdateCustomerDto } from './dto'
import { CustomersService } from './customers.service'

@RequirePermissions('customers.view')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ListCustomersQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customers.list(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), query)
  }

  @Get(':id')
  getById(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.customers.findById(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id)
  }

  @Post()
  @RequirePermissions('customers.manage')
  create(@Headers('x-tenant-id') tenantId: string | undefined, @Body() dto: CreateCustomerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customers.create(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), dto)
  }

  @Patch(':id')
  @RequirePermissions('customers.manage')
  update(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customers.update(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id, dto)
  }

  @Delete(':id')
  @RequirePermissions('customers.manage')
  softDelete(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.customers.softDelete(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id)
  }
}
