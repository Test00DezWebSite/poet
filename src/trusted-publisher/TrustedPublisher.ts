import { promisify } from 'util'

import * as Koa from 'koa'
import * as KoaBody from 'koa-body'
import * as KoaRoute from 'koa-route'
import * as bitcore from 'bitcore-lib'
import * as explorers from 'bitcore-explorers'
import { Fields, ClaimTypes, Claim, Block, ClaimBuilder, hex } from 'poet-js'

import { getHash } from '../helpers/torrentHash' // TODO: use poet-js
import { Queue } from '../queue'
import { TrustedPublisherConfiguration } from './configuration'

export class TrustedPublisher {
  private readonly configuration: TrustedPublisherConfiguration
  private readonly queue: Queue
  private readonly koa: Koa
  private readonly bitcoinAddressPrivateKey: bitcore.PrivateKey
  private readonly insight: Insight
  private readonly broadcastTx: (tx: any) => Promise<any>
  private readonly getUtxo: (address: any) => Promise<ReadonlyArray<bitcore.UnspentOutput>>

  constructor(configuration: TrustedPublisherConfiguration) {
    this.configuration = configuration
    this.queue = new Queue()
    this.koa = new Koa()
    this.bitcoinAddressPrivateKey = new bitcore.PrivateKey(configuration.bitcoinAddressPrivateKey)
    this.insight = new explorers.Insight(this.configuration.insightApiAddress)
    this.broadcastTx = promisify(this.insight.broadcast.bind(this.insight) as (tx: any, cb: NodeCallback<any>) => void)
    this.getUtxo = promisify(this.insight.getUnspentUtxos.bind(this.insight) as (address: any, cb: NodeCallback<any>) => void)
  }

  public async start() {
    this.koa.use(this.handleErrors)
    this.koa.use(KoaBody({ textLimit: 1000000 }))
    this.koa.use(KoaRoute.post('/titles', this.postTitles))
    this.koa.use(KoaRoute.post('/licenses', this.postLicenses))
    this.koa.use(KoaRoute.post('/claims', this.postClaims))
    this.koa.use(KoaRoute.post('/v2/claims', this.postClaimsV2))
    this.koa.listen(this.configuration.port)
  }

  private async handleErrors(ctx: any, next: Function) {
    try {
      await next()
    } catch (error) {
      console.log(`Error processing ${ctx.method} ${ctx.path}`, error, error.stack)
      ctx.status = 503
      ctx.body = 'An error occurred while processing the transaction, please try again later.'
    }
  }

  private postTitles = async (ctx: any) => {
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
    }, this.configuration.notaryPrivateKey)]

    const blockClaims = await this.createBlock(claims)
    ctx.body = JSON.stringify({
      createdClaims: blockClaims
    })
  }

  private postLicenses = async (ctx: any) => {
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
    }, this.configuration.notaryPrivateKey)]
    const blockClaims = await this.createBlock(claims)
    ctx.body = JSON.stringify({
      createdClaims: blockClaims
    })
  }

  private postClaims = async (ctx: any) => {
    const signs = JSON.parse(ctx.request.body).signatures

    const claims: ReadonlyArray<Claim> = signs.map((sig: any) => {
      const claim = ClaimBuilder.serializedToClaim(
        Buffer.from(Buffer.from(sig.message, 'hex').toString(), 'hex')
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
      }, this.configuration.notaryPrivateKey)
    )

    const editWorkClaims = workClaims.filter(_ => _.attributes.supersedes)

    for (const claim of editWorkClaims) {
      // TODO: ideally, assert that claim.owner === claim.supersedes.owner
      // certification/work.ts has the final say on this
    }

    const blockClaims = await this.createBlock([
      ...claims,
      ...titleClaims
    ])

    ctx.body = JSON.stringify({
      createdClaims: blockClaims
    })
  }

  private postClaimsV2 = async (ctx: any) => {
    const signs = JSON.parse(ctx.request.body).claims

    const claims: ReadonlyArray<Claim> = signs.map((sig: any) => {
      const claim = ClaimBuilder.serializedToClaim(
        Buffer.from(sig.claim, 'hex')
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
      }, this.configuration.notaryPrivateKey)
    )

    const blockClaims = await this.createBlock([
      ...claims,
      ...titleClaims
    ])

    ctx.body = JSON.stringify({
      createdClaims: blockClaims
    })
  }

  private createBlock = async (claims: ReadonlyArray<Claim>) => {
    const certificates: ReadonlyArray<Claim> = claims.map(claim => ClaimBuilder.createSignedClaim({
      type: ClaimTypes.CERTIFICATE,
      attributes: {
        [Fields.REFERENCE]: claim.id,
        [Fields.CERTIFICATION_TIME]: '' + Date.now()
      }
    }, this.configuration.notaryPrivateKey))

    const block: Block = ClaimBuilder.createBlock([...claims, ...certificates])

    const torrentHash = await this.getTorrentHash(block)
    const transactionHash = await this.timestampClaimBlock(torrentHash)

    try {
      await this.queue.announceBlockToSend(block)
      await this.queue.announceBlockTxId({ transactionHash, torrentHash, block })
    } catch (error) {
      console.log('Could not announce Block', error, error.stack)
    }

    return block.claims
  }

  private getTorrentHash = async (block: Block) : Promise<string>  => {
    return await getHash(ClaimBuilder.serializeBlockForSave(block), block.id)
  }

  private timestampClaimBlock = async (torrentHash: string): Promise<string> => {
    // TODO: const rawutxo = await InsightClient.Address.Utxos.get(poetAddress); const utxo = rawutxo.map(bitcore.Transaction.Utxo)
    const rawutxo = await this.getUtxo(this.configuration.bitcoinAddress)

    if (!rawutxo)
      throw new Error('Error retrieving UTXO')

    if (!rawutxo || !rawutxo.length)
      throw new Error(`Wallet seems to be empty. Check funds for ${this.configuration.bitcoinAddress}`)

    // Use only up to 5 unused outputs to avoid large transactions, picking the ones with the most satoshis to ensure enough fee
    const utxo = rawutxo.slice().sort((a, b) => b.satoshis - a.satoshis).slice(0, 5)

    console.log('\n\nutxo', JSON.stringify(utxo, null, 2))

    const data = Buffer.concat([
      Buffer.from(this.configuration.poetNetwork),
      Buffer.from(this.configuration.poetVersion), // TODO: Move this to poet-js
      Buffer.from(torrentHash, 'hex')
    ])
    const tx = new bitcore.Transaction()
      .from(utxo)
      .change(this.configuration.bitcoinAddress)
      .addData(data)
      .sign(this.bitcoinAddressPrivateKey)

    console.log('\nBitcoin transaction hash is', tx.hash)
    console.log('Normalized transaction hash is', tx.nid)
    console.log('Torrent hash is', torrentHash)

    // TODO: const rawtx = tx.serialize(); const txPostResponse = await InsightClient.Transaction.send.post(rawtx)
    const transactionHash = await this.broadcastTx(tx)

    console.log('\nBroadcasted Tx:', transactionHash)

    return transactionHash;
  }
}
