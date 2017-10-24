import { Claim, Fields, ClaimTypes, looksLikePublicKey } from 'poet-js'

import { BlockchainService } from '../../domainService'
import { BlockMetadata } from '../../../events'
import { EventType } from '../../orm/events/events'

export default {
  type: ClaimTypes.WORK,
  hook: async (service: BlockchainService, claim: Claim, txInfo: BlockMetadata) => {
    const authorId = claim.attributes[Fields.AUTHOR]
    const author = looksLikePublicKey(authorId)
      ? await service.getOrCreateProfile(authorId)
      : undefined
    const supersedes = claim.attributes[Fields.SUPERSEDES]
    let previousWork

    if (supersedes) {
      const supersededWorkOwner = await service.getOwnerPublicKey(supersedes)
      if (claim.publicKey !== supersededWorkOwner) {
        console.log('User does not control the superseded work', claim)
        return
      }

      previousWork = await service.getWork(supersedes)
    }

    const work = await service.upsertWork(
      claim.id,
      author,
      claim.attributes[Fields.WORK_NAME],
      supersedes)

    await service.saveEvent(
      claim.id,
      supersedes ? EventType.WORK_MODIFIED : EventType.WORK_CREATED,
      work,
      await service.profileRepository.findOneById(claim.publicKey),
      supersedes && previousWork.claimId
    )

    return work
  }
}
