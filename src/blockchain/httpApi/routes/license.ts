import 'reflect-metadata'
import * as Koa from 'koa'
import Router = require('koa-router')
import { QueryBuilder } from 'typeorm'

import { BlockchainService } from '../../domainService'
import { Route, QueryOptions } from '../route'
import License from '../../orm/domain/license'

interface LicenseQueryOptions extends QueryOptions {
  emitter?: string
  holder?: string
  relatedTo?: string
  query?: string
}

const PROFILE_ID = 'profileId'

export class LicenseRoute extends Route<License> {
  private readonly service: BlockchainService

  constructor(service: BlockchainService) {
    super(service.licenseRepository, 'licenses')
    this.service = service
  }

  async getItem(id: string) {
    const info = await this.service.getClaimInfo(id)
    const license = await this.service.getLicenseFull(id)
    return { claimInfo: info, ...license }
  }

  async getCollection(opts: QueryOptions) {
    const items = await super.getCollection(opts)
    return await Promise.all(items.map(
      async (item) => {
        const license = await this.service.getLicenseFull(item.id)
        const info = await this.service.getClaimInfo(item.id)
        return { claimInfo: info, ...license }
      }
    ))
  }

  getParamOpts(ctx: Koa.Context): LicenseQueryOptions {
    const options = super.getParamOpts(ctx) as LicenseQueryOptions;
    options.emitter = ctx.request.query['emitter']
    options.holder = ctx.request.query['holder']
    options.relatedTo = ctx.request.query['relatedTo']
    options.query = ctx.request.query['query']
    return options
  }

  ownFilter(queryBuilder: QueryBuilder<License>, opts: LicenseQueryOptions): QueryBuilder<License> {
    if (opts.holder) {
      queryBuilder.andWhere("item.licenseHolder=:holder", { "holder": opts.holder })
    }
    if (opts.emitter) {
      queryBuilder.andWhere("item.licenseEmitter=:emitter", { "emitter": opts.emitter })
    }
    if (opts.relatedTo) {
      queryBuilder.andWhere("item.licenseEmitter=:user OR item.licenseHolder=:user", { "user": opts.relatedTo })
    }
    if (opts.query) {
      queryBuilder
        .leftJoin('attribute', 'attr', 'attr.claim=item.reference')
        .andWhere(
          '(attr.key=:key1 OR attr.key=:key2) AND attr.value LIKE :value',
          { key1: 'name', key2: 'content', value: `%${opts.query}%` }
        )
    }
    return queryBuilder
  }

  addRoutes(router: Router): any {
    super.addRoutes(router);

    router.get('/licenseTxs', async (ctx) => {
      const profileId = ctx.request.query[PROFILE_ID]

      ctx.body = (await this.repository.createQueryBuilder('license')
        .andWhere('license.licenseHolder=:profileId OR license.licenseEmitter=:profileId', { profileId })
        .getMany())
        .filter((license: License) => license.bitcoinTx)
        .map((license: License) => license.bitcoinTx)
    })
  }
}