import { Block } from 'poet-js'

import { BlockchainService } from '../blockchain/domainService'
import { Queue } from '../queue'
import { BlockMetadata } from '../events'
import { getConnection } from '../blockchain/connection'
import { RetryEvalConfiguration } from './configuration'

export class RetryEval {
  private readonly configuration: RetryEvalConfiguration
  private readonly blockchain: BlockchainService
  private readonly queue: Queue

  constructor(configuration: RetryEvalConfiguration) {
    this.configuration = configuration
    this.blockchain = new BlockchainService()
    this.queue = new Queue()
  }

  public async start() {
    await this.blockchain.start(() => getConnection(this.configuration.db))

    this.queue.normalizedTransaction().subscribeOnNext(this.onNormalizedTransaction)

    this.setupWorker('blockRetry', this.onBlockRetry)
    this.setupWorker('confirmRetry', this.onConfirmRetry)
  }

  private onNormalizedTransaction = async (normalizedData: any) => {
    console.log('Processing', normalizedData)
    try {
      const result = await this.blockchain.normalizedRepository.persist(this.blockchain.normalizedRepository.create({
        ...normalizedData,
        confirmed: true
      }))
    } catch (e) {
      console.log('Could not process', normalizedData, e)
    }
  }

  private onBlockRetry = async (block: Block) => {
    return await this.blockchain.blockSeen(block)
  }

  private onConfirmRetry = async (block: BlockMetadata) => {
    return await this.blockchain.blockConfirmed(block)
  }

  private setupWorker = (name: string, action: any) => {
    process.nextTick(() => {
      this.queue.workThread(name, action).catch(error => {
        console.log(error, error.stack)
      })
    })
  }


}
