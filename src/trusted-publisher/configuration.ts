import * as fs from 'fs'
import { validatePoetNetwork, validatePoetVersion } from '../helpers/ConfigurationHelper'

export interface TrustedPublisherConfiguration {
  readonly notaryPrivateKey: string
  readonly bitcoinAddressPrivateKey: string
  readonly bitcoinAddress: string
  readonly port: number
  readonly poetNetwork: string
  readonly poetVersion: number[]
  readonly insightApiAddress: string
}

const defaultOptions: Partial<TrustedPublisherConfiguration> = {
  port: 6000,
  poetNetwork: 'BARD',
  poetVersion: [0, 0, 0, 2],
  insightApiAddress: 'https://test-insight.bitpay.com'
}

export function loadTrustedPublisherConfiguration(path: string): TrustedPublisherConfiguration {
  if (!fs.existsSync(path)) {
    console.error(`File "${path}" not found.`)
    process.exit()
  }

  const configuration = JSON.parse(fs.readFileSync(path, 'utf8'))

  if (typeof configuration.poetNetwork == 'string') {
    validatePoetNetwork(configuration.poetNetwork)
  }

  if (typeof configuration.poetVersion == 'object') {
    validatePoetVersion(configuration.poetVersion)
  }

  return {
    ...defaultOptions,
    ...configuration
  }
}