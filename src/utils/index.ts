import { exec, spawn } from 'child_process'
import dayjs from 'dayjs'
import { Request } from 'express'
import { closeSync, openSync } from 'fs'
import { join } from 'path'
import { isIP } from 'net'

function normalizeIpAddress(value?: string) {
  if (!value) return ''
  let ip = value.split(',')[0]?.trim() ?? ''
  if (!ip) return ''

  const bracketIpv6 = /^\[(.*)\]:(\d+)$/.exec(ip)
  if (bracketIpv6?.[1]) {
    ip = bracketIpv6[1]
  } else if (
    ip.includes('.') &&
    ip.includes(':') &&
    ip.indexOf(':') === ip.lastIndexOf(':')
  ) {
    ip = ip.split(':')[0] ?? ip
  }

  if (ip.startsWith('::ffff:')) {
    const ipv4 = ip.slice('::ffff:'.length)
    if (isIP(ipv4) === 4) ip = ipv4
  }

  if (ip === '::1' || ip === '127.0.0.1') return 'localhost'
  return isIP(ip) ? ip : ''
}

export function fetchIP(req: Request) {
  const xRealIp = normalizeIpAddress(req.headers['x-real-ip'] as string | undefined)
  if (xRealIp) return xRealIp

  const xForwardedFor = normalizeIpAddress(
    req.headers['x-forwarded-for'] as string | undefined
  )
  if (xForwardedFor) return xForwardedFor

  return normalizeIpAddress(req.ip)
}

export function execSync(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    logInfo(`cmd: ${cmd}`)
    exec(cmd, (error, stdout, stderr) => {
      if (error || stderr) {
        reject(error?.message || stderr)
        logError(cmd, error?.message || stderr)
      } else {
        logInfo(`cmd: ${cmd} ${stdout.trim()}`)
        resolve(stdout.trim())
      }
    })
  })
}

export function sleep(ms = 2000) {
  return new Promise(resolve => {
    setTimeout(() => resolve(true), ms)
  })
}

export async function to<T, U = Error>(
  promise: Promise<T>,
  errorExt?: object
): Promise<[U, undefined] | [null, T]> {
  return promise
    .then<[null, T]>((data: T) => [null, data])
    .catch<[U, undefined]>((err: U) => {
      if (errorExt) {
        const parsedError = Object.assign({}, err, errorExt)
        return [parsedError, undefined]
      }
      return [err, undefined]
    })
}

export function logInfo(message?: any, ...optionalParams: any[]) {
  console.info(
    `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] ${message}`,
    ...optionalParams
  )
}

export function logError(message?: any, ...optionalParams: any[]) {
  console.error(
    `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] ${message}`,
    ...optionalParams
  )
}

export function runSpawnAndLog(
  name: string,
  command: string,
  args: readonly string[],
  onClose?: () => void
) {
  const stdoutLog = openSync(
    join(__dirname, `../../logs/${name}-stdout.log`),
    'a'
  ) // 'a' means append
  const stderrLog = openSync(
    join(__dirname, `../../logs/${name}-stderr.log`),
    'a'
  )

  logInfo(
    `[${name}]: Spawning child process and redirecting output to log files...`
  )
  const child = spawn(command, args, {
    // Pipes stdin to parent, stdout to stdoutLog FD, stderr to stderrLog FD
    stdio: ['inherit', stdoutLog, stderrLog]
  })

  child.on('error', err => {
    logError(`[${name}]: Failed to start child process:`, err)
  })

  child.on('close', code => {
    logInfo(`[${name}]: Child process exited with code ${code}.`)
    // Close file descriptors when done
    closeSync(stdoutLog)
    closeSync(stderrLog)
    onClose?.()
  })
}
