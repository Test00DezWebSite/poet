import { ClaimsToDb } from '../claims-to-db/claimsToDb'
import { loadClaimsToDBConfiguration } from '../claims-to-db/configuration'
import { getConfigurationPath } from '../helpers/CommandLineArgumentsHelper'

const configurationPath = getConfigurationPath()
const configuration = loadClaimsToDBConfiguration(configurationPath)

console.log('Claims To DB Configuration: ', JSON.stringify(configuration, null, 2))

async function start() {
  try {
    const claimsToDb = new ClaimsToDb(configuration)
    await claimsToDb.start()
    console.log('Claims To DB started successfully.')
  } catch (error) {
    console.log('Claims To DB failed to start. Error was:', error)
  }
}

start()
