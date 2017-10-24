import * as Router from 'koa-router'
import * as moment from 'moment'
import { get } from 'lodash'
import { QueryOptions } from '../route'
import { BlockchainService } from '../../domainService'
import { WorkRoute } from './work'

interface Badge {
  readonly workId: string, 
  readonly datePublished: string
}

export class BadgeRoute extends WorkRoute {

  constructor(service: BlockchainService) {
    super(service)
  }

  getBadgeHTML(badge: Badge) {
    return `
      <html><head><style> body,html,div { margin: 0; padding: 0 }</style><link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet"></head>
      <body> <div style=" width: 165px; height: 50px; background-color: white; font-family: Roboto; font-size: 12px; border: 1px solid #CDCDCD; border-radius: 4px; box-shadow: 0 2px 0 0 #F0F0F0;">
      <a href="https://alpha.po.et/works/${badge.workId}" target="_blank" style=" color: #35393E; text-decoration: none; display: flex; flex-direction: row;  height: 50px">
      <img src="https://alpha.po.et/images/quill64.png" style=" width: 31px; height: 31px; margin-top: 8px; margin-left: 8px; margin-right: 8px; background-color: #393534; color: #35393E; font-family: Roboto;">
      <div><p style="padding-top: 10px; line-height: 15px; margin: 0; font-size: 10pt; font-weight: bold; text-align: left;">Verified on po.et</p>
      <p style="text-align: left; line-height: 15px; margin: 0; font-size: 10px; padding-top: 1px; font-size: 8px; font-family: Roboto; font-weight: bold; line-height: 13px; color: #707070;">${moment(parseInt(badge.datePublished, 10)).format('MMMM Do YYYY, HH:mm')}</p>
      </div></a></div></body></html>
    `
  }

  getBadgeHTMLEmpty() {
    return `
      <html><head><style> body,html,div { margin: 0; padding: 0 }</style><link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet"></head>
      <body> <div style=" width: 165px; height: 50px; background-color: white; font-family: Roboto; font-size: 12px; border: 1px solid #CDCDCD; border-radius: 4px; box-shadow: 0 2px 0 0 #F0F0F0;">
      <a href="https://alpha.po.et/" target="_blank" style=" color: #35393E; text-decoration: none; display: flex; flex-direction: row;  height: 50px">
      <img src="https://alpha.po.et/images/quill64.png" style=" width: 31px; height: 31px; margin-top: 8px; margin-left: 8px; margin-right: 8px; background-color: #393534; color: #35393E; font-family: Roboto;">
      <div><p style="padding-top: 15px; line-height: 15px; margin: 0; font-size: 10pt; font-weight: bold; text-align: left;">Pending on po.et</p>
      </div></a></div></body></html>
    `
  }

  getParseCtx(ctx: any) {
    const { profileId, workId } = ctx.query

    ctx.request.query.attribute = `id<>${workId}`
    ctx.request.query.owner = profileId
    return ctx
  }

  async getBadge(opts: QueryOptions): Promise<Badge> {
    // TODO we need to remove the dependency 
    // the this.getCollection
    const work = await this.getCollection(opts)
    const sanetizedWork = get(work, '[0]', undefined)

    return sanetizedWork && {
      workId: get(sanetizedWork, 'id', ''),
      datePublished: get(sanetizedWork, 'attributes.datePublished', '')
    }
  }

  async getBadgeRoute(ctx: any): Promise<void> {
    const parseCtx = this.getParseCtx(ctx)
    const opts = this.getParamOpts(parseCtx)
    const badge = await this.getBadge(opts)

    ctx.body = badge ? this.getBadgeHTML(badge) : this.getBadgeHTMLEmpty()
  }

  addRoutes(router: Router): any {
    router.get('/badge', this.getBadgeRoute.bind(this))
  }
}
