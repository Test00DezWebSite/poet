import { Claim, ClaimTypes, Fields } from 'poet-js'

import { BlockchainService } from '../../domainService'
import { BlockMetadata } from '../../../events'

export const OfferingRule = {
  type: ClaimTypes.OFFERING,
  hook: async (service: BlockchainService, claim: Claim, txInfo: BlockMetadata) => {
    if (claim.attributes[Fields.REFERENCE]) {
      await service.linkClaims(claim.attributes[Fields.REFERENCE], claim.id)
    }
    if (claim.attributes[Fields.REFERENCE_OWNER]) {
      await service.linkClaims(claim.attributes[Fields.REFERENCE_OWNER], claim.id)
    }
  }
}
