import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TrojanModule } from './api/trojan/trojan.module'
import { LogModule } from './api/log/log.module'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env']
    }),
    TrojanModule,
    LogModule
  ],
  controllers: [],
  providers: []
})
export class AppModule {}
