import { Claim, Fields, ClaimTypes } from 'poet-js'

import { InsightClient } from '../../../insight'
import { BlockchainService } from "../../domainService"
import {BlockMetadata} from "../../../events"
import { EventType } from '../../orm/events/events'
import Work from '../../orm/domain/work'
import Offering from '../../orm/domain/offering'

const BitcoinPayment = 'Bitcoin Transaction'
const LicenseOwner = 'License Owner'

function resolveNormalizedId(service: BlockchainService, ntxid: string): Promise<string> {
  return service.getTxId(ntxid)
}

interface Validation {
  ownerOnRecord: string
  referenceOffering: Offering
  proofType: string
  proofValue: {
    txId: string
    outputNumber: string
  }
}

export async function validateBitcoinPayment(service: BlockchainService, claim: Claim, txInfo: BlockMetadata, work: Work): Promise<false | Validation> {
  const workId = claim.attributes[Fields.REFERENCE]
  const referenceOfferingId = claim.attributes[Fields.REFERENCE_OFFERING]
  const referenceOffering = referenceOfferingId
    && await service.getOffering(referenceOfferingId)
  if (!referenceOffering) {
    console.log('Could not find referred offering')
    return false
  }

  const ownerStated = claim.attributes[Fields.REFERENCE_OWNER]
  const ownerOnRecord = await service.getOwnerPublicKey(workId)

  if (!ownerOnRecord) {
    console.log('No owner on record')
    return false
  }
  if (!ownerStated) {
    console.log('No owner on claim')
    return false
  }

  if (ownerOnRecord && ownerStated && ownerOnRecord !== ownerStated) {
    console.log('Different owner on record')
    return false
  }

  const proofType = claim.attributes[Fields.PROOF_TYPE]
  let proofValue
  try {
    proofValue = JSON.parse(claim.attributes[Fields.PROOF_VALUE])
  } catch(err) {
    console.log('invalid json for proof value', claim)
    return false
  }
  if (!proofType || !proofValue) {
    console.log('Missing proof information', claim)
    return false
  }
  if (proofType === 'Bitcoin Transaction') {

    try {
      let txId = await resolveNormalizedId(service, proofValue.ntxId)
      if (!txId) {
        console.log('Txid resolution failed', proofValue.ntxId, proofValue.txId)
        txId = proofValue.txId
      }
      const tx = await InsightClient.Transactions.byId.get(txId)
      if (!tx) {
        console.log('no tx found')
        return false
      }
      const output = tx.vout[proofValue.outputIndex]
      if (!output) {
        console.log('no output found')
        return false
      }
      const hasPaymentAddress = (address: string) => address === referenceOffering.attributes[Fields.PAYMENT_ADDRESS]
      const outputsMatching = output.scriptPubKey.addresses.filter(hasPaymentAddress)
      if (!outputsMatching.length) {
        console.log('no output with matching address found')
        return false
      }
      const value = outputsMatching.reduce((prev: number, next: {value: number}) => prev - (-next.value), 0)
      if (Math.abs(value - parseFloat(referenceOffering.attributes[Fields.PAYMENT_AMOUNT])) < 1e-8) {
        console.log('mismatching amount')
        return false
      }
    } catch (error) {
      console.log('unexpected error', error, error.stack)
      return false
    }
  } else {
    console.log("Unknown proof type", proofType)
    return false
  }
  return { ownerOnRecord, referenceOffering, proofType, proofValue }
}

export async function validateBitcoinPaymentForLicense(service: BlockchainService, claim: Claim, txInfo: BlockMetadata, work: Work) {
  const validation = await validateBitcoinPayment(service, claim, txInfo, work)
  if (validation === false) {
    return
  }
  const { ownerOnRecord, referenceOffering, proofType, proofValue } = validation

  const holderId = claim.attributes[Fields.LICENSE_HOLDER]
  const holder = holderId
    && await service.getOrCreateProfile(holderId)

  const owner = await service.getOrCreateProfile(ownerOnRecord)
  await service.saveEvent(claim.id, EventType.LICENSE_BOUGHT, work, holder, undefined, owner)
  await service.saveEvent(claim.id, EventType.LICENSE_SOLD, work, owner)

  const license = await service.licenseRepository.persist(service.licenseRepository.create({
    id: claim.id,
    reference: work,
    licenseHolder: holder,
    referenceOffering: referenceOffering,
    proofType: proofType,
    proofValue: proofValue,
    bitcoinTx: proofValue.txId,
    licenseEmitter: ownerOnRecord
  }))
  work.publishers = work.publishers || []
  work.publishers.push(holder)
  await service.workRepository.persist(work)
  return license
}

export async function validateSelfOwnedLicense(service: BlockchainService, claim: Claim, txInfo: BlockMetadata, work: Work) {
  const workId = claim.attributes[Fields.REFERENCE]

  const ownerStated = claim.attributes[Fields.REFERENCE_OWNER]
  const ownerOnRecord = await service.getOwnerPublicKey(workId)

  if (ownerOnRecord && ownerStated && ownerOnRecord !== ownerStated) {
    console.log('Different owner on record')
    return
  }

  const holderId = claim.attributes[Fields.LICENSE_HOLDER]
  if (holderId !== ownerStated) {
    return
  }

  const owner = await service.getOrCreateProfile(ownerOnRecord)
  await service.saveEvent(claim.id, EventType.SELF_LICENSE, work, owner)

  try {
    const license = await service.licenseRepository.persist(service.licenseRepository.create({
      id: claim.id,
      reference: work,
      licenseHolder: owner,
      proofType: LicenseOwner,
      licenseEmitter: owner
    }))
    work.publishers = work.publishers || []
    work.publishers.push(owner)
    await service.workRepository.persist(work)
    return license
  } catch (e) {
    console.log('could not save', {
      id: claim.id,
      reference: work,
      licenseHolder: owner,
      proofType: LicenseOwner,
      licenseEmitter: owner
    })
  }

}

export default {
  type: ClaimTypes.LICENSE,
  hook: async (service: BlockchainService, claim: Claim, txInfo: BlockMetadata) => {
    const workId = claim.attributes[Fields.REFERENCE]
    if (!workId) {
      console.log('Received weird license with no "reference" field', claim)
      return
    }
    const work = await service.workRepository.findOne({ id: workId })
    if (!work) {
      console.log('Could not find referred work', claim)
      return
    }
    if (claim.attributes[Fields.PROOF_TYPE] === BitcoinPayment) {
      return validateBitcoinPaymentForLicense(service, claim, txInfo, work)
    }
    if (claim.attributes[Fields.PROOF_TYPE] === LicenseOwner) {
      return validateSelfOwnedLicense(service, claim, txInfo, work)
    }
  }
}
