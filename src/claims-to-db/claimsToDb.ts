import { Block } from 'poet-js'

import { BlockchainService } from '../blockchain/domainService'
import { Queue } from '../queue'
import { BitcoinBlockMetadata, BlockMetadata } from '../events'
import { Messages } from '../Messages'
import { getConnection } from '../blockchain/connection'
import { ClaimsToDBConfiguration } from './configuration'

export class ClaimsToDb {
  private readonly configuration: ClaimsToDBConfiguration
  private readonly queue: Queue
  private readonly blockchain: BlockchainService

  constructor(configuration: ClaimsToDBConfiguration) {
    this.configuration = configuration
    this.blockchain = new BlockchainService()
    this.queue = new Queue()
  }

  public async start() {
    await this.blockchain.start(() => getConnection(this.configuration.db))

    console.log('Retrieving last processed block...')
    const latest = await this.getLastProcessedBlock()
    console.log(`Latest processed block was ${latest}.`)

    console.log(`Initializing scan.`)
    this.queue.announceBitcoinBlockProcessed(latest)

    this.queue.blockDownloaded().subscribeOnNext(this.blockDownloaded)
    this.queue.blocksToSend().subscribeOnNext(this.blocksToSend)
    this.queue.bitcoinBlock().subscribeOnNext(this.bitcoinBlock)
    this.queue.blockTxId().subscribeOnNext(this.claimBlockTxId)
  }

  private blockDownloaded = (block: Block) => {
    this.storeBlock(block)
  }

  private blocksToSend = (block: Block) => {
    this.storeBlock(block)
  }

  private claimBlockTxId = (claimBlockTxId: Messages.ClaimBlockTxId) => {
    const { block, torrentHash, transactionHash } = claimBlockTxId
    this.blockchain.updateClaimInfoForBlock({ torrentHash, transactionHash }, block)
  }

  private bitcoinBlock = async (block: BitcoinBlockMetadata) => {
    for (let poetTx of block.poet) {
      try {
        poetTx.bitcoinHash = block.blockHash
        poetTx.bitcoinHeight = block.blockHeight
        poetTx.timestamp = block.timestamp
        const blockInfo = (await this.blockchain.getBlockInfoByTorrentHash(poetTx.torrentHash))
        if (blockInfo && blockInfo.timestamp) {
          continue
        }
        console.log('Confirming block with torrent hash', poetTx.torrentHash)
        await this.blockchain.blockConfirmed(poetTx)
      } catch (error) {
        console.log(error, error.stack)
        this.queue.dispatchWork('confirmRetry', poetTx)
      }
    }

    this.blockchain.storeBlockProcessed(block)
    this.queue.announceBitcoinBlockProcessed(block.blockHeight)
  }

  private storeBlock = async (block: Block) => {
    console.log('Storing block', block.id)
    try {
      await this.blockchain.blockSeen(block)
    } catch (error) {
      console.log(`There was a problem while storing block ${block.id}. Programming a blockRetry. Error was: `, error)
      this.queue.dispatchWork('blockRetry', block)
    }
  }

  /**
   * @returns {Promise<number>} The height of the most recent bitcoin block processed,
   * or configuration.minimumHeight if no block has been processed yet.
   */
  private async getLastProcessedBlock(): Promise<number> {
    const lastProcessedBlock = await this.blockchain.getLastProcessedBlock()
    return lastProcessedBlock || this.configuration.minimumHeight
  }
}