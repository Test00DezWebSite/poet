import * as Koa from 'koa'
import { Fields, ClaimTypes, Claim, Block, ClaimBuilder } from 'poet-js'
const { promisify } = require('util')
const bitcore = require('bitcore-lib')
const explorers = require('bitcore-explorers')
const Body = require('koa-body')
const Route = require('koa-route')

import { getHash } from '../helpers/torrentHash'
import { Queue } from '../queue'

const privKey = 'cf5bd2d3d179493adfc41da206adb2ffd212ea34870722bc92655f8c8fd2ef33'
const bitcoinPriv = new bitcore.PrivateKey('343689da46542f2af204a3ced0ce942af1c25476932aa3a48af5e683df93126b')
const poetAddress = 'mg6CMr7TkeERALqxwPdqq6ksM2czQzKh5C'

const insightInstance = new explorers.Insight(bitcore.Networks.testnet)
const broadcastTx = promisify(insightInstance.broadcast.bind(insightInstance))
const getUtxo = promisify(insightInstance.getUnspentUtxos.bind(insightInstance))

const queue = new Queue()

export interface TrustedPublisherOptions {
  port: number
}

async function start(options?: TrustedPublisherOptions) {
  const defaultOptions = {
    port: 6000,
    broadcast: true
  }

  const mergedOptions = {
    ...defaultOptions,
    ...(options || {})
  }

  const server = await createServer(mergedOptions)
  await server.listen(mergedOptions.port)

  console.log('Server started successfully.')
}

async function createServer(options?: TrustedPublisherOptions) {
  const koa = new Koa()

  koa.use(Body({ textLimit: 1000000 }))
  koa.use(Route.post('/titles', async (ctx: any) => postTitles(ctx)))
  koa.use(Route.post('/licenses', async (ctx: any) => postLicenses(ctx)))
  koa.use(Route.post('/claims', async (ctx: any) => postClaims(ctx)))
  koa.use(Route.post('/v2/claims', async (ctx: any) => postClaimsV2(ctx)))

  koa.use(handleErrors)

  return koa
}

async function handleErrors(ctx: any, next: Function) {
  try {
    await next()
  } catch (error) {
    console.log(`Error processing ${ctx.method} ${ctx.path}`, error, error.stack)
  }
}

async function postTitles(ctx: any) {
  const body = JSON.parse(ctx.request.body)
  const claims = [ClaimBuilder.createSignedClaim({
    type: ClaimTypes.TITLE,
    attributes: {
      [Fields.REFERENCE]: body.reference,
      [Fields.REFERENCE_OFFERING]: body.referenceOffering,
      [Fields.PROOF_TYPE]: "Bitcoin Transaction",
      [Fields.PROOF_VALUE]: JSON.stringify({
        txId: body.txId,
        ntxId: body.ntxId,
        outputIndex: body.outputIndex
      }),
      [Fields.REFERENCE_OWNER]: body.referenceOwner,
      [Fields.OWNER]: body.owner
    }
  }, privKey)]

  const blockClaims = await createBlock(claims)
  ctx.body = JSON.stringify({
    createdClaims: blockClaims
  })
}

async function postLicenses(ctx: any) {
  const body = JSON.parse(ctx.request.body)
  const claims = [ClaimBuilder.createSignedClaim({
    type: ClaimTypes.LICENSE,
    attributes: {
      [Fields.REFERENCE]: body.reference,
      [Fields.REFERENCE_OFFERING]: body.referenceOffering,
      [Fields.PROOF_TYPE]: "Bitcoin Transaction",
      [Fields.PROOF_VALUE]: JSON.stringify({
        txId: body.txId,
        ntxId: body.ntxId,
        outputIndex: body.outputIndex
      }),
      [Fields.REFERENCE_OWNER]: body.referenceOwner,
      [Fields.LICENSE_HOLDER]: body.owner
    }
  }, privKey)]
  const blockClaims = await createBlock(claims)
  ctx.body = JSON.stringify({
    createdClaims: blockClaims
  })
}

async function postClaims(ctx: any) {
  const signs = JSON.parse(ctx.request.body).signatures

  const claims: ReadonlyArray<Claim> = signs.map((sig: any) => {
    const claim = ClaimBuilder.serializedToClaim(
      new Buffer(new Buffer(sig.message, 'hex').toString(), 'hex')
    )
    claim.signature = sig.signature
    claim.id = new Buffer(ClaimBuilder.getId(claim)).toString('hex')
    return claim
  })

  const workClaims: ReadonlyArray<Claim> = claims.filter(_ => _.type === ClaimTypes.WORK)

  console.log('POST /claims', claims)

  // Hack to use the Work's signature for the Offering
  for (const claim of claims.filter(_ => _.type === ClaimTypes.OFFERING)) {
    const workClaim = workClaims && workClaims.length && workClaims[0]

    if (!workClaim)
      throw new Error(`Unsupported: an OFFERING claim was POSTed without any WORK claim`)

    claim.attributes = {
      ...claim.attributes,
      [Fields.REFERENCE]: workClaim.id
    }
  }

  const titleClaims: ReadonlyArray<Claim> = workClaims.map(claim =>
    ClaimBuilder.createSignedClaim({
      type: ClaimTypes.TITLE,
      attributes: {
        reference: claim.id,
        owner: claim.publicKey,
      }
    }, privKey)
  )

  const editWorkClaims = workClaims.filter(_ => _.attributes.supersedes)

  for (const claim of editWorkClaims) {
    // TODO: ideally, assert that claim.owner === claim.supersedes.owner
    // certification/work.ts has the final say on this
  }

  const blockClaims = await createBlock([
    ...claims,
    ...titleClaims
  ])

  ctx.body = JSON.stringify({
    createdClaims: blockClaims
  })
}

async function postClaimsV2(ctx: any) {
  const signs = JSON.parse(ctx.request.body).claims

  const claims: ReadonlyArray<Claim> = signs.map((sig: any) => {
    const claim = ClaimBuilder.serializedToClaim(
      new Buffer(sig.claim, 'hex')
    )
    claim.signature = sig.signature
    claim.id = new Buffer(ClaimBuilder.getId(claim)).toString('hex')
    return claim
  })

  const workClaims: ReadonlyArray<Claim> = claims.filter(_ => _.type === ClaimTypes.WORK)

  console.log('POST /claims', claims)
  const titleClaims: ReadonlyArray<Claim> = workClaims.map(claim =>
    ClaimBuilder.createSignedClaim({
      type: ClaimTypes.TITLE,
      attributes: {
        reference: claim.id,
        owner: claim.publicKey,
      }
    }, privKey)
  )

  const blockClaims = await createBlock([
    ...claims,
    ...titleClaims
  ])

  ctx.body = JSON.stringify({
    createdClaims: blockClaims
  })
}

async function createBlock(claims: ReadonlyArray<Claim>) {
  const certificates: ReadonlyArray<Claim> = claims.map(claim => ClaimBuilder.createSignedClaim({
    type: ClaimTypes.CERTIFICATE,
    attributes: {
      [Fields.REFERENCE]: claim.id,
      [Fields.CERTIFICATION_TIME]: '' + Date.now()
    }
  }, privKey))

  const block: Block = ClaimBuilder.createBlock([...claims, ...certificates])

  await timestampClaimBlock(block)

  try {
    await queue.announceBlockToSend(block)
  } catch (error) {
    console.log('Could not announce block', error, error.stack)
  }

  return block.claims
}

async function timestampClaimBlock(block: Block): Promise<void> {
  const id = await getHash(ClaimBuilder.serializeBlockForSave(block), block.id)

  // We're retrieving UTXO using bitcore's insight client rather than our own., but both work fine.
  // const utxo = await InsightClient.Address.Utxos.get(poetAddress)
  const utxoBitcore = await getUtxo(poetAddress)
  console.log('\n\nutxoBitcore', JSON.stringify(utxoBitcore, null, 2))

  const tx = await ClaimBuilder.createTransaction(id, utxoBitcore, poetAddress, bitcoinPriv)

  console.log('\nBitcoin transaction hash is', tx.hash)
  console.log('Normalized transaction hash is', tx.nid)
  console.log('Torrent hash is', id)

  console.log('\nBroadcasting Tx...', JSON.stringify(tx, null, 2))

  // We're using bitcore's insight client to broadcast transactions rather than our own, since bitcore handles serialization well
  const txPostResponse = await broadcastTx(tx)

  console.log('\nBroadcasted Tx:', txPostResponse)
}

start().catch(error => {
  console.log('Unable to start Trusted Publisher server:', error, error.stack)
})