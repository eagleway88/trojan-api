import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown
} from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { join } from 'path'

import { runSpawnAndLog } from 'src/utils'

@Injectable()
export class TaskService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TaskService.name)

  onApplicationBootstrap() {
    if (!this.isSchedulerWorker()) {
      this.logger.log(
        `跳过动态任务初始化，当前实例: ${this.fetchInstanceLabel()}`
      )
      return
    }

    this.triggerSync()
  }

  onApplicationShutdown() {}

  @Cron('0 */5 * * * *', { timeZone: 'Asia/Shanghai' })
  handleStatusSync() {
    if (!this.isSchedulerWorker()) {
      return
    }

    this.triggerSync()
  }

  private isSchedulerWorker() {
    if (process.env.SCHEDULER_ENABLED === 'false') return false

    const instance = process.env.NODE_APP_INSTANCE
    return instance == null || instance === '0'
  }

  private fetchInstanceLabel() {
    return process.env.NODE_APP_INSTANCE ?? 'single'
  }

  triggerSync() {
    this.logger.log(`触发状态上报任务，当前实例: ${this.fetchInstanceLabel()}`)
    this.executeTask()
  }

  spawnTask(
    name: string,
    command: string,
    args: readonly string[],
    onClose?: () => void
  ) {
    runSpawnAndLog(name, command, args, onClose)
  }

  private executeTask() {
    runSpawnAndLog('update-trojan', process.argv[0], [
      join(__dirname, '../scripts/update-trojan.js')
    ])
  }
}
