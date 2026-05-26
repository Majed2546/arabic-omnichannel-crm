import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { ChannelsController } from './channels.controller'
import { TenantChannelsController } from './tenant-channels.controller'
import { TenantChannelsService } from './tenant-channels.service'

@Module({
  imports: [CommonModule],
  controllers: [ChannelsController, TenantChannelsController],
  providers: [TenantChannelsService],
  exports: [TenantChannelsService],
})
export class ChannelsModule {}
