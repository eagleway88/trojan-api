import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { InternalAuthService } from './internal-auth.service'
import { InternalSignatureGuard } from './internal-signature.guard'

@Module({
  imports: [ConfigModule],
  providers: [InternalAuthService, InternalSignatureGuard],
  exports: [InternalAuthService, InternalSignatureGuard]
})
export class InternalAuthModule { }