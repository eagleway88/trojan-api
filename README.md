<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ yarn install
```

## Environment Variables

复制 `.env.example` 为 `.env.local` 或 `.env` 后，再按部署环境填写下面这些参数。

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| PORT | 否 | 8086 | 辅助项目监听端口。 |
| SWAGGER_ENABLED | 否 | false | 是否暴露 Swagger 文档。生产环境建议保持为 false。 |
| SCHEDULER_ENABLED | 否 | true | 是否启用本机状态上报调度。设置为 false 时不会自动触发状态回调。 |
| STATUS_SYNC_CRON | 否 | `0 */5 * * * *` | 本机状态上报 cron 表达式。默认每 5 分钟执行一次。 |
| MAIN_API_BASE_URL | 是 | 无 | 主项目 HTTP 地址，供辅助项目回调状态同步接口使用。建议写完整协议、域名和端口，并且不要带结尾 `/`。 |
| INTERNAL_SERVER_ID | 是 | 无 | 当前节点在主项目 `servers` 表中的主键 ID。辅助项目只接受与该 serverId 匹配的内部请求。 |
| INTERNAL_AUTH_KEY_ID | 是 | 无 | 当前节点的内部鉴权 keyId。需要与主项目 `server_internal_auths` 表中的记录一致。 |
| INTERNAL_AUTH_SECRET | 是 | 无 | 当前节点的内部鉴权 secret。需要与 `INTERNAL_AUTH_KEY_ID` 对应，并由主项目生成或维护。 |
| INTERNAL_SYNC_PATH | 否 | `/api/trojan/internal/sync` | 辅助项目回调主项目的状态同步路径。通常不需要改。 |

### Deployment Notes

- 辅助项目已经不再读取 `ORM_HOST`、`ORM_PORT`、`ORM_USERNAME`、`ORM_PASSWORD`、`ORM_DATABASE`，节点机上也不应该再保留主库连接信息。
- `MAIN_API_BASE_URL`、`INTERNAL_AUTH_KEY_ID`、`INTERNAL_AUTH_SECRET` 和 `INTERNAL_SERVER_ID` 必须成组配置，否则状态上报和内部控制请求都会失败。
- 如果通过 PM2 以 cluster 模式运行，需要保留 `instance_var: 'NODE_APP_INSTANCE'`，这样只有 0 号 worker 会执行固定状态上报任务。
- 首次部署或更换节点凭据时，先在主项目执行数据库迁移并确认 `server_internal_auths` 已有对应节点记录，再把该节点的 `keyId` 和 `secret` 下发到辅助项目环境变量。

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
