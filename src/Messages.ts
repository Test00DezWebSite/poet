import { Block } from 'poet-js'

export namespace Messages {
  export interface ClaimBlockTxId {
    readonly transactionHash: string
    readonly torrentHash: string
    readonly block: Block
  }
}