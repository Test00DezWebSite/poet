import { Queue } from '../queue'
import { PoetInsightListener as Insight } from '../insight'

export async function publish(id: string) {
  const queue = new Queue()

  const insight = new Insight('https://test-insight.bitpay.com', '', [0] )
  const bitcoinBlock = await insight.manageNewBlock(id)
  //TODO need fix
  //await queue.announceBitcoinBlock(bitcoinBlock)

}

export default async function create() {
  return await publish(process.argv[2])
}

if (!module.parent) {
  create().catch(error => {
    console.log(error, error.stack)
  })
}
