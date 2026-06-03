import * as dotenv from 'dotenv'

import { readFileSync } from 'fs'

import { ServerStatusEnum } from '../enums'
import { execSync, logError, logInfo, to } from '../utils'
import { fetchTrojanStatus } from '../utils/trojan'
import {
  createInternalAuthNonce,
  hashInternalAuthBody,
  signInternalAuth
} from '../utils/internal-auth'

dotenv.config({ path: ['.env.local', '.env'] })

const configPath = '/etc/trojan-go/config.json'
const syncPath = process.env.INTERNAL_SYNC_PATH || '/api/trojan/internal/sync'

async function main() {
  logInfo('Task: update-trojan')
  const serverId = Number(process.env.INTERNAL_SERVER_ID)
  if (!Number.isFinite(serverId)) {
    logError('INTERNAL_SERVER_ID 配置缺失')
    return
  }

  const port = readTrojanPort()
  if (!port) {
    await reportSync({
      serverId,
      status: ServerStatusEnum.NOT_INSTALLED,
      online: 0,
      ipLimit: 0,
      uploadTraffic: 0,
      downloadTraffic: 0,
      users: []
    })
    return
  }

  const status = await fetchTrojanStatus(port)
  if (status !== ServerStatusEnum.STARTED) {
    await reportSync({
      serverId,
      status,
      online: 0,
      ipLimit: 0,
      uploadTraffic: 0,
      downloadTraffic: 0,
      users: []
    })
    return
  }

  const [, listContent] = await to(
    execSync('trojan-go -api-addr 127.0.0.1:10000 -api list')
  )
  if (!listContent) {
    logError('用户列表读取失败')
    return
  }
  const list = JSON.parse(listContent) as ItemT[]
  let ipLimit = 0
  let uploadTraffic = 0
  let downloadTraffic = 0
  for (const item of list) {
    ipLimit += item.status?.ip_limit ?? 0
    uploadTraffic += item.status?.traffic_total?.upload_traffic ?? 0
    downloadTraffic += item.status?.traffic_total?.download_traffic ?? 0
  }

  await reportSync({
    serverId,
    status,
    online: list.length,
    ipLimit,
    uploadTraffic,
    downloadTraffic,
    startedAt: new Date().toISOString(),
    users: list.map(item => ({
      hash: item.status?.user?.hash ?? '',
      ipLimit: item.status?.ip_limit ?? 0,
      uploadTraffic: item.status?.traffic_total?.upload_traffic ?? 0,
      downloadTraffic: item.status?.traffic_total?.download_traffic ?? 0,
      uploadSpeed: item.status?.speed_current?.upload_speed ?? 0,
      downloadSpeed: item.status?.speed_current?.download_speed ?? 0,
      uploadLimit: item.status?.speed_limit?.upload_speed ?? 0,
      downloadLimit: item.status?.speed_limit?.download_speed ?? 0
    }))
  })
}

void main().finally(() => {
  process.exit()
})

function readTrojanPort() {
  try {
    const content = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(content) as { local_port?: number }
    return config.local_port ?? 0
  } catch {
    return 0
  }
}

async function reportSync(payload: Record<string, unknown>) {
  const baseUrl = process.env.MAIN_API_BASE_URL
  const keyId = process.env.INTERNAL_AUTH_KEY_ID
  const secret = process.env.INTERNAL_AUTH_SECRET

  if (!baseUrl || !keyId || !secret) {
    logError('内部回调配置缺失')
    return
  }

  const rawBody = JSON.stringify(payload)
  const timestamp = `${Date.now()}`
  const nonce = createInternalAuthNonce()
  const bodySha256 = hashInternalAuthBody(rawBody)
  const signature = signInternalAuth(secret, {
    method: 'POST',
    path: syncPath,
    timestamp,
    nonce,
    bodySha256
  })

  const response = await fetch(`${baseUrl}${syncPath}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-keyid': keyId,
      'x-internal-timestamp': timestamp,
      'x-internal-nonce': nonce,
      'x-internal-body-sha256': bodySha256,
      'x-internal-signature': signature
    },
    body: rawBody
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`状态回调失败: ${response.status} ${text}`)
  }
}

interface ItemT {
  status: {
    traffic_total?: {
      upload_traffic?: number
      download_traffic?: number
    }
    speed_current?: {
      upload_speed?: number
      download_speed?: number
    }
    speed_limit?: {
      upload_speed?: number
      download_speed?: number
    }
    user?: { hash?: string }
    ip_limit?: number
  }
}
