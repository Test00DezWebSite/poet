import 'reflect-metadata'

import { BlockchainService } from '../../domainService'
import { Route } from '../route'
import Offering from '../../orm/domain/offering'

export class OfferingRoute extends Route<Offering> {
  private readonly service: BlockchainService

  constructor(service: BlockchainService) {
    super(service.offeringRepository, 'offerings')
    this.service = service
  }
}
