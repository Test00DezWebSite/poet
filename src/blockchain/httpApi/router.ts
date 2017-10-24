import * as Router from 'koa-router'

import { BlockchainService } from '../domainService'
import { WorkRoute } from './routes/work'
import { BlockRoute } from './routes/blocks'
import { ProfileRoute } from './routes/profile'
import { ClaimRoute } from "./routes/claim"
import { LicenseRoute } from './routes/license'
import { EventRoute } from './routes/events'
import { NotificationsRoute } from './routes/notifications'
import { BitcoinMalleabilityRoute } from './routes/bitcoin'
import { BadgeRoute } from './routes/badge'

export async function addRoutes(router: Router, service: BlockchainService) {
  // Placeholder for /node endpoint
  router.get('/node', async (ctx) => {
    ctx.body = JSON.stringify({ peers: 4, status: "synced" })
  })

  new WorkRoute(service).addRoutes(router)
  new BlockRoute(service).addRoutes(router)
  new ProfileRoute(service).addRoutes(router)
  new ClaimRoute(service).addRoutes(router)
  new LicenseRoute(service).addRoutes(router)
  new EventRoute(service).addRoutes(router)
  new NotificationsRoute(service).addRoutes(router)
  new BitcoinMalleabilityRoute(service).addRoutes(router)
  new BadgeRoute(service).addRoutes(router)
}
