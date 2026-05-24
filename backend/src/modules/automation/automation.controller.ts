import { Controller, Get } from '@nestjs/common'
import { RequirePermissions } from '../auth/auth.decorators'

@RequirePermissions('automation.view')
@Controller('automation')
export class AutomationController {
  @Get('workflows')
  listWorkflows() {
    return { module: 'automation', workflows: [] }
  }
}
