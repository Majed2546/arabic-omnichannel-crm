import { Controller, Get } from '@nestjs/common'

@Controller('automation')
export class AutomationController {
  @Get('workflows')
  listWorkflows() {
    return { module: 'automation', workflows: [] }
  }
}
