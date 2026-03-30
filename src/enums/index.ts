
export enum PlatformTypeEnum {
  ios = 'ios',
  macos = 'macos',
  android = 'android',
  windows = 'windows',
  linux = 'linux',
  web = 'web'
}

export enum EnableEnum {
  NO,
  YES
}

export enum ServerStatusEnum {
  /** 未安装 */
  NOT_INSTALLED,
  /** 安装中 */
  INSTALLATION_IN_PROGRESS,
  /** 卸载中 */
  UNINSTALLING,
  /** 已安装未启动 */
  NOT_STARTED,
  /** 已安装已启动 */
  STARTED
}

export enum ServerTypeEnum {
  /** 自有服务器 */
  SELF,
  /** 外部资源 */
  EXTERNAL
}

export enum TrojanActionEnum {
  DEL = 'DEL',
  ADD = 'ADD',
  QUERY = 'QUERY'
}
