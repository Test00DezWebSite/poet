import * as bitcore from 'bitcore-lib'
import * as fetch from 'isomorphic-fetch'
import { Claim, ClaimBuilder, Fields } from 'poet-js'

import { publish as confirm } from './fakeBlock'
import { getHash } from '../helpers/torrentHash'

const myPrivateKey = '2461d5dc1bf2c48b73d271375a11f853f92aca53d328f35af5cbaead016ebeb5'
const myPrivateKey2 = '2111d5dc1bf2c48b73d271375a11f853f92aca53d328f35af5cbaead016ebeb5'

const privateKey = new bitcore.PrivateKey(myPrivateKey)
const publicKey = privateKey.publicKey

const privateKey2 = new bitcore.PrivateKey(myPrivateKey2)
const publicKey2 = privateKey2.publicKey


const fakeBlock = async (claim: Claim) => {
  const block = ClaimBuilder.createBlock([claim])
  const buffer = ClaimBuilder.serializeBlockForSave(block)
  const torrentHash = await getHash(buffer, block.id)
  return await confirm(torrentHash)
}

export default async function create() {
  const host = 'localhost'
  const port = 3000

  const create = (data: any) => ClaimBuilder.createSignedClaim(data, myPrivateKey)
  const create2 = (data: any) => ClaimBuilder.createSignedClaim(data, myPrivateKey2)

  const fakeIt = (untilYouMakeIt: Claim) => fakeBlock(untilYouMakeIt)

  const publish = async(claim: Claim) => {
    const response = await fetch(`http://${host}:${port}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(claim)
    })
    console.log('published', await response.text())
  }

  const work = create({
    type: 'Work',
    attributes: {
      name: 'La Gioconda VV',
      createdOn: '2016-11-31 00:00:00.000Z',
    }
  })
  await publish(work)
  await fakeIt(work)

  const title = create({
    type: 'Title',
    attributes: {
      [Fields.REFERENCE]: work.id,
      [Fields.OWNER_KEY]: publicKey.toString()
    }
  })
  await publish(title)

  const profile = create({
    type: 'Profile',
    attributes: {
      'name': 'John Doe'
    }
  })
  await publish(profile)

  const profile2 = create2({
    type: 'Profile',
    attributes: {
      'name': 'Satoshi Nakamoto'
    }
  })
  await publish(profile2)

  const offering = create({
    type: 'Offering',
    attributes: {
      [Fields.REFERENCE]: work.id,
      [Fields.OFFERING_TYPE]: 'Publication',
      [Fields.OFFERING_INFO]: '400 USD'
    }
  })
  const offering2 = create2({
    type: 'Offering',
    attributes: {
      [Fields.REFERENCE]: work.id,
      [Fields.OFFERING_TYPE]: 'Publication',
      [Fields.OFFERING_INFO]: '400 USD'
    }
  })
  await publish(offering)
  await publish(offering2)

  await fakeIt(title)
  await fakeIt(profile)
  await fakeIt(profile2)
  await fakeIt(offering)
  await fakeIt(offering2)

  const license = create({
    type: 'License',
    attributes: {
      [Fields.REFERENCE]: work.id,
      [Fields.LICENSE_HOLDER]: publicKey2.toString(),
      [Fields.PROOF_TYPE]: 'Bitcoin',
      [Fields.PROOF_VALUE]: 'transaction hash',
    }
  })
  publish(license)
  fakeIt(license)
}

if (!module.parent) {
  create().catch(error => {
    console.log(error, error.stack)
  })
}

