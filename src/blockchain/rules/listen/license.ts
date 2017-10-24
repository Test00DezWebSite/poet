import { Claim, ClaimTypes, Fields } from 'poet-js'

import { BlockchainService } from '../../domainService'
import { BlockMetadata } from '../../../events'

export const LicenseRule = {
  type: ClaimTypes.LICENSE,
  hook: async (service: BlockchainService, claim: Claim, txInfo: BlockMetadata) => {
    if (claim.attributes[Fields.REFERENCE]) {
      await service.linkClaims(claim.attributes[Fields.REFERENCE], claim.id)
    }
    if (claim.attributes[Fields.REFERENCE]) {
      await service.linkClaims(claim.attributes[Fields.REFERENCE], claim.id)
    }
    if (claim.attributes[Fields.REFERENCE]) {
      await service.linkClaims(claim.attributes[Fields.REFERENCE], claim.id)
    }
    if (claim.attributes[Fields.REFERENCE]) {
      await service.linkClaims(claim.attributes[Fields.REFERENCE], claim.id)
    }
  }
}
