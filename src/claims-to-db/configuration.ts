import * as fs from 'fs'
import { ConnectionConfiguration } from '../blockchain/connection'

export interface ClaimsToDBConfiguration {
  readonly db: ConnectionConfiguration
  readonly minimumHeight: number
}
const defaultOptions: Partial<ClaimsToDBConfiguration> = {
  minimumHeight: 1118188,
}

export function loadClaimsToDBConfiguration(path: string): ClaimsToDBConfiguration {
  if (!fs.existsSync(path)) {
    console.error(`File "${path}" not found.`)
    process.exit()
  }

  const configuration = JSON.parse(fs.readFileSync(path, 'utf8'))

  return {
    ...defaultOptions,
    ...configuration
  }
}