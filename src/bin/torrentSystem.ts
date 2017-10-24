import { TorrentSystem } from '../torrent'

export default async function startTorrents() {
  return new TorrentSystem('./torrents').start()
}

if (!module.parent) {
  startTorrents().catch(() => null)
}