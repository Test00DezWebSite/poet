import { createServer, MockSignerServerOptions } from '../authentication/signer'

export async function start(options?: MockSignerServerOptions) {
  options = Object.assign({}, {
    port: 7000
  }, options || {})
  const server = await createServer(options)
  await server.listen(options.port, '0.0.0.0')

  console.log('Server started successfully.')
}

if (!module.parent) {
  start().catch(error => console.log(error))
}
