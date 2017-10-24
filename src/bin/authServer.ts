import createServer from '../authentication/server'
import { AuthServerOptions } from '../authentication/server'

export async function start(options: AuthServerOptions) {
  options = Object.assign({}, {
    port: 5000
  }, options || {})
  const server = await createServer(options)
  await server.listen(options.port)

  console.log('Server started successfully.')
}

if (!module.parent) {
  start({ port: 5000 }).catch(error => {
    console.log('Unable to start Trusted Publisher server:', error, error.stack)
  })
}
