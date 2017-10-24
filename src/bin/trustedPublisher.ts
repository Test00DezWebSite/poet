import { getConfigurationPath } from '../helpers/CommandLineArgumentsHelper'
import { loadTrustedPublisherConfiguration } from '../trusted-publisher/configuration'
import { TrustedPublisher } from '../trusted-publisher/TrustedPublisher'

const configurationPath = getConfigurationPath()
const configuration = loadTrustedPublisherConfiguration(configurationPath)

console.log('Trusted Publisher Configuration: ', JSON.stringify(configuration, null, 2))

async function start() {
  try {
    const trustedPublisher = new TrustedPublisher(configuration)
    await trustedPublisher.start()
    console.log('Trusted Publisher started successfully.')
  } catch (error) {
    console.log('Trusted Publisher failed to start. Error was: ', error)
  }
}

start()