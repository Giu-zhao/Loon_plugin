import {
  BrowseMessage,
  NextMessage,
  PlayerMessage,
  SearchMessage,
  ShortsMessage,
  GuideMessage,
  SettingMessage,
  WatchMessage
} from '../src/response'
import { YouTubeMessage } from '../src/youtube'

const messages = new Map<string, new () => YouTubeMessage>([
  ['browse', BrowseMessage],
  ['next', NextMessage],
  ['player', PlayerMessage],
  ['search', SearchMessage],
  ['reel/reel_watch_sequence', ShortsMessage],
  ['guide', GuideMessage],
  ['account/get_setting', SettingMessage],
  ['get_watch', WatchMessage]
])

export default function createMessage (url: string): YouTubeMessage | null {
  let pathname: string
  try {
    pathname = new URL(url).pathname
  } catch (_) {
    return null
  }
  const prefix = '/youtubei/v1/'
  if (!pathname.startsWith(prefix)) return null
  const endpoint = pathname.slice(prefix.length).replace(/\/+$/, '')
  const MessageClass = messages.get(endpoint)
  return MessageClass ? new MessageClass() : null
}
