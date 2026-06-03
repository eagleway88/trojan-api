import { Module } from '@nestjs/common'
import { LogService } from './log.service'
import { LogController } from '.'
import { InternalAuthModule } from 'src/internal-auth/internal-auth.module'

@Module({
  imports: [InternalAuthModule],
  controllers: [LogController],
  providers: [LogService]
})
export class LogModule {}
