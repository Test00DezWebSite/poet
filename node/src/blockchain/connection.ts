import * as path from 'path'
import { ConnectionOptions, createConnection, DriverOptions } from 'typeorm'
import { delay } from 'poet-js'

export interface ConnectionConfiguration {
  readonly maxRetry: number
  readonly retryDelay: number
  readonly autoSchemaSync: boolean
  readonly logQueries: boolean
  readonly driver: DriverOptions
}

const defaultConfiguration: ConnectionConfiguration = {
  maxRetry: 30,
  retryDelay: 3000,
  autoSchemaSync: false,
  logQueries: false,
  driver: {
    type: 'postgres',
    host: 'db',
    port: 5432,
    username: 'poet',
    password: 'poet',
    database: 'poet'
  }
}

const isDevelopment = () => {
  return process.env.NODE_ENV === 'development'
}

const getExtension = () => {
  return isDevelopment() ? 'js' : 'ts'
}

const entities = [
  path.join(__dirname, 'orm', `*.${getExtension()}`),
  path.join(__dirname, 'orm', 'domain', `*.${getExtension()}`),
  path.join(__dirname, 'orm', 'bitcoin', `*.${getExtension()}`),
  path.join(__dirname, 'orm', 'events', `*.${getExtension()}`)
]

export async function getConnection(configuration?: Partial<ConnectionConfiguration>) {
  const configurationWithDefaults = withDefaults(configuration)
  const connectionOptions = getConnectionOptions(configurationWithDefaults)

  console.log('DB Connection Configuration:', JSON.stringify(configurationWithDefaults, null, 2))

  let attempts = configurationWithDefaults.maxRetry

  while (attempts--) {
    console.log(`Connecting to DB. Attempt ${configurationWithDefaults.maxRetry - attempts} of ${configurationWithDefaults.maxRetry}`)
    try {
      const connection = await createConnection(connectionOptions)
      console.log('Successfully connected to DB.')
      return connection
    } catch (error) {
      console.log('Unable to connect to DB. Waiting', configurationWithDefaults.retryDelay, 'ms before trying again. Error was: ', error, '\n')
      await delay(configurationWithDefaults.retryDelay)
    }
  }

  console.log(`Could not connect to DB after ${configurationWithDefaults.maxRetry} attempts. \n`)
  throw new Error('Unable to connect to db')
}

function withDefaults(connectionParameters?: Partial<ConnectionConfiguration>): ConnectionConfiguration {
  return {
    ...defaultConfiguration,
    ...(connectionParameters || {}),
    driver: {
      ...defaultConfiguration.driver,
      ...(connectionParameters && connectionParameters.driver || {})
    }
  }
}

function getConnectionOptions(configuration: ConnectionConfiguration): ConnectionOptions {
  return {
    driver: {
      ...configuration.driver,
    },
    logging: configuration.logQueries && { logQueries: true },
    entities,
    autoSchemaSync: configuration.autoSchemaSync
  }
}