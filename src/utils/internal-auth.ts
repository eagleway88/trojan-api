import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'

export const INTERNAL_AUTH_HEADER_MAP = {
  keyId: 'x-internal-keyid',
  timestamp: 'x-internal-timestamp',
  nonce: 'x-internal-nonce',
  signature: 'x-internal-signature'
} as const

export const INTERNAL_AUTH_WINDOW_MS = 5 * 60 * 1000

export type InternalAuthSigningInput = {
  method: string
  path: string
  timestamp: string
  nonce: string
}

export function buildInternalAuthPayload(input: InternalAuthSigningInput) {
  return [
    normalizeInternalAuthMethod(input.method),
    normalizeInternalAuthPath(input.path),
    input.timestamp,
    input.nonce,
  ].join('\n')
}

export function signInternalAuth(secret: string, input: InternalAuthSigningInput) {
  return createHmac('sha256', secret)
    .update(buildInternalAuthPayload(input))
    .digest('hex')
}

export function createInternalAuthNonce(size = 16) {
  return randomBytes(size).toString('hex')
}

export function isInternalAuthSignatureEqual(expected: string, actual: string) {
  if (!expected || !actual || expected.length !== actual.length) {
    return false
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
}

export function normalizeInternalAuthMethod(method: string) {
  return method.trim().toUpperCase()
}

export function normalizeInternalAuthPath(path: string) {
  if (!path) return '/'
  return path.startsWith('/') ? path : `/${path}`
}