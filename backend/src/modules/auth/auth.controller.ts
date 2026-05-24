import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Public } from './auth.decorators'

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly config: ConfigService) {}

  @Get('status')
  getStatus() {
    return {
      module: 'auth',
      ready: true,
      mode: this.config.get<string>('auth.mode') ?? 'local',
      keycloakConfigured: Boolean(this.config.get<string>('keycloak.issuer')),
    }
  }
}
