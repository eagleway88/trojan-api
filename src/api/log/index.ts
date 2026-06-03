import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { LogService } from './log.service'
import { LogItem, LogPageDto } from './log.dto'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiResult } from 'src/decorators'
import { InternalSignatureGuard } from 'src/internal-auth/internal-signature.guard'

@ApiTags('log')
@UseGuards(InternalSignatureGuard)
@Controller('log')
export class LogController {
  constructor(private readonly service: LogService) {}

  @Post('files')
  @ApiOperation({ summary: '日记文件' })
  @ApiResult({ type: [String] })
  files() {
    return this.service.files()
  }

  @Post('pages')
  @ApiOperation({ summary: '分页查询' })
  @ApiResult({ type: LogItem, isPage: true })
  pages(@Body() body: LogPageDto) {
    return this.service.pages(body)
  }
}
