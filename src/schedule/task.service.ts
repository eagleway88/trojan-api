import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown
} from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { join } from 'path'
import { Server } from 'src/entities/server.entity'
import { execSync, runSpawnAndLog } from 'src/utils'
import { Repository } from 'typeorm'
import { CronJob } from 'cron'

@Injectable()
export class TaskService
  implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TaskService.name)
  private readonly jobPrefix = 'task_server_'
  private readonly reconcileIntervalMs = Number(
    process.env.SCHEDULER_RECONCILE_MS || 60_000
  )
  private reconcileTimer?: NodeJS.Timeout

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectRepository(Server)
    private readonly tServer: Repository<Server>
  ) { }

  async onApplicationBootstrap() {
    if (!this.isSchedulerWorker()) {
      this.logger.log(
        `跳过动态任务初始化，当前实例: ${this.fetchInstanceLabel()}`
      )
      return
    }

    await this.reconcileDynamicTasks()

    this.reconcileTimer = setInterval(() => {
      void this.reconcileDynamicTasks()
    }, this.reconcileIntervalMs)
    this.reconcileTimer.unref?.()
  }

  onApplicationShutdown() {
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer)
    }
  }

  /**
   * 刷新单个定时任务（删除旧的，启动新的）
   */
  async refreshCronJob(_id: number) {
    if (!this.isSchedulerWorker()) {
      this.logger.log(
        `当前实例未启用调度器，等待 leader 自动同步: ${this.fetchInstanceLabel()}`
      )
      return
    }

    await this.reconcileDynamicTasks()
  }

  private isSchedulerWorker() {
    if (process.env.SCHEDULER_ENABLED === 'false') return false

    const instance = process.env.NODE_APP_INSTANCE
    return instance == null || instance === '0'
  }

  private fetchInstanceLabel() {
    return process.env.NODE_APP_INSTANCE ?? 'single'
  }

  private clearManagedJobs() {
    for (const [jobName, job] of this.schedulerRegistry.getCronJobs()) {
      if (!jobName.startsWith(this.jobPrefix)) continue
      job.stop()
      this.schedulerRegistry.deleteCronJob(jobName)
      this.logger.log(`已停止并移除旧任务: ${jobName}`)
    }
  }

  private async reconcileDynamicTasks() {
    const [servers, ip] = await Promise.all([
      this.tServer.findBy({ type: 0 }),
      execSync('curl -sL -4 ip.sb')
    ])

    this.clearManagedJobs()

    if (!ip || !servers.length) return

    const item = servers.find(e => e.ip === ip)
    const index = servers.findIndex(e => e.ip === ip)
    if (!item) return
    const jobName = `${this.jobPrefix}${item.id}`

    // 0 10 * * * *  每小时，在第10分钟开始时
    let minute = (index + servers.length) * 3
    if (minute > 59) minute = 59

    const cronExpression = `0 ${minute} * * * *`

    const job = new CronJob(cronExpression, () => {
      this.executeTask()
    })

    // 2. 将任务添加到调度注册表
    this.schedulerRegistry.addCronJob(jobName, job)

    // 3. 启动任务
    job.start()

    this.logger.log(`已为 Server ID: ${item.id} 启动定时任务 [${cronExpression}]`)
  }

  private executeTask() {
    runSpawnAndLog('update-trojan', process.argv[0], [
      join(__dirname, '../scripts/update-trojan.js')
    ])
  }

  // // 每 5 分钟
  // @Cron(CronExpression.EVERY_5_MINUTES)
  // async updateInfo() {
  //   runSpawnAndLog('update-trojan', process.argv[0], [
  //     join(__dirname, '../scripts/update-trojan.js')
  //   ])
  // }
}
