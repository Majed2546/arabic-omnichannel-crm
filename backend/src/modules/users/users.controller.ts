import { Controller, Get } from '@nestjs/common'
import { RequirePermissions } from '../auth/auth.decorators'

@RequirePermissions('agents.view')
@Controller('users')
export class UsersController {
  @Get()
  list() {
    return { module: 'users', items: [] }
  }
}
