import { Claim, ClaimTypes, Fields } from 'poet-js'

import { BlockchainService } from '../../domainService'
import { BlockMetadata } from '../../../events'

export const TitleRule = {
  type: ClaimTypes.TITLE,
  hook: async (service: BlockchainService, claim: Claim, txInfo: BlockMetadata) => {
    if (claim.attributes[Fields.REFERENCE]) {
      await service.linkClaims(claim.attributes[Fields.REFERENCE], claim.id)
    }
    if (claim.attributes[Fields.OWNER_KEY]) {
      await service.linkClaims(claim.attributes[Fields.OWNER_KEY], claim.id)
    }
    if (claim.attributes[Fields.REFERENCE_OFFERING]) {
      await service.linkClaims(claim.attributes[Fields.REFERENCE_OFFERING], claim.id)
    }
  }
}
