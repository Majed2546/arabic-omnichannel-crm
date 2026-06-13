import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DatabaseModule } from '../../database/database.module'
import { CustomersController } from './customers.controller'
import { CustomersService } from './customers.service'

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
