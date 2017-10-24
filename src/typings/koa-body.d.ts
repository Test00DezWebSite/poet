/**
 * Placeholder typing for KoaBody.
 * See https://www.npmjs.com/package/koa-body
 */

interface KoaBodyType {
  (options?: any): any
}

declare const KoaBody: KoaBodyType

declare module 'koa-body' {
  export = KoaBody
}