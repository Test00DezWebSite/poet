import { createServer } from '../notifications/appserver'
import { getConfiguration } from '../notifications/configuration'

const command = process.argv[2]
const commandArgument = process.argv[3]

if ((command !== '--configuration' && command !== '-c') || !commandArgument) {
  console.error('Usage: [--configuration <path>] [-c <path>]')
  process.exit()
}

const configuration = getConfiguration(commandArgument)

createServer(configuration.serverApiKey, 5500)