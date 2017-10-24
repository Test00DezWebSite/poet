import { Queue } from '../queue'
import { BitcoinBlockMetadata } from '../events'

export async function publish(id: string) {
  const queue = new Queue()

  const bitcoinBlock: BitcoinBlockMetadata = {
    blockHeight: 1000,
    blockHash: 'bitcoin block hash',
    timestamp: 3543,
    parentHash: '',
    poet: [{
      torrentHash: id,
      transactionHash: 'transaction hash',
      outputIndex: 0,
      transactionOrder: 2
    }]
  }

  await queue.announceBitcoinBlock(bitcoinBlock)

}

export default async function create() {
  return await publish(process.argv[2])
}

if (!module.parent) {
  create().catch(error => {
    console.log(error, error.stack)
  })
}
