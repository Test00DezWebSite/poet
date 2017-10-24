import * as fs from 'fs'
import { ConnectionConfiguration } from '../blockchain/connection'

export interface ExplorerConfiguration {
  readonly db: ConnectionConfiguration
  readonly apiPort: number
}

const defaultConfiguration = {
  apiPort: 4000
}

export function loadExplorerConfiguration(path: string): ExplorerConfiguration {
  if (!fs.existsSync(path)) {
    console.error(`File "${path}" not found.`)
    process.exit()
  }

  return {
    ...defaultConfiguration,
    ...JSON.parse(fs.readFileSync(path, 'utf8'))
  }
}