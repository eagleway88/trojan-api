import { Column, Entity, Unique, PrimaryGeneratedColumn, OneToMany } from 'typeorm'
import { UpdateDateColumn, CreateDateColumn } from 'typeorm'
import { EnableEnum, ServerSourceEnum, ServerStatusEnum, ServerTypeEnum } from '../enums'
import { UserServer } from './user.server.entity'

@Entity('servers')
@Unique(['name', 'ip'])
export class Server {
  @PrimaryGeneratedColumn({
    type: 'int',
    name: 'id'
  })
  id: number

  @Column('varchar', {
    name: 'name',
    comment: '服务器名称',
    length: 255
  })
  name: string

  @Column('varchar', {
    name: 'icon',
    comment: '服务器图标',
    length: 255,
    nullable: true
  })
  icon: string | null

  @Column('text', {
    name: 'desc',
    comment: '服务器描述',
    nullable: true
  })
  desc: string | null

  @Column('varchar', {
    name: 'locale_target',
    comment: '多语言标识、server_id_desc',
    nullable: true,
    length: 255
  })
  localeTarget: string | null

  @Column('int', {
    name: 'bandwidth',
    comment: '带宽',
    default: () => '0'
  })
  bandwidth: number

  @Column('int', {
    name: 'delay',
    comment: '延迟',
    default: () => '0'
  })
  delay: number

  @Column('int', {
    name: 'api_port',
    comment: 'API端口',
    default: () => '8086'
  })
  apiPort: number

  @Column('int', {
    name: 'online',
    comment: '在线人数',
    default: () => '0'
  })
  online: number

  @Column('int', {
    name: 'ip_limit',
    comment: '最大IP限制',
    default: () => '0'
  })
  ipLimit: number

  @Column('bigint', {
    name: 'upload_traffic',
    comment: '总上传流量',
    default: () => '0'
  })
  uploadTraffic: number

  @Column('bigint', {
    name: 'download_traffic',
    comment: '总下载流量',
    default: () => '0'
  })
  downloadTraffic: number

  @Column('varchar', {
    name: 'ip',
    comment: 'IP',
    length: 255
  })
  ip: string

  @Column('int', {
    name: 'port',
    comment: 'VPN端口'
  })
  port: number

  @Column('varchar', {
    name: 'domain',
    comment: 'VPN域名',
    length: 255
  })
  domain: string

  /** 排序权重(数字越小越靠前) */
  @Column('int', {
    name: 'sort',
    comment: '排序权重(数字越小越靠前)',
    default: () => '0'
  })
  sort: number

  @Column({
    type: 'tinyint',
    name: 'status',
    comment: '0-未安装、1-安装中、2-卸载中、3-已安装未启动、4-已安装已启动',
    default: () => '0'
  })
  status: ServerStatusEnum

  @Column({
    type: 'tinyint',
    name: 'type',
    comment: '0-自有服务器、1-外部资源',
    default: () => '0'
  })
  type: ServerTypeEnum

  @Column({
    type: 'tinyint',
    name: 'source',
    comment: '0-手动添加、1-网络抓取',
    default: () => '0'
  })
  source: ServerSourceEnum

  @Column('varchar', {
    name: 'protocol',
    comment: '代理协议(trojan/vless)',
    default: 'trojan'
  })
  protocol: string

  @Column('text', {
    name: 'external_content',
    comment: '外部资源配置(类似vless://xxx)',
    nullable: true
  })
  externalContent: string | null

  @Column({
    type: 'tinyint',
    name: 'enable',
    comment: '0-禁用、1-启用',
    default: () => '1',
  })
  enable: EnableEnum

  @Column('datetime', {
    name: 'start_time',
    comment: '启动时间',
    nullable: true
  })
  startTime: Date | null

  @CreateDateColumn({
    name: 'create_time',
    comment: '创建时间'
  })
  createTime: Date

  @UpdateDateColumn({
    name: 'update_time',
    comment: '更新时间'
  })
  updateTime: Date

  @OneToMany(() => UserServer, userServer => userServer.server)
  userServers: UserServer[]
}
