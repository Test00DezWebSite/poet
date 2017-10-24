/**
 * This file is only used by Bitcoin Scanner and is a mix of business logic and lower level code.
 * As such, it should be refactored: business logic should move to either poet-js or BitcoinScanner.ts
 * and helper functions, interactions with insight, etc, should be moved to poet-js or poet-insight.
 */

import * as socketIO from 'socket.io-client'
import * as fetch from 'isomorphic-fetch'
import { InsightClient as Client, ApiMode } from 'insight-client-js'
import * as bitcore from 'bitcore-lib'

import { BitcoinBlockMetadata, BlockMetadata } from './events'

export const InsightClient = new Client(ApiMode.Test, fetch)

const notNull = (x: any) => !!x
const parseJson = (x: any) => {
  return x.text().then((text: any) => {
    try {
      return JSON.parse(text)
    } catch (e) {
      console.log('Could not parse', text)
      throw e
    }
  })
}
const pluckMember = (name: string) => (obj: any) => obj[name]
const getTransaction = pluckMember('rawtx')
const getBuffer = (data: string) => {
  try {
    return Buffer.from(data, 'hex')
  } catch (e) {
    console.log('Error processing', data)
    throw e
  }
}
export interface TxInfoListener {
  (txInfo: BlockMetadata): any
}

export interface BlockInfoListener {
  (block: BitcoinBlockMetadata): any
}

export interface BitcoinBlockListener {
  (block: bitcore.Block): any
}

export class PoetInsightListener {
  readonly insightUrl: string
  readonly poetNetwork: Buffer
  readonly poetVersion: Buffer
  readonly socket: SocketIOClient.Socket
  readonly txListeners: TxInfoListener[]
  readonly poetBlockListeners: BlockInfoListener[]
  readonly bitcoinBlockListeners: BitcoinBlockListener[]

  constructor(insightUrl: string, poetNetwork: string, poetVersion: number[]) {
    this.insightUrl = insightUrl
    this.poetNetwork = Buffer.from(poetNetwork)
    this.poetVersion = Buffer.from(poetVersion)
    this.txListeners = []
    this.poetBlockListeners = []
    this.bitcoinBlockListeners = []

    this.socket = socketIO(this.insightUrl)

    this.initSocket()
  }

  initSocket() {
    this.socket.on('error', (error: any) => {
      console.log(error)
    })
    this.socket.on('connect', () => {
      this.socket.emit('subscribe', 'inv')
    })
    this.socket.on('block', this.manageNewBlock.bind(this))
    this.socket.on('tx', this.manageNewTx.bind(this))
  }

  private async manageNewTx(tx: any) {
    try {
      const poetData = await this.doesSocketTxContainPoetInfo(tx);
      if (poetData) {
        this.txListeners.forEach(txListener => {
          txListener(poetData)
        })
      }
    } catch (error) {
      console.log('Managing tx failed', error, error.stack)
    }
  }

  async manageNewBlock(blockHash: string) {
    try {
      const height = await this.fetchHeight(blockHash)
      const bitcoreBlock = await this.fetchBitcoreBlock(blockHash)
      this.scanBitcoreBlock(bitcoreBlock, height)
      this.notifyBitcoinBlock(bitcoreBlock)
    } catch (error) {
      console.log('Error handling block', error, error.stack)
    }
  }

  scanBitcoreBlock(block: bitcore.Block, height: number): void {
    const bitcoreTransactionToPoetTransaction = (tx: bitcore.Transaction, index: number): any => { // TODO: BlockMetadata
      const poetData = this.getPoetData(tx)
      return poetData && {
        ...poetData,
        blockHeight: height,
        blockHash: block.hash,
        transactionOrder: index
      }
    }

    const txs = block.transactions
      .map(bitcoreTransactionToPoetTransaction)
      .filter(notNull)

    const blockInfo: BitcoinBlockMetadata = {
      blockHeight: height,
      parentHash: bitcore.util.buffer.reverse(block.header.prevHash).toString('hex'),
      blockHash: block.hash,
      timestamp: block.header.time,
      poet: txs
    }

    this.notifyPoetData(blockInfo)
  }

  private getPoetData = (tx: bitcore.Transaction): BlockMetadata => {
    function isOutputDataOut(output: bitcore.Output) {
      return output.script.classify() === bitcore.Script.types.DATA_OUT
    }

    const isOutputCorrectNetworkAndVersion = (output: bitcore.Output) => {
      const data: Buffer = output.script.getData()
      return data.indexOf(this.poetNetwork) === 0
        && data.indexOf(this.poetVersion) === 4
    }

    const output = tx.outputs
      .filter(isOutputDataOut)
      .find(isOutputCorrectNetworkAndVersion)

    const data: Buffer = output && output.script.getData()

    return data && {
      transactionHash: tx.hash,
      outputIndex: tx.outputs.indexOf(output),
      torrentHash: data.slice(8).toString('hex')
    }
  }

  doesSocketTxContainPoetInfo (tx: any) {
    return this.fetchTxByHash(tx.txid).then(this.getPoetData)
  }

  fetchBitcoreBlockByHeight(height: number): Promise<bitcore.Block> {
    return this.fetchBlockHash(height).then(hash => this.fetchBitcoreBlock(hash))
  }

  fetchBitcoreBlock(hash: string): Promise<bitcore.Block> {
    return fetch(`${this.insightUrl}/api/rawblock/${hash}`)
      .then(parseJson)
      .then(pluckMember('rawblock'))
      .then(getBuffer)
      .then(bitcore.Block)
  }

  fetchBlockHash(height: number): Promise<string> {
    return fetch(`${this.insightUrl}/api/block-index/${height}`)
      .then(parseJson)
      .then(pluckMember('blockHash')) as Promise<string>
  }

  fetchHeight(hash: string): Promise<number> {
    return fetch(`${this.insightUrl}/api/block/${hash}`)
      .then(parseJson)
      .then(pluckMember('height'))
  }

  fetchTxByHash(txHash: string): Promise<bitcore.Transaction> {
    const url = `${this.insightUrl}/api/rawtx/${txHash}`

    return fetch(url)
      .then(parseJson)
      .then(getTransaction)
      .then(bitcore.Transaction)
  }

  getCurrentHeight() {
    const url = `${this.insightUrl}/api/status`

    return fetch(url)
      .then(parseJson)
      .then(pluckMember('info'))
      .then(pluckMember('blocks'))
  }

  notifyBitcoinBlock(newState: bitcore.Block) {
    this.bitcoinBlockListeners.forEach(listener => listener(newState))
  }

  notifyPoetData(newState: BitcoinBlockMetadata) {
    this.poetBlockListeners.forEach(listener => listener(newState))
  }

  subscribeTx(listener: TxInfoListener) {
    this.txListeners.push(listener)
  }

  subscribeBlock(listener: BlockInfoListener) {
    this.poetBlockListeners.push(listener)
  }

  subscribeBitcoinBlock(listener: BitcoinBlockListener) {
    this.bitcoinBlockListeners.push(listener)
  }
}
