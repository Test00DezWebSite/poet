import { Claim } from 'poet-js'

import { BlockMetadata } from '../events'
import { CertificationRules } from './rules/certification'
import { BlockchainService } from './domainService'

export class CertificationService {

  private domainService: BlockchainService;

  constructor(domainService: BlockchainService) {
    this.domainService = domainService
  }

  async notaryApproval(claim: Claim) {
    // TODO: Validate signature
    // TODO: Validate public key is trusted
    // TODO: Notary repository
    return true
  }

  async certifyClaim(reference: Claim, txInfo: BlockMetadata) {
    return await Promise.all(CertificationRules[reference.type].map(
      rule => rule.hook(this.domainService, reference, txInfo)
    ))
  }
}