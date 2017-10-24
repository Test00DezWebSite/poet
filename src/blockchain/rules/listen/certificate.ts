import { Claim, ClaimTypes, Fields } from 'poet-js'

import { BlockchainService } from '../../domainService'
import { BlockMetadata } from '../../../events'

export const CertificateRule = {
  type: ClaimTypes.CERTIFICATE,
  hook: async (service: BlockchainService, claim: Claim, txInfo: BlockMetadata) => {
    const referenceId = claim.attributes[Fields.REFERENCE]
    if (!referenceId) {
      console.log('Odd certificate: no reference', claim)
      return
    }
    const notaryApproves = await service.certificationService.notaryApproval(claim)
    if (notaryApproves) {
      const reference = await service.getClaim(referenceId)
      if (!reference) {
        console.log('problem with certificate: no referred claim found')
        return
      }
      await service.certificationService.certifyClaim(reference, txInfo)
    }
  }
}
