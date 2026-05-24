import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import type { StringValue } from 'ms'
import { AuthController } from './auth.controller'
import { KeycloakAuthService } from './keycloak-auth.service'

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = (config.get<string>('jwt.expiresIn') ?? '15m') as StringValue

        return {
          secret: config.get<string>('jwt.secret') ?? 'development-secret',
          signOptions: { expiresIn },
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [KeycloakAuthService],
  exports: [JwtModule, KeycloakAuthService],
})
export class AuthModule {}
