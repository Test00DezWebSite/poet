import { Claim, ClaimTypes, looksLikePublicKey, Fields } from 'poet-js'

import { BlockchainService } from '../../domainService'
import { BlockMetadata } from '../../../events'

export const WorkRule = {
  type: ClaimTypes.WORK,
  hook: async (service: BlockchainService, claim: Claim, txInfo: BlockMetadata) => {
    const authorId = claim.attributes[Fields.AUTHOR]
    if (looksLikePublicKey(authorId)) {
      await service.linkClaims(claim.attributes[Fields.AUTHOR], claim.id)
    }
  }
}
