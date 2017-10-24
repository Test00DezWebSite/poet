import { getConfigurationPath } from '../helpers/CommandLineArgumentsHelper'
import { loadRetryEvalConfiguration } from '../retry-eval/configuration'
import { RetryEval } from '../retry-eval/retryEval'

const configurationPath = getConfigurationPath()
const configuration = loadRetryEvalConfiguration(configurationPath)

console.log('Retry Eval Configuration: ', JSON.stringify(configuration, null, 2))

async function start() {
  try {
    const retryEval = new RetryEval(configuration)
    await retryEval.start()
    console.log('Retry Eval started successfully.')
  } catch (error) {
    console.log('Retry Eval failed to start. Error was:', error)
  }
}

start()
