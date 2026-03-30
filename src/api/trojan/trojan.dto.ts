import { IsString, IsNumber, IsNotEmpty } from 'class-validator'
import { TrojanActionEnum } from 'src/enums'

export class TrojanUserDto {
  @IsNumber()
  @IsNotEmpty()
  apiPort: number

  @IsString()
  @IsNotEmpty()
  ip: string

  @IsString()
  @IsNotEmpty()
  action: TrojanActionEnum

  pwds?: string[]
}

export class TrojanLimitDto {
  @IsNumber()
  @IsNotEmpty()
  apiPort: number

  @IsString()
  @IsNotEmpty()
  ip: string

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