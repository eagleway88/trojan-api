import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Request } from 'express'

import { InternalAuthService } from './internal-auth.service'

@Injectable()
export class InternalSignatureGuard implements CanActivate {
  constructor(private readonly internalAuthService: InternalAuthService) { }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>()
    return this.internalAuthService.validateRequest(request)
  }
}