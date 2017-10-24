interface NodeCallback<T> {
  (err: any, result?: T): void;
}

interface Insight {
  new (network: any): Insight
  broadcast: (tx: any, cb: NodeCallback<any>) => void
  getUnspentUtxos: (address: any, cb: NodeCallback<any>) => void
}

interface BitcoreExplorersType {
  Insight: Insight
}

declare const BitcoreExplorers: BitcoreExplorersType

declare module 'bitcore-explorers' {
  export = BitcoreExplorers;
}
