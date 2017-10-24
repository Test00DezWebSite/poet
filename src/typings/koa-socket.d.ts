/**
 * Placeholder typing for KoaSocket.
 * See https://www.npmjs.com/package/koa-socket
 */

interface KoaSocketType {
  new (options?: any): any
}

declare const KoaSocket: KoaSocketType

declare module 'koa-socket' {
  export = KoaSocket
}