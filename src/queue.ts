import * as bluebird from 'bluebird'
import * as amqp from 'amqplib/callback_api'
import * as Rx from 'rx'
import { Channel } from "amqplib"
import { Block, delay } from 'poet-js'
import { Messages } from './Messages'

import { BitcoinBlockMetadata, BlockMetadata } from './events'

const BITCOIN_BLOCK = 'bitcoinBlock'
const BITCOIN_BLOCK_PROCESSED = 'bitcoinBlock processed'
const BITCOIN_TRANSACTION = 'bitcoinTransaction'
const BLOCK_READY = 'blockReady'
const SEND_BLOCK = 'sendBlock'
const NORMALIZED_TX = 'normalizedTx'
const BLOCK_TX_ID = 'blockTxId'

export interface NormalizedData {
  txId: string
  ntxId: string
}

const amqpConnect = bluebird.promisify(amqp.connect, amqp) as any

export async function connect() {
  let attempts = 30
  let delayInMillis = 1000
  while (attempts--) {
    try {
      return (await amqpConnect('amqp://rabbit:rabbit@rabbitmq:5672')) as amqp.Connection
    } catch (error) {
      console.log('Reconnecting...')
      delayInMillis *= 1.5
      await delay(delayInMillis)
    }
  }
  console.log('Never connected!!')
  throw new Error('Unable to find rabbit')
}

export class Queue {

  pool: amqp.Connection[]
  used: boolean[]
  total: number
  blocked: number

  constructor() {
    this.pool = []
    this.used = []
    this.blocked = 0
    this.total = 0
  }

  bitcoinBlock(): Rx.Observable<BitcoinBlockMetadata> {
    return this.consume(BITCOIN_BLOCK) as Rx.Observable<BitcoinBlockMetadata>
  }

  bitcoinBlockProcessed(): Rx.Observable<number> {
    return this.consume(BITCOIN_BLOCK_PROCESSED) as Rx.Observable<number>
  }

  transactionHeard(): Rx.Observable<BlockMetadata> {
    return this.consume(BITCOIN_TRANSACTION) as Rx.Observable<BlockMetadata>
  }

  blocksToSend(): Rx.Observable<Block> {
    return this.consume(SEND_BLOCK) as Rx.Observable<Block>
  }

  blockTxId(): Rx.Observable<Messages.ClaimBlockTxId> {
    return this.consume(BLOCK_TX_ID) as Rx.Observable<Messages.ClaimBlockTxId>
  }

  blockDownloaded(): Rx.Observable<Block> {
    return this.consume(BLOCK_READY) as Rx.Observable<Block>
  }

  normalizedTransaction(): Rx.Observable<NormalizedData> {
    return this.consume(NORMALIZED_TX) as Rx.Observable<NormalizedData>
  }

  announceBitcoinBlock(bitcoinBlock: BitcoinBlockMetadata) {
    return this.publish(BITCOIN_BLOCK, bitcoinBlock)
  }

  announceBlockReady(block: Block) {
    return this.publish(BLOCK_READY, block)
  }

  announceBlockToSend(block: Block) {
    return this.publish(SEND_BLOCK, block)
  }

  announceBlockTxId(claimBlockTxId: Messages.ClaimBlockTxId) {
    return this.publish(BLOCK_TX_ID, claimBlockTxId)
  }

  announceBitcoinTransaction(poetTx: BlockMetadata) {
    return this.publish(BITCOIN_TRANSACTION, poetTx)
  }

  announceNormalizedTransaction(normalizedData: NormalizedData) {
    return this.publish(NORMALIZED_TX, normalizedData)
  }

  announceBitcoinBlockProcessed(blockHeight: number) {
    return this.publish(BITCOIN_BLOCK_PROCESSED, blockHeight)
  }

  private consume(target: string) {
    return Rx.Observable.create(async (observer: any) => {
      let connection, channel: Channel

      try {
        connection = await this.getConnection()
        this.lockConnection(connection)
        channel = await bluebird.promisify(connection.createChannel.bind(connection))() as Channel
      } catch (error) {
        observer.onError(error)
        this.unlockConnection(connection)
        return
      }

      try {
        const queue = await channel.assertQueue('', { exclusive: true })
        await channel.assertExchange(target, 'fanout')
        await channel.bindQueue(queue.queue, target, '')
        await channel.consume(queue.queue, (msg) => {
          observer.onNext(JSON.parse(msg.content.toString()))
        }, { noAck: true  })
      } catch (error) {
        observer.onError(error)
        this.unlockConnection(connection)
        return bluebird.reject(error)
      }

      this.unlockConnection(connection)
      return bluebird.resolve()
    }).publish().refCount()
  }

  private async publish(target: string, payload: any) {
    let connection, channel
    try {
      connection = (await this.getConnection())
      this.lockConnection(connection)
      channel = await bluebird.promisify(connection.createChannel.bind(connection))() as Channel
      await channel.assertExchange(target, 'fanout', { durable: true })
      await channel.publish(target, '', new Buffer(JSON.stringify(payload)))
      await channel.close()
    } catch (error) {
      console.log('Error publishing', error, error.stack)
      throw error
    } finally {
      this.unlockConnection(connection)
    }
  }

  async getConnection() {
    if (this.blocked === this.total) {
      const connection = await connect()
      this.pool[this.total] = connection
      this.used[this.total] = false
      this.total++
      return connection
    } else {
      for (let i in this.pool) {
        if (!this.used[i]) {
          return this.pool[i]
        }
      }
    }
  }

  lockConnection(connection: amqp.Connection) {
    const index = this.pool.indexOf(connection)
    if (this.used[index]) {
      throw new Error('Queue is being used')
    }
    this.used[index] = true
    this.blocked++
  }

  unlockConnection(connection: amqp.Connection) {
    const index = this.pool.indexOf(connection)
    if (!this.used[index]) {
      throw new Error('Queue was not being used')
    }
    this.used[index] = false
    this.blocked--
  }

  async dispatchWork(target: string, payload: any) {
    let connection, channel
    try {
      connection = (await this.getConnection()) as amqp.Connection
      this.lockConnection(connection)
      channel = await bluebird.promisify(connection.createChannel.bind(connection))() as Channel

      await channel.assertQueue(target, { durable: true })
      await channel.sendToQueue(target, new Buffer(JSON.stringify(payload)), { persistent: true })
      await channel.close()
    } catch (error) {
      console.log('Error publishing', error, error.stack)
      throw error
    } finally {
      if (connection) {
        this.unlockConnection(connection)
      }
    }
  }

  async workThread(queueName: string, handler: any) {
    let connection, channel: Channel

    try {
      connection = await this.getConnection()
      this.lockConnection(connection)

      channel = await bluebird.promisify(connection.createChannel.bind(connection))() as Channel
      const queue = await channel.assertQueue(queueName, { durable: true })
      channel.prefetch(1)

      await channel.consume(queueName, (msg) => {
        const payload = JSON.parse(msg.content.toString())
        try {
          handler(payload)
          channel.ack(msg)
        } catch (error) {
          channel.nack(msg)
        }
      })
    } catch (error) {
      console.log('Error connecting', error)
    } finally {
      this.unlockConnection(connection)
    }
  }
}
