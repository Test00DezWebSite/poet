import "reflect-metadata"
import * as path from 'path'
import { createConnection, Connection } from 'typeorm'
import { doubleSha, verifies } from 'poet-js'

const express = require('express')
const bodyParser = require('body-parser')
const logger = require('morgan')
const fcm = require('fcm-node')

import Device from './device'
import { Queue, Notification } from './queue'

export function createServer (serverKey: string, port: number) {
  const fcmCli = new fcm(serverKey)

  const app = express()

  app.use(express.static(__dirname + '/public'))
  app.use(bodyParser.json())
  app.use(logger('dev'))

  app.listen(port)
  console.log('The App runs on port ', port)

  app.get('/health', async function(req: any, res: any) {
    res.status(200)
    res.end()
  })

  app.post('/register', async function(req: any, res: any) {

    const deviceName        = req.body.deviceName
    const deviceId          = req.body.deviceId
    const registrationId    = req.body.registrationId
    const platform          = req.body.platform
    const pubKey            = req.body.pubKey
    const signature         = req.body.signature
    const timestamp         = req.body.timestamp

    try {
        if (typeof pubKey  == 'undefined' || typeof deviceId == 'undefined' || typeof registrationId  == 'undefined') {
            //TODO error handling
            // console.log(constants.error.msg_invalid_param.message)
            // res.json(constants.error.msg_invalid_param)
            res.status(400)
            res.end()
        } else if (!pubKey.trim() || !deviceId.trim() || !registrationId.trim()) {
            //TODO error handling
            // console.log(constants.error.msg_empty_param.message)
            // res.json(constants.error.msg_empty_param)
            res.status(400)
            res.end()
        } else if (!verifies(doubleSha, new Buffer(deviceId + timestamp, 'utf8'), signature, pubKey)) {
            console.log("Invalid signature")
            res.json({ success: false , error : "Invalid signature"})
            res.status(400)
            res.end()
        } else {

            if (connection == undefined) {
                connection = await getConnection()
            }

            let device = new Device()
            device.deviceId = deviceId
            device.deviceName = deviceName
            device.platform = platform
            device.publicKey = pubKey
            device.registrationId = registrationId

            let deviceRepository = connection.getRepository(Device)
            await deviceRepository.persist(device)

            res.json({ success: true })
            res.status(200)
            res.end()
            console.log("Device has been saved")
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false , error : error.toString() })
        res.status(400)
        res.end()
    }
  })

  function buildNotification(device: Device, requestId: string,
                             title: string = "Signature Request", body: string = "Open authenticator for more details") {
    return {
      to: device.registrationId,
      data: {
          request_id: requestId,
          notification: {
              title: title, body: 'Do you want yo authorize it?'
          }
      },
      priority: 'high',
      content_available: true,
      notification: title && body && { //notification object
        title: title, body: body, sound : "default", badge: "1", click_action: "sign_request_notification"
      }
    }
  }

  // TODO better error handling and retries
  let connection: Connection
  async function getConnection(): Promise<Connection> {
    return createConnection({
      driver: {
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'poet',
        password: 'poet',
        database: 'poet'
      },
      entities: [
        path.join(__dirname, 'device.ts')
      ],
      autoSchemaSync: true
    })
  }

  async function getDevice(pubKey: string, connection?: Connection): Promise<Device> {
    if (connection == undefined) {
      connection = await getConnection()
    }
    const deviceRepository = connection.getRepository(Device)
    return (await deviceRepository.findOne({publicKey : pubKey}))
  }

  async function startListening() {
    const queue = new Queue()
    connection = await getConnection()

    queue.pollNotifications().subscribeOnNext(async (notification: Notification) => {
      console.log('consuming msg', notification)

      const device = await getDevice(notification.pubKey, connection)

      console.log('found registered device: ', device)

      fcmCli.send(buildNotification(
        device,
        notification.requestId),
        function(err: any) {
            console.log("----------------------------------")
            console.log("err=" + err)
            console.log("----------------------------------")
      })
    })
  }

  startListening().catch(error => {
    console.log(error, error.stack)
  })
}