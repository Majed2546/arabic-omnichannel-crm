import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common'
import { RequirePermissions, RequirePlatformAdmin } from '../auth/auth.decorators'
import { EmbeddedSignupCallbackDto, EmbeddedSignupStartDto, UpdateMetaSettingsDto } from './dto'
import { MetaService } from './meta.service'

@Controller('meta')
export class MetaController {
  constructor(private readonly meta: MetaService) {}

  @Get('settings')
  @RequirePermissions('channels.view')
  settings() {
    return this.meta.getSettings()
  }

  @Patch('settings')
  @RequirePermissions('settings.manage')
  @RequirePlatformAdmin()
  updateSettings(@Body() dto: UpdateMetaSettingsDto) {
    return this.meta.updateSettings(dto)
  }

  @Get('embedded-signup/status')
  @RequirePermissions('channels.view')
  embeddedSignupStatus() {
    return this.meta.embeddedSignupStatus()
  }

  @Get('readiness')
  @RequirePermissions('channels.view')
  readiness() {
    return this.meta.readiness()
  }

  @Post('embedded-signup/start')
  @RequirePermissions('channels.manage')
  startEmbeddedSignup(@Body() dto: EmbeddedSignupStartDto) {
    return this.meta.startEmbeddedSignup(dto)
  }

  @Post('embedded-signup/callback')
  embeddedSignupCallback(@Body() dto: EmbeddedSignupCallbackDto) {
    return this.meta.embeddedSignupCallback(dto)
  }

  @Get('embedded-signup/callback')
  embeddedSignupCallbackGet(@Query() query: EmbeddedSignupCallbackDto) {
    return this.meta.embeddedSignupCallback(query)
  }
}
