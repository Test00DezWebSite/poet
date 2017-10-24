import { BitcoinScannerConfiguration } from './configuration'
import { Queue } from '../queue'
import { PoetInsightListener } from '../insight'

export class BitcoinScanner {
  private readonly configuration: BitcoinScannerConfiguration
  private readonly insight: PoetInsightListener
  private readonly queue = new Queue()

  constructor(configuration: BitcoinScannerConfiguration) {
    this.configuration = configuration

    this.insight = new PoetInsightListener(this.configuration.insightUrl,
      this.configuration.poetNetwork,
      this.configuration.poetVersion)
  }

  public async start() {
    console.log('Requesting BlockChain info from Insight...')

    this.insight.subscribeBitcoinBlock(async (block) => {
      // Store ntxid => txid info
      for (let tx of block.transactions) {
        await this.queue.announceNormalizedTransaction({
          ntxId: tx.nid,
          txId: tx.id
        })
      }
    })

    this.queue.bitcoinBlockProcessed().subscribeOnNext(async (latest: number) => {
      const height = parseInt('' + latest, 10) + 1
      console.log('Scanning block', height)
      try {
        const block = await this.insight.fetchBitcoreBlockByHeight(height)
        this.insight.scanBitcoreBlock(block, height)
      } catch (e) {
        console.log(`Scanning block ${height} failed. Error was:`, e)
        const latestHeight = await this.insight.getCurrentHeight()
        if (latestHeight === height - 1) {
          return
        }
        this.queue.dispatchWork('tryScan', height - 1)
      }
    })

    process.nextTick(() => {
      this.queue.workThread('tryScan', (data: string) => {
        const height = JSON.parse(data)
        this.queue.announceBitcoinBlockProcessed(height)
      })
    })

    this.insight.subscribeBlock(async (block) => {
      console.log('found block info', block)
      try {
        await this.queue.announceBitcoinBlock(block)
      } catch (error) {
        console.log('Could not publish block', error, error.stack)
      }
    })

    this.insight.subscribeTx(async (tx) => {
      console.log('found tx', tx)
      try {
        await this.queue.announceBitcoinTransaction(tx)
      } catch (error) {
        console.log('Could not publish tx', error, error.stack)
      }
    })
  }
}