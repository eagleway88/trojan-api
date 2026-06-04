import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'

import { Logs } from 'src/utils/logger'
import {
  hashInternalAuthBody,
  INTERNAL_AUTH_HEADER_MAP,
  INTERNAL_AUTH_WINDOW_MS,
  isInternalAuthSignatureEqual,
  normalizeInternalAuthPath,
  signInternalAuth
} from 'src/utils/internal-auth'

type InternalRequest = Request & {
  rawBody?: Buffer
}

@Injectable()
export class InternalAuthService {
  private readonly usedNonces = new Map<string, number>()

  constructor(private readonly configService: ConfigService) { }

  validateRequest(request: InternalRequest) {
    const keyId = this.requireHeader(request, INTERNAL_AUTH_HEADER_MAP.keyId)
    const timestamp = this.requireHeader(request, INTERNAL_AUTH_HEADER_MAP.timestamp)
    const nonce = this.requireHeader(request, INTERNAL_AUTH_HEADER_MAP.nonce)
    const bodySha256 = this.requireHeader(request, INTERNAL_AUTH_HEADER_MAP.bodySha256)
    const signature = this.requireHeader(request, INTERNAL_AUTH_HEADER_MAP.signature)

    const timestampValue = Number(timestamp)
    if (!Number.isFinite(timestampValue)) {
      this.writeSecurityLog('internal-auth.request.invalid-timestamp', {
        keyId,
        path: request.originalUrl
      })
      throw new UnauthorizedException('内部请求无效')
    }

    if (Math.abs(Date.now() - timestampValue) > INTERNAL_AUTH_WINDOW_MS) {
      this.writeSecurityLog('internal-auth.request.expired', {
        keyId,
        path: request.originalUrl,
        timestamp
      })
      throw new UnauthorizedException('内部请求已过期')
    }

    const expectedKeyId = this.requireConfig('INTERNAL_AUTH_KEY_ID')
    if (keyId !== expectedKeyId) {
      this.writeSecurityLog('internal-auth.request.unknown-key', {
        keyId,
        path: request.originalUrl
      })
      throw new UnauthorizedException('内部请求无效')
    }

    const hashedBody = hashInternalAuthBody(request.rawBody)
    if (hashedBody !== bodySha256) {
      this.writeSecurityLog('internal-auth.request.body-sha-mismatch', {
        keyId,
        path: request.originalUrl
      })
      throw new UnauthorizedException('内部请求无效')
    }

    const secret = this.requireConfig('INTERNAL_AUTH_SECRET')
    const path = normalizeInternalAuthPath(
      (request.originalUrl || request.url || '').split('?')[0]
    )
    const expectedSignature = signInternalAuth(secret, {
      method: request.method,
      path,
      timestamp,
      nonce,
      bodySha256
    })
    if (!isInternalAuthSignatureEqual(expectedSignature, signature)) {
      this.writeSecurityLog('internal-auth.request.signature-mismatch', {
        keyId,
        path: request.originalUrl
      })
      throw new UnauthorizedException('内部请求无效')
    }

    this.cleanupExpiredNonces()

    const nonceKey = `${keyId}:${nonce}`
    if (this.usedNonces.has(nonceKey)) {
      this.writeSecurityLog('internal-auth.request.replay-detected', {
        keyId,
        path: request.originalUrl,
        nonce
      })
      throw new UnauthorizedException('内部请求重复')
    }
    this.usedNonces.set(nonceKey, timestampValue + INTERNAL_AUTH_WINDOW_MS)

    const bodyServerId = this.fetchBodyServerId(request.body)
    const configuredServerId = this.fetchConfiguredServerId()
    if (configuredServerId != null && bodyServerId != null && bodyServerId !== configuredServerId) {
      this.writeSecurityLog('internal-auth.request.server-mismatch', {
        keyId,
        path: request.originalUrl,
        bodyServerId,
        configuredServerId
      })
      throw new UnauthorizedException('内部请求无效')
    }

    return true
  }

  private requireHeader(request: InternalRequest, key: string) {
    const headerValue = request.headers[key]
    if (typeof headerValue === 'string' && headerValue) {
      return headerValue
    }
    if (Array.isArray(headerValue) && headerValue[0]) {
      return headerValue[0]
    }
    throw new UnauthorizedException('缺少内部鉴权头')
  }

  private requireConfig(name: string) {
    const value = this.configService.get<string>(name) || process.env[name]
    if (!value) {
      throw new UnauthorizedException('内部鉴权配置缺失')
    }
    return value
  }

  private fetchConfiguredServerId() {
    const value = this.configService.get<string>('INTERNAL_SERVER_ID') || process.env.INTERNAL_SERVER_ID
    if (!value) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  private fetchBodyServerId(body: unknown) {
    if (!body || typeof body !== 'object' || !('serverId' in body)) {
      return null
    }

    const value = (body as { serverId?: unknown }).serverId
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }

  private cleanupExpiredNonces() {
    const now = Date.now()
    for (const [key, expireAt] of this.usedNonces.entries()) {
      if (expireAt <= now) {
        this.usedNonces.delete(key)
      }
    }
  }

  private writeSecurityLog(event: string, payload: Record<string, unknown>) {
    Logs.err.error(JSON.stringify({ event, ...payload }))
  }
}