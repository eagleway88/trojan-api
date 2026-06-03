import { Type } from 'class-transformer'
import {
  IsArray,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator'
import { TrojanActionEnum } from 'src/enums'

export class TrojanControlDto {
  @IsNumber()
  @IsNotEmpty()
  serverId: number

  @IsNumber()
  @IsOptional()
  port?: number

  @IsString()
  @IsOptional()
  domain?: string

  @IsString()
  @IsOptional()
  proxyUrl?: string
}

export class TrojanUserDto {
  @IsNumber()
  @IsNotEmpty()
  serverId: number

  @IsString()
  @IsNotEmpty()
  action: TrojanActionEnum

  pwds?: string[]
}

export class TrojanLimitDto {
  @IsNumber()
  @IsNotEmpty()
  serverId: number

  @IsNumber()
  @IsNotEmpty()
  ipLimit: number

  @IsNumber()
  @IsNotEmpty()
  uploadLimit: number

  @IsNumber()
  @IsNotEmpty()
  downloadLimit: number

  pwds?: string[]
}

export class TrojanUserInfo {
  hash?: string
  error?: string
  pwd?: string
}

export class TrojanUserSyncItemDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number

  @IsString()
  @IsNotEmpty()
  password: string

  @IsNumber()
  @IsNotEmpty()
  ipLimit: number

  @IsNumber()
  @IsNotEmpty()
  uploadLimit: number

  @IsNumber()
  @IsNotEmpty()
  downloadLimit: number
}

export class TrojanUserSyncDto {
  @IsNumber()
  @IsNotEmpty()
  serverId: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrojanUserSyncItemDto)
  users: TrojanUserSyncItemDto[]
}
