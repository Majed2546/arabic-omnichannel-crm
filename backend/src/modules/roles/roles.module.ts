import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DatabaseModule } from '../../database/database.module'
import { RolesController } from './roles.controller'
import { RolesService } from './roles.service'

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
