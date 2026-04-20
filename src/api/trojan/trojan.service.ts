import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { join } from 'path'
import { Server } from 'src/entities/server.entity'
import { execSync, runSpawnAndLog, sleep, to } from 'src/utils'
import { apiUtil } from 'src/utils/api'
import { Repository } from 'typeorm'
import { TrojanLimitDto, TrojanUserDto, TrojanUserInfo } from './trojan.dto'
import { configTrojanJson, fetchTrojanStatus } from 'src/utils/trojan'
import { startNginx, stopNginx } from 'src/utils/trojan'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { TaskService } from 'src/schedule/task.service'
import { EnableEnum, ServerStatusEnum, TrojanActionEnum } from 'src/enums'

export const statusText: Record<number, string> = {
  [ServerStatusEnum.NOT_INSTALLED]: '未安装',
  [ServerStatusEnum.INSTALLATION_IN_PROGRESS]: '安装中',
  [ServerStatusEnum.UNINSTALLING]: '卸载中',
  [ServerStatusEnum.NOT_STARTED]: '已安装未启动',
  [ServerStatusEnum.STARTED]: '已安装已启动'
}

@Injectable()
export class TrojanService {
  constructor(
    private readonly taskService: TaskService,
    @InjectRepository(Server)
    private readonly tServer: Repository<Server>
  ) { }

  private async updateTrojan(isInstall?: boolean) {
    const htmlDir = '/usr/share/nginx/html'
    const htmlFile = join(__dirname, '../../../html/index.html')
    if (isInstall && existsSync(htmlFile)) {
      mkdirSync(htmlDir, { recursive: true })
      const html = readFileSync(htmlFile)
      writeFileSync(`${htmlDir}/index.html`, html, {
        encoding: 'utf-8'
      })
    }
    runSpawnAndLog('update-trojan', process.argv[0], [
      join(__dirname, '../../scripts/update-trojan.js')
    ])
  }

  async install() {
    const ip = await execSync('curl -sL -4 ip.sb')
    if (!ip) return apiUtil.error('本机IP获取失败')
    const entity = await this.tServer.findOneBy({
      ip: ip,
      enable: EnableEnum.YES
    })
    if (!entity) return apiUtil.error('资源不存在')
    if (!entity.port) return apiUtil.error('未配置端口')
    if (!entity.domain) return apiUtil.error('未配置域名')
    if (entity.status !== ServerStatusEnum.NOT_INSTALLED) {
      return apiUtil.error(`当前服务器-${statusText[entity.status]}`)
    }
    // 配置 trojan
    configTrojanJson(ip, entity.port, entity.domain)
    runSpawnAndLog(
      `install-${entity.domain.replaceAll('.', '-')}`,
      'bash',
      // 静态页模式：bash install.sh NO，反代模式：bash install.sh https://example.com
      [join(__dirname, '../../../bin/install.sh'), 'NO'],
      () => this.updateTrojan(true)
    )
    entity.status = ServerStatusEnum.INSTALLATION_IN_PROGRESS
    await this.tServer.save(entity)
    return apiUtil.data(`${entity.id}`)
  }

  async uninstall() {
    const ip = await execSync('curl -sL -4 ip.sb')
    if (!ip) return apiUtil.error('本机IP获取失败')
    const entity = await this.tServer.findOneBy({
      ip: ip,
      enable: EnableEnum.YES
    })
    if (!entity) return apiUtil.error('资源不存在')
    if (![ServerStatusEnum.NOT_INSTALLED, ServerStatusEnum.STARTED].includes(entity.status)) {
      return apiUtil.error(`当前服务器-${statusText[entity.status]}`)
    }
    runSpawnAndLog(
      `uninstall-${entity.domain.replaceAll('.', '-')}`,
      'bash',
      [join(__dirname, '../../../bin/uninstall.sh')],
      () => this.updateTrojan()
    )
    entity.status = ServerStatusEnum.UNINSTALLING
    await this.tServer.save(entity)
    return apiUtil.data(`${entity.id}`)
  }

  async start() {
    const ip = await execSync('curl -sL -4 ip.sb')
    if (!ip) return apiUtil.error('本机IP获取失败')
    const entity = await this.tServer.findOneBy({
      ip: ip,
      enable: EnableEnum.YES
    })
    if (!entity) return apiUtil.error('资源不存在')
    if (entity.status !== ServerStatusEnum.NOT_INSTALLED) {
      return apiUtil.error(`当前服务器-${statusText[entity.status]}`)
    }
    const trojanStatus = await fetchTrojanStatus(entity.port)
    if (trojanStatus !== ServerStatusEnum.NOT_STARTED) {
      return apiUtil.error(`当前服务器-${statusText[entity.status]}`)
    }
    const [, bt] = await to(execSync('which bt 2>/dev/null'))
    await stopNginx(!!bt)
    await startNginx(!!bt)
    await execSync('systemctl restart trojan-go')
    await sleep()
    const res = await fetchTrojanStatus(entity.port)
    if (res !== ServerStatusEnum.STARTED) {
      return apiUtil.error(`当前服务器-${statusText[entity.status]}`)
    }
    entity.status = ServerStatusEnum.STARTED
    await this.tServer.save(entity)
    return apiUtil.data(`${entity.id}`)
  }

  async stop() {
    const ip = await execSync('curl -sL -4 ip.sb')
    if (!ip) return apiUtil.error('本机IP获取失败')
    const entity = await this.tServer.findOneBy({
      ip: ip,
      enable: EnableEnum.YES
    })
    if (!entity) return apiUtil.error('资源不存在')
    if (entity.status !== ServerStatusEnum.STARTED) {
      return apiUtil.error(`当前服务器-${statusText[entity.status]}`)
    }
    const trojanStatus = await fetchTrojanStatus(entity.port)
    if (trojanStatus !== ServerStatusEnum.STARTED) {
      return apiUtil.error(`当前服务器-${statusText[entity.status]}`)
    }
    const [, bt] = await to(execSync('which bt 2>/dev/null'))
    await stopNginx(!!bt)
    await execSync('systemctl stop trojan-go')
    entity.status = ServerStatusEnum.NOT_STARTED
    await this.tServer.save(entity)
    if (bt) await startNginx(true)
    return apiUtil.data(`${entity.id}`)
  }

  async userUpdate(body: TrojanUserDto) {
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
          const info = await execSync(`trojan-go -api get -target-password ${pwd}`)
          const item = JSON.parse(info) as ItemT
          hashs.push({ pwd: pwd, hash: item.status?.user?.hash })
        }
      } else if (body.action === TrojanActionEnum.QUERY) {
        const info = await execSync(`trojan-go -api get -target-password ${pwd}`)
        const item = JSON.parse(info) as ItemT
        hashs.push({ pwd: pwd, hash: item.status?.user?.hash })
      }
    }
    return apiUtil.data(hashs)
  }

  async userLimit(body: TrojanLimitDto) {
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

  async refreshCronJob() {
    const ip = await execSync('curl -sL -4 ip.sb')
    if (!ip) return apiUtil.error('本机IP获取失败')
    const entity = await this.tServer.findOneBy({
      ip: ip
    })
    if (!entity) return apiUtil.error('资源不存在')
    await this.taskService.refreshCronJob(entity.id)
    return apiUtil.data('success')
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
