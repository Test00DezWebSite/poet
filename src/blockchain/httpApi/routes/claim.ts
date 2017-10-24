import 'reflect-metadata'

import { BlockchainService } from '../../domainService'
import { Route, QueryOptions } from '../route'
import ClaimInfo from '../../orm/claimInfo'
import Claim from '../../orm/claim'

export class ClaimRoute extends Route<Claim> {
  private readonly service: BlockchainService

  constructor(service: BlockchainService) {
    super(service.claimRepository, 'claims')
    this.service = service
  }

  async getItem(id: string) {
    // Ugly hack to get around typing Claim as an ORM object instead of Pure object
    // It woud be nicer to do just service.getClaim(id), but we'll do that in `prepareItem`
    // More on (1)
    return await this.service.claimRepository.create({ id })
  }

  async prepareItem(claim: Claim) {
    // (1): The real fetch
    const claimData = await this.service.getClaim(claim.id)
    const info = await this.service.getClaimInfo(claim.id)
    return { ...claimData, claimInfo: info }
  }

  async getCollection(opts: QueryOptions) {
    const claims = await this.service.claimRepository.createQueryBuilder('claims')
      .leftJoinAndMapMany('claims.attributes', 'claims.attributes', 'attributes')
      .setLimit(opts.limit)
      .setOffset(opts.offset)
      .getMany()
    const info = await this.service.claimInfoRepository.find({ hash: claims.map(claim => claim.id) })
    const mapInfo: { [id: string]: ClaimInfo } = {}
    for (let claimInfo of info) {
      mapInfo[claimInfo.hash] = claimInfo
    }
    return claims.map(claim => {
      const info = mapInfo[claim.id] || {}
      return { ...claim, claimInfo: info }
    })
  }
}
