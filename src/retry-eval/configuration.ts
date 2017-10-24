import * as fs from 'fs'

import { ConnectionConfiguration } from '../blockchain/connection'

export interface RetryEvalConfiguration {
  readonly db: ConnectionConfiguration
}

const defaultOptions: Partial<RetryEvalConfiguration> = {
}

export function loadRetryEvalConfiguration(configurationFilePath: string): RetryEvalConfiguration {
  if (!fs.existsSync(configurationFilePath)) {
    console.error(`File "${configurationFilePath}" not found.`)
    process.exit()
  }

  return {
    ...defaultOptions,
    ...JSON.parse(fs.readFileSync(configurationFilePath, 'utf8'))
  }
}