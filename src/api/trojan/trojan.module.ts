import { Module } from '@nestjs/common'
import { TrojanService } from './trojan.service'
import { TrojanController } from '.'
import { TaskModule } from 'src/schedule/task.module'
import { InternalAuthModule } from 'src/internal-auth/internal-auth.module'

@Module({
  imports: [TaskModule, InternalAuthModule],
  controllers: [TrojanController],
  providers: [TrojanService]
})
export class TrojanModule {}
