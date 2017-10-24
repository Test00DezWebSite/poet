import * as bitcore from 'bitcore-lib'
import * as fetch from 'isomorphic-fetch'
import * as Koa from 'koa'
import * as Body from 'koa-body'
import * as Route from 'koa-route'
import { sha256, signMessage } from 'poet-js'

export interface MockSignerServerOptions {
  readonly port: number
}

const server = 'auth:5000'

export async function createServer(options: MockSignerServerOptions) {

  const koa = new Koa() as any
  koa.use(Body())

  koa.use(Route.post('/:key/:id', async (ctx: any, key: string, id: string) => {

    const privateKey = bitcore.PrivateKey(sha256(process.argv[2] + key).toString('hex'))

    try {
      const request = await fetch(`http://${server}/request/${id}`)
      const body = await request.json() as any
      const signFunc = signMessage.bind(null, body.bitcoin, privateKey)

      const result = body.multiple
        ? body.message.map((message: string) => signFunc(message))
        : signFunc(body.message)
      const endpoint = body.multiple ? 'multiple': 'request'

      await fetch(`http://${server}/${endpoint}/${id}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(result)
      }).then(async(res) => {
        const text = await res.text()
        console.log(text)
        ctx.response.body = text
      })
    } catch (error) {
      console.log(error, error.stack)
    }

  }))

  koa.use(async (ctx: any, next: Function) => {
    try {
      await next()
    } catch (error) {
      console.log(`Error processing ${ctx.method} ${ctx.path}`, error, error.stack)
    }
  })

  return koa
}

