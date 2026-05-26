import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DatabaseModule } from '../../database/database.module'
import { QuickRepliesController } from './quick-replies.controller'
import { TemplatesService } from './templates.service'
import { WhatsAppTemplatesController } from './whatsapp-templates.controller'

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [QuickRepliesController, WhatsAppTemplatesController],
  providers: [TemplatesService],
})
export class TemplatesModule {}
