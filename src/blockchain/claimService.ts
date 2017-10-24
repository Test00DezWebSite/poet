import {Connection, Repository} from "typeorm";
import { ClaimBuilder, Block as PureBlock, Claim as PureClaim } from 'poet-js'
import { omit } from 'lodash';

import {getHash} from "../helpers/torrentHash";
import { BlockMetadata } from "../events";
import Claim from "./orm/claim";
import BlockInfo from "./orm/blockInfo";
import ClaimInfo from "./orm/claimInfo";
import Block from "./orm/block";
import ClaimLink from './orm/claimLink';

export class ClaimService {

  protected db: Connection
  private starting: boolean
  private started: boolean

  constructor() {
    this.starting = false
    this.started = false
  }

  async start(getConnection: () => Promise<Connection>) {
    if (this.starting) {
      return
    }
    this.starting = true
    this.db = await getConnection()
    this.started = true
    return
  }

  async blockSeen(block: PureBlock) {

    const exists = await this.getBlock(block.id)

    if (exists) {
      return
    }

    await this.saveBlock(block)

    const id = await getHash(ClaimBuilder.serializeBlockForSave(block), block.id)

    const preliminaryInfo = {
      hash: block.id,
      torrentHash: id
    }

    const blockInfo = await this.getBlockInfoByTorrentHash(id)

    if (blockInfo) {

      const unknownContents = !blockInfo.hash

      if (unknownContents) {

        await this.updateBlockInfo(blockInfo, preliminaryInfo)

        return await this.updateClaimInfoForBlock(blockInfo, block)

      }

    } else {

      // This will just update the SHA256 hash on the db entry
      const blockData = await this.createOrUpdateBlockInfo(preliminaryInfo)

      // Remember to store info for claims
      await this.updateClaimInfoForBlock(preliminaryInfo, block)

      return blockData

    }
  }

  async blockConfirmed(blockInfo: BlockMetadata) {

    const existent = await this.getBlockInfoByTorrentHash(blockInfo.torrentHash)

    if (existent) {

      if (!existent.bitcoinHeight) {
        await this.updateBlockInfo(existent, blockInfo)
      }

      const block = await this.getBlock(existent.hash)

      if (block) {

        return await this.updateClaimInfoForBlock(blockInfo, block)

      }

    } else {

      return await this.createOrUpdateBlockInfo(blockInfo)

    }
  }

  private async saveBlock(block: PureBlock) {
    const claimSet: Claim[] = []
    for (let claim of block.claims) {
      claimSet.push(await this.storeClaim(claim))
    }

    return await this.blockRepository.persist(this.blockRepository.create({
      id: block.id,
      claims: claimSet
    }))
  }

  async storeClaim(claim: PureClaim) {

    const attributes = Object.keys(claim.attributes).map(key => ({key, value: claim.attributes[key], claim: claim.id}))

    return await this.claimRepository.persist(this.claimRepository.create({
      ...claim,
      attributes
    }))
  }

  async updateClaimInfoForBlock(blockInfo: BlockMetadata, block: PureBlock) {
    const results = []

    for (let i = 0; i < block.claims.length; i++) {
      results.push(await this.createOrUpdateClaimInfo(block.claims[i], blockInfo, i))
    }

    return results
  }

  protected async createOrUpdateClaimInfo(claim: PureClaim, blockMetadata: BlockMetadata, claimOrder?: number): Promise<ClaimInfo> {
    const blockMetadataToClaimInfoLike = (blockMetadata: BlockMetadata) => ({
      ...blockMetadata, // BlockMetadata and ClaimInfo share most properties...
      hash: claim.id, // except 'hash', which is the claim.id in ClaimInfo...
      blockHash: blockMetadata.hash, // but the blockHash in BlockMetadata
      blockHeight: blockMetadata.height,
      claimOrder
    })

    const existent = await this.claimInfoRepository.findOne({ hash: claim.id })
    const newData = blockMetadataToClaimInfoLike(blockMetadata)
    const entity = existent
      ? this.claimInfoRepository.merge(existent, newData)
      : this.claimInfoRepository.create(newData)

    return this.claimInfoRepository.persist(entity)
  }

  async getBlock(id: string) {
    const blockEntry = await this.fetchBlock(id)

    if (!blockEntry || !blockEntry.claims)
      return null

    return {
      id,
      claims: blockEntry.claims.map(ClaimService.transformEntityToPureClaim)
    }
  }

  private async fetchBlock(id: string) {
    const blockEntry = await this.blockRepository.createQueryBuilder('block')
      .where('block.id=:id')
      .leftJoinAndMapMany('block.claims', 'block.claims', 'claim')
      .setParameters({id})
      .getOne()
    if (!blockEntry) {
      return
    }
    blockEntry.claims = await this.claimRepository.createQueryBuilder('claim')
      .leftJoinAndMapMany('claim.attributes', 'claim.attributes', 'attribute')
      .where('claim.id IN (:claims)')
      .setParameters({claims: blockEntry.claims.map(claim => claim.id)})
      .getMany()
    return blockEntry
  }

  public static transformEntityToPureClaim(claim: Claim): PureClaim {
    if (!claim) {
      console.log('Asked to confirm for null entry', claim)
      return
    }
    const attributes: {[key: string]: string} = {}
    for (let attribute of claim.attributes) {
      attributes[attribute.key] = attribute.value
    }
    return {
      id: claim.id,
      publicKey: claim.publicKey,
      signature: claim.signature,
      type: claim.type,
      attributes
    }
  }

  async getBlockInfoByTorrentHash(torrentHash: string) {
    return this.blockInfoRepository.findOne({torrentHash: torrentHash})
  }

  async getHeight(blockMetadata: BlockMetadata) {
    if (!blockMetadata.bitcoinHeight) {
      return undefined
    }
    return await this.blockInfoRepository.createQueryBuilder('blockInfo')
        .where(`(blockInfo.bitcoinHeight < :bitcoinHeight) OR 
        (blockInfo.bitcoinHeight = :bitcoinHeight AND blockInfo.transactionOrder < :transactionOrder) OR 
        (blockInfo.bitcoinHeight = :bitcoinHeight AND blockInfo.transactionOrder = :transactionOrder AND blockInfo.outputIndex < :outputIndex)`)
        .setParameters(blockMetadata)
        .getCount() + 1
  }

  public async createOrUpdateBlockInfo(blockMetadata: BlockMetadata) {

    const existent = await this.getBlockInfoByTorrentHash(blockMetadata.torrentHash)

    if (existent) {

      const result = await this.updateBlockInfo(existent, blockMetadata)
      if (result.hash) {
        const blockData = await this.getBlock(result.hash)
        await this.updateClaimInfoForBlock(blockMetadata, blockData)
      }
      return result

    } else {

      const entity = this.blockInfoRepository.create(blockMetadata)
      return await this.blockInfoRepository.persist(entity)

    }
  }

  public async updateBlockInfo(existent: BlockInfo, blockMetadata: BlockMetadata): Promise<BlockInfo> {

    for (let key of Object.keys(blockMetadata)) {

      const blockKey: keyof BlockMetadata = key as keyof BlockMetadata

      if (blockMetadata[blockKey] !== null && blockMetadata[blockKey] !== undefined) {
        (existent as any)[blockKey] = blockMetadata[blockKey]
      }

    }
    existent.height = await this.getHeight(existent)

    return await this.blockInfoRepository.persist(existent)
  }

  async getClaim(id: string) {
    const claim = await this.claimRepository.createQueryBuilder('claim')
      .leftJoinAndMapMany('claim.attributes', 'claim.attributes', 'attribute')
      .where('claim.id=:id')
      .setParameters({id})
      .getOne()
    if (!claim) {
      return
    }
    return ClaimService.transformEntityToPureClaim(claim)
  }

  async getClaimInfo(id: string) {
    return await this.claimInfoRepository.findOne({hash: id})
  }

  get blockInfoRepository(): Repository<BlockInfo> {
    return this.db.getRepository(BlockInfo)
  }

  get claimRepository(): Repository<Claim> {
    return this.db.getRepository(Claim)
  }

  get linkRepository(): Repository<ClaimLink> {
    return this.db.getRepository(ClaimLink)
  }

  get claimInfoRepository(): Repository<ClaimInfo> {
    return this.db.getRepository(ClaimInfo)
  }

  get blockRepository(): Repository<Block> {
    return this.db.getRepository(Block)
  }

}
