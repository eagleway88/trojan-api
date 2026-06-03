import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { TrojanService } from './trojan.service'
import {
  TrojanControlDto,
  TrojanLimitDto,
  TrojanUserDto,
  TrojanUserInfo,
  TrojanUserSyncDto
} from './trojan.dto'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiResult } from 'src/decorators'
import { InternalSignatureGuard } from 'src/internal-auth/internal-signature.guard'

@ApiTags('trojan')
@UseGuards(InternalSignatureGuard)
@Controller('trojan')
export class TrojanController {
  constructor(private readonly service: TrojanService) {}

  @Post('install')
  @ApiOperation({ summary: '安装' })
  @ApiResult({ type: String })
  install(@Body() body: TrojanControlDto) {
    return this.service.install(body)
  }

  @Post('uninstall')
  @ApiOperation({ summary: '卸载' })
  @ApiResult({ type: String })
  uninstall(@Body() body: TrojanControlDto) {
    return this.service.uninstall(body)
  }

  @Post('start')
  @ApiOperation({ summary: '启动' })
  @ApiResult({ type: String })
  start(@Body() body: TrojanControlDto) {
    return this.service.start(body)
  }

  @Post('stop')
  @ApiOperation({ summary: '停止' })
  @ApiResult({ type: String })
  stop(@Body() body: TrojanControlDto) {
    return this.service.stop(body)
  }

  @Post('user/update')
  @ApiOperation({ summary: '调整用户' })
  @ApiResult({ type: [TrojanUserInfo] })
  userUpdate(@Body() body: TrojanUserDto) {
    return this.service.userUpdate(body)
  }

  @Post('user/limit')
  @ApiOperation({ summary: '限制用户' })
  @ApiResult({ type: [TrojanUserInfo] })
  limit(@Body() body: TrojanLimitDto) {
    return this.service.userLimit(body)
  }

  @Post('user/sync')
  @ApiOperation({ summary: '同步用户' })
  @ApiResult({ type: [TrojanUserInfo] })
  sync(@Body() body: TrojanUserSyncDto) {
    return this.service.userSync(body)
  }
}
