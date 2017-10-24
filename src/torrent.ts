import * as fs from 'fs'
const { promisify } = require('util') // TODO: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/16860
import * as path from 'path'
const WebTorrent = require('webtorrent')
import { ClaimBuilder, Block, noop, assert } from 'poet-js'

import { Queue } from './queue'
import { getCreateOpts, getHash, createObservableDownload } from './helpers/torrentHash'
import { BlockMetadata, BitcoinBlockMetadata } from './events'

const readdir = promisify(fs.readdir)
const readFile = promisify(fs.readFile)

async function readBlock(blockFile: string) {
  const buffer = await readFile(blockFile)
  return ClaimBuilder.serializedToBlock(buffer)
}

export class TorrentSystem {

  private readonly client: any // TODO: upstream webtorrent needs a better definition file
  private readonly path: string
  private readonly queue: Queue

  private static BITS_PER_HEX_BYTE = 4
  private static SHA256_LENGTH_IN_BITS = 256
  private static SHA1_LENGTH_IN_BITS = 160

  constructor(torrentPath: string) {
    this.queue = new Queue()
    this.path = torrentPath
    this.client = new WebTorrent({ torrentPort: 7800, dhtPort: 7801 })
    this.client.on('error', (error: Error) => {
      if (error.message.startsWith('Cannot add duplicate')) {
        return
      }
      this.handleError('Generic WebTorrentError', error)
    })
  }

  async start() {
    await this.listenToQueue()
    await this.seedLocalFiles()
  }

  async listenToQueue() {
    await this.listenToHashesToDownload()
    await this.listenToNewBlocksToSeed()
  }

  downloadTorrent(hash: string) {
    const download = createObservableDownload(
      this.client,
      hash => this.getPathInStorageFolder(hash),
      hash
    )

    console.log('Downloading', hash)
    download.subscribeOnCompleted(async () => {
      console.log('Downladed', hash)
      try {
        const block = await this.getBlockFromFilesystem(hash)
        await this.queue.announceBlockReady(block)
      } catch(error) {
        this.handleError('Could not notify of block ready', error)
      }
    })
  }

  async listenToHashesToDownload() {
    this.queue.transactionHeard().subscribeOnNext((tx: BlockMetadata) => {
      this.downloadTorrent(tx.torrentHash)
    })

    this.queue.bitcoinBlock().subscribeOnNext((block: BitcoinBlockMetadata) => {
      block.poet.map(txInfo => this.downloadTorrent(txInfo.torrentHash))
    })
  }

  async listenToNewBlocksToSeed() {
    this.queue.blocksToSend().subscribeOnNext(this.seedBlock.bind(this))
  }

  async seedBlock(block: Block) {
    try {
      const buffer = ClaimBuilder.serializeBlockForSave(block)
      const torrentId = await getHash(buffer, block.id)

      // Copy the buffer to seed and set a custom "name" field needed by WebTorrent
      let seedBuffer = new Buffer(buffer) as any
      seedBuffer.name = torrentId

      console.log('Seeding torrent with hash', torrentId)

      return new Promise((resolve, reject) => {
        this.client.seed(
          seedBuffer,
          {
            path: this.getPathInStorageFolder(torrentId),
            ...getCreateOpts(block.id),
          },
          (torrent: any) => {
            torrent.on('error', reject)
            torrent.on('ready', resolve)
          }
        )
      })
    } catch (error) {
      this.handleError('Could not seed file', error)
    }
  }

  async seedLocalFiles() {
    try {
      const folders = await readdir(this.path)
      for (let folder of folders) {
        const files = await readdir(this.getPathInStorageFolder(folder))
        if (!TorrentSystem.validDirectoryContents(files)) {
          return
        }
        // The torrent is stored under a folder named with the infoHash of it
        const torrentId = folder
        // And it has only one file, named with the sha256 hash of the block
        const blockHash = files[0]

        this.seedBlockFromFile(
          this.getFileForSeeding(torrentId, blockHash), torrentId, blockHash
        )

        await this.queue.announceBlockReady(
          await readBlock(this.getFilePathInStorage(torrentId, blockHash))
        )
      }
    } catch (error) {
      this.handleError('Could not read stored files', error)
    }
  }

  private seedBlockFromFile(file: fs.ReadStream, torrentId: string, blockHash: string) {
    this.client.seed(file, this.makeSeedOptions(torrentId, blockHash), noop)
  }

  private getFileForSeeding(torrentId: string, blockHash: string) {
    assert(TorrentSystem.isValidInfoHash(torrentId), 'invalid length for torrent id')
    assert(TorrentSystem.isValidSHA256(blockHash), 'invalid sha256 value')
    return fs.createReadStream(this.getFilePathInStorage(torrentId, blockHash))
  }

  private getPathInStorageFolder(file: string) {
    return path.join(this.path, file)
  }

  private getFilePathInStorage(file: string, file2: string) {
    return path.join(this.path, file, file2)
  }

  private async getBlockFromFilesystem(hash: string): Promise<Block> {
    const files = await readdir(this.getPathInStorageFolder(hash))
    if (!TorrentSystem.validDirectoryContents(files)) {
      throw new Error('Could not read file')
    }
    const content = files[0]
    const file = this.getFilePathInStorage(hash, content)
    const data = await new Promise<Buffer>((resolve, reject) => {
      fs.readFile(file, (err, buf) => {
        if (err) {
          return reject(err)
        }
        return resolve(buf)
      })
    })

    return ClaimBuilder.serializedToBlock(data)
  }

  /**
   * WebTorrent asks for a path where to download the file, and also options to
   * pass on for the 'create-torrent' library
   */
  private makeSeedOptions(torrentId: string, blockHash: string) {
    return {
      // Path to store the file
      path: this.getPathInStorageFolder(torrentId),
      // create-torrent options
      ...getCreateOpts(blockHash)
    }
  }

  private handleError(message: string, error: any) {
    console.log(message, error, error.stack)
  }

  /**
   * The current version of our torrent files has only one file per torrent.
   * This method is used to validate that constraint.
   */
  private static validDirectoryContents(contentFiles: string[]) {
    return contentFiles.length === 1
  }

  private static isValidSHA256(hash: string) {
    return hash.length === TorrentSystem.SHA256_LENGTH_IN_BITS / TorrentSystem.BITS_PER_HEX_BYTE
  }

  private static isValidInfoHash(hash: string) {
    return hash.length === TorrentSystem.SHA1_LENGTH_IN_BITS / TorrentSystem.BITS_PER_HEX_BYTE
  }
}
