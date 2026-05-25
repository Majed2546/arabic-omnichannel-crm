import { Module } from '@nestjs/common'
import { ChannelsController } from './channels.controller'
import { TenantChannelsController } from './tenant-channels.controller'
import { TenantChannelsService } from './tenant-channels.service'

@Module({
  controllers: [ChannelsController, TenantChannelsController],
  providers: [TenantChannelsService],
})
export class ChannelsModule {}
