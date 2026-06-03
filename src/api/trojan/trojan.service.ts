import { Injectable } from '@nestjs/common'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

import { execSync, sleep, to } from 'src/utils'
import { apiUtil } from 'src/utils/api'
import {
  TrojanControlDto,
  TrojanLimitDto,
  TrojanUserDto,
  TrojanUserInfo,
  TrojanUserSyncDto
} from './trojan.dto'
import { configTrojanJson, fetchTrojanStatus } from 'src/utils/trojan'
import { startNginx, stopNginx } from 'src/utils/trojan'
import { TaskService } from 'src/schedule/task.service'
import { ServerStatusEnum, TrojanActionEnum } from 'src/enums'

export const statusText: Record<number, string> = {
  [ServerStatusEnum.NOT_INSTALLED]: '未安装',
  [ServerStatusEnum.INSTALLATION_IN_PROGRESS]: '安装中',
  [ServerStatusEnum.UNINSTALLING]: '卸载中',
  [ServerStatusEnum.NOT_STARTED]: '已安装未启动',
  [ServerStatusEnum.STARTED]: '已安装已启动'
}

@Injectable()
export class TrojanService {
  constructor(private readonly taskService: TaskService) {}

  private scheduleStatusSync(isInstall?: boolean) {
    const htmlDir = '/usr/share/nginx/html'
    const htmlFile = join(__dirname, '../../../html/index.html')
    if (isInstall && existsSync(htmlFile)) {
      mkdirSync(htmlDir, { recursive: true })
      const html = readFileSync(htmlFile)
      writeFileSync(`${htmlDir}/index.html`, html, {
        encoding: 'utf-8'
      })
    }
    this.taskService.triggerSync()
  }

  async install(body: TrojanControlDto) {
    const serverIdError = this.assertServerId(body.serverId)
    if (serverIdError) return serverIdError
    if (!body.port) return apiUtil.error('未配置端口')
    if (!body.domain) return apiUtil.error('未配置域名')

    const ip = await this.fetchLocalIp()
    if (!ip) return apiUtil.error('本机IP获取失败')

    await configTrojanJson(ip, body.port, body.domain)
    this.taskService.spawnTask(
      `install-${body.serverId}`,
      'bash',
      [join(__dirname, '../../../bin/install.sh'), body.proxyUrl || 'NO'],
      () => {
        void this.scheduleStatusSync(true)
      }
    )

    return apiUtil.data(`${body.serverId}`)
  }

  uninstall(body: TrojanControlDto) {
    const serverIdError = this.assertServerId(body.serverId)
    if (serverIdError) return serverIdError

    this.taskService.spawnTask(
      `uninstall-${body.serverId}`,
      'bash',
      [join(__dirname, '../../../bin/uninstall.sh')],
      () => {
        void this.scheduleStatusSync()
      }
    )

    return apiUtil.data(`${body.serverId}`)
  }

  async start(body: TrojanControlDto) {
    const serverIdError = this.assertServerId(body.serverId)
    if (serverIdError) return serverIdError
    if (!body.port) return apiUtil.error('未配置端口')

    const trojanStatus = await fetchTrojanStatus(body.port)
    if (trojanStatus !== ServerStatusEnum.NOT_STARTED) {
      return apiUtil.error(`当前服务器-${statusText[trojanStatus]}`)
    }
    const [, bt] = await to(execSync('which bt 2>/dev/null'))
    await stopNginx(!!bt)
    await startNginx(!!bt)
    await execSync('systemctl restart trojan-go')
    await sleep()
    const res = await fetchTrojanStatus(body.port)
    if (res !== ServerStatusEnum.STARTED) {
      return apiUtil.error(`当前服务器-${statusText[res]}`)
    }
    this.taskService.triggerSync()
    return apiUtil.data(`${body.serverId}`)
  }

  async stop(body: TrojanControlDto) {
    const serverIdError = this.assertServerId(body.serverId)
    if (serverIdError) return serverIdError
    if (!body.port) return apiUtil.error('未配置端口')

    const trojanStatus = await fetchTrojanStatus(body.port)
    if (trojanStatus !== ServerStatusEnum.STARTED) {
      return apiUtil.error(`当前服务器-${statusText[trojanStatus]}`)
    }
    const [, bt] = await to(execSync('which bt 2>/dev/null'))
    await stopNginx(!!bt)
    await execSync('systemctl stop trojan-go')
    if (bt) await startNginx(true)
    this.taskService.triggerSync()
    return apiUtil.data(`${body.serverId}`)
  }

  async userUpdate(body: TrojanUserDto) {
    const serverIdError = this.assertServerId(body.serverId)
    if (serverIdError) return serverIdError
    if (!body.pwds || !Array.isArray(body.pwds) || !body.pwds.length) {
      return apiUtil.data([])
    }
    const hashs: TrojanUserInfo[] = []
    for (const pwd of body.pwds) {
      if (body.action === TrojanActionEnum.DEL) {
        const res = await execSync(
          `trojan-go -api set -delete-profile -target-password ${pwd}`
        )
        hashs.push({ pwd: pwd, error: res !== 'Done' ? res : undefined })
      } else if (body.action === TrojanActionEnum.ADD) {
        const res = await execSync(
          `trojan-go -api set -add-profile -target-password ${pwd}`
        )
        if (res !== 'Done') {
          hashs.push({ pwd: pwd, error: res })
        } else {
          const info = await execSync(
            `trojan-go -api get -target-password ${pwd}`
          )
          const item = JSON.parse(info) as ItemT
          hashs.push({ pwd: pwd, hash: item.status?.user?.hash })
        }
      } else if (body.action === TrojanActionEnum.QUERY) {
        const info = await execSync(
          `trojan-go -api get -target-password ${pwd}`
        )
        const item = JSON.parse(info) as ItemT
        hashs.push({ pwd: pwd, hash: item.status?.user?.hash })
      }
    }
    return apiUtil.data(hashs)
  }

  async userLimit(body: TrojanLimitDto) {
    const serverIdError = this.assertServerId(body.serverId)
    if (serverIdError) return serverIdError
    if (!body.pwds || !Array.isArray(body.pwds) || !body.pwds.length) {
      return apiUtil.data([])
    }
    const hashs: TrojanUserInfo[] = []
    for (const pwd of body.pwds) {
      const res = await execSync(
        `trojan-go -api-addr 127.0.0.1:10000 -api set -modify-profile -target-password ${pwd} -ip-limit ${body.ipLimit} -upload-speed-limit ${body.uploadLimit} -download-speed-limit ${body.downloadLimit}`
      )
      hashs.push({ pwd: pwd, error: res !== 'Done' ? res : undefined })
    }
    return apiUtil.data(hashs)
  }

  async userSync(body: TrojanUserSyncDto) {
    const serverIdError = this.assertServerId(body.serverId)
    if (serverIdError) return serverIdError

    if (!body.users?.length) {
      return apiUtil.data([])
    }

    const results: TrojanUserInfo[] = []
    for (const user of body.users) {
      const addRes = await to(
        execSync(
          `trojan-go -api set -add-profile -target-password ${user.password}`
        )
      )
      if (addRes[0] && !`${addRes[0]}`.includes('Done')) {
        const info = await this.queryUserInfo(user.password)
        if (!info) {
          results.push({ pwd: user.password, error: `${addRes[0]}` })
          continue
        }
      }

      const limitRes = await execSync(
        `trojan-go -api-addr 127.0.0.1:10000 -api set -modify-profile -target-password ${user.password} -ip-limit ${user.ipLimit} -upload-speed-limit ${user.uploadLimit} -download-speed-limit ${user.downloadLimit}`
      )
      if (limitRes !== 'Done') {
        results.push({ pwd: user.password, error: limitRes })
        continue
      }

      const info = await this.queryUserInfo(user.password)
      if (!info) {
        results.push({ pwd: user.password, error: '用户信息读取失败' })
        continue
      }
      results.push({ pwd: user.password, hash: info.status?.user?.hash })
    }

    return apiUtil.data(results)
  }

  private assertServerId(serverId: number) {
    const expected = process.env.INTERNAL_SERVER_ID
    if (!expected) return
    if (`${serverId}` !== `${expected}`) {
      return apiUtil.error('serverId mismatch')
    }
  }

  private async fetchLocalIp() {
    return execSync('curl -sL -4 ip.sb')
  }

  private async queryUserInfo(password: string) {
    const [, info] = await to(
      execSync(`trojan-go -api get -target-password ${password}`)
    )
    if (!info) return null
    return JSON.parse(info) as ItemT
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
