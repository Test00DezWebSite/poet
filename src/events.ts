export interface BlockMetadata {
  torrentHash: string

  transactionHash?: string
  outputIndex?: number

  // Only available if confirmed
  bitcoinHash?: string
  bitcoinHeight?: number
  transactionOrder?: number
  timestamp?: number

  // Only available if downloaded
  hash?: string

  // Only available if indexed
  height?: number
}

export interface BitcoinBlockMetadata {
  blockHeight: number
  blockHash: string
  parentHash: string
  timestamp: number
  poet: BlockMetadata[]
}

