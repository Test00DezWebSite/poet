import * as Koa from 'koa'
import * as Router from 'koa-router'
import * as KoaBody from 'koa-body'

import { getConnection } from '../blockchain/connection'
import { BlockchainService } from '../blockchain/domainService'
import { addRoutes } from '../blockchain/httpApi/router'
import { logErrors } from '../helpers/KoaHelper'
import { ExplorerConfiguration } from './configuration'

export class ExplorerApi {
  private readonly configuration: ExplorerConfiguration
  private readonly koa: Koa
  private readonly router: Router
  private readonly service: BlockchainService
  
  constructor(configuration: ExplorerConfiguration) {
    this.configuration = configuration
    this.koa = new Koa()
    this.router = new Router()
    this.service = new BlockchainService()
  }

  public async start() {
    await this.service.start(() => getConnection(this.configuration.db))
    await addRoutes(this.router, this.service)

    this.koa.use(KoaBody())
    this.koa.use(this.router.allowedMethods())
    this.koa.use(this.router.routes())
    this.koa.use(logErrors)

    await this.koa.listen(this.configuration.apiPort, '0.0.0.0')
  }
}
