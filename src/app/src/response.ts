import { Browse } from '../lib/protobuf/response/browse_pb'
import { Next } from '../lib/protobuf/response/next_pb'
import { Search } from '../lib/protobuf/response/search_pb'
import { Shorts } from '../lib/protobuf/response/shorts_pb'
import { Guide } from '../lib/protobuf/response/guide_pb'
import { Player, BackgroundPlayer } from '../lib/protobuf/response/player_pb'
import { Setting, SubSetting, SettingItem } from '../lib/protobuf/response/setting_pb'
import { Watch } from '../lib/protobuf/response/watch_pb'
import { YouTubeMessage } from './youtube'

export class BrowseMessage extends YouTubeMessage {
  constructor (msgType: any = Browse, name = 'Browse') {
    super(msgType, name)
  }

  pure (): YouTubeMessage {
    this.iterate(this.message, 'sectionListSupportedRenderers', (obj) => {
      for (let i = obj.sectionListSupportedRenderers.length - 1; i >= 0; i--) {
        this.removeCommonAd(obj.sectionListSupportedRenderers[i])
        this.removeShorts(obj, i)
      }
    })
    return this
  }

  removeCommonAd (content: any): void {
    const richItems = content?.itemSectionRenderer?.richItemContent
    if (!Array.isArray(richItems)) return
    for (let index = richItems.length - 1; index >= 0; index--) {
      if (this.isAdvertise(richItems[index])) {
        richItems.splice(index, 1)
        this.needProcess = true
      }
    }
  }

  removeShorts (container: any, index: number): void {
    if (!this.argument.blockShorts) return
    const shelf = container.sectionListSupportedRenderers[index]?.shelfRenderer
    if (this.isShorts(shelf)) {
      container.sectionListSupportedRenderers.splice(index, 1)
      this.needProcess = true
    }
  }

}

export class NextMessage extends BrowseMessage {
  constructor (msgType: any = Next, name = 'Next') {
    super(msgType, name)
  }
}

export class SearchMessage extends BrowseMessage {
  constructor (msgType: any = Search, name = 'Search') {
    super(msgType, name)
  }
}

export class PlayerMessage extends YouTubeMessage {
  constructor (msgType: any = Player, name = 'Player') {
    super(msgType, name)
  }

  pure (): YouTubeMessage {
    if (this.message.adPlacements?.length) {
      this.message.adPlacements.length = 0
      this.needProcess = true
    }
    if (this.message.adSlots?.length) {
      this.message.adSlots.length = 0
      this.needProcess = true
    }
    if (this.message.playbackTracking?.pageadViewthroughconversion) {
      delete this.message.playbackTracking.pageadViewthroughconversion
      this.needProcess = true
    }
    this.enableMiniPlayer()
    this.enableBackgroundPlayer()
    return this
  }

  enableMiniPlayer (): void {
    const renderer = this.message?.playabilityStatus?.miniPlayer?.miniPlayerRender
    if (renderer && renderer.active !== true) {
      renderer.active = true
      this.needProcess = true
    }
  }

  enableBackgroundPlayer (): void {
    if (!this.message?.playabilityStatus) return
    const renderer = this.message.playabilityStatus.backgroundPlayer?.backgroundPlayerRender
    if (renderer) {
      if (renderer.active !== true) {
        renderer.active = true
        this.needProcess = true
      }
    } else {
      this.message.playabilityStatus.backgroundPlayer = new BackgroundPlayer({
        backgroundPlayerRender: { active: true }
      })
      this.needProcess = true
    }
  }

}

export class ShortsMessage extends YouTubeMessage {
  constructor (msgType: any = Shorts, name = 'Shorts') {
    super(msgType, name)
  }

  pure (): YouTubeMessage {
    const entries = this.message.entries
    if (!Array.isArray(entries)) return this
    for (let index = entries.length - 1; index >= 0; index--) {
      if (!entries[index]?.command?.reelWatchEndpoint?.overlay) {
        entries.splice(index, 1)
        this.needProcess = true
      }
    }
    return this
  }
}

export class GuideMessage extends YouTubeMessage {
  constructor (msgType: any = Guide, name = 'Guide') {
    super(msgType, name)
  }

  pure (): YouTubeMessage {
    const blocked = new Set(['SPunlimited'])
    if (this.argument.blockUpload) blocked.add('FEuploads')
    if (this.argument.blockShorts) blocked.add('FEshorts')
    if (this.argument.blockImmersive) blocked.add('FEmusic_immersive')
    this.iterate(this.message, 'rendererItems', (obj) => {
      for (let index = obj.rendererItems.length - 1; index >= 0; index--) {
        const browseId = obj.rendererItems[index]?.iconRender?.browseId ?? obj.rendererItems[index]?.labelRender?.browseId
        if (blocked.has(browseId)) {
          obj.rendererItems.splice(index, 1)
          this.needProcess = true
        }
      }
    })
    return this
  }
}

export class SettingMessage extends YouTubeMessage {
  constructor (msgType: any = Setting, name = 'Setting') {
    super(msgType, name)
  }

  pure (): YouTubeMessage {
    this.iterate(this.message.settingItems, 'categoryId', (obj) => {
      if (obj.categoryId !== 10135) return
      const exists = obj.subSettings?.some((setting) =>
        setting.settingBooleanRenderer?.enableServiceEndpoint?.setClientSettingEndpoint?.settingData?.clientSettingEnum?.item === 151)
      if (!exists) {
        obj.subSettings.push(new SubSetting({
          settingBooleanRenderer: {
            itemId: 0,
            enableServiceEndpoint: { setClientSettingEndpoint: { settingData: { clientSettingEnum: { item: 151 }, boolValue: true } } },
            disableServiceEndpoint: { setClientSettingEndpoint: { settingData: { clientSettingEnum: { item: 151 }, boolValue: false } } }
          }
        }))
        this.needProcess = true
      }
    })
    const hasBackground = this.message.settingItems.some((item) => item.backgroundPlayBackSettingRenderer)
    if (!hasBackground) {
      this.message.settingItems.push(new SettingItem({
        backgroundPlayBackSettingRenderer: { backgroundPlayback: true, icon: { iconType: 1093 } }
      }))
      this.needProcess = true
    }
    return this
  }
}

export class WatchMessage extends YouTubeMessage {
  constructor (msgType: any = Watch, name = 'Watch') {
    super(msgType, name)
  }

  async pure (): Promise<YouTubeMessage> {
    for (const content of this.message.contents ?? []) {
      if (content.player) {
        const player = new PlayerMessage()
        player.message = content.player
        await player.pure()
        this.needProcess ||= player.needProcess
      }
      if (content.next) {
        const next = new NextMessage()
        next.message = content.next
        await next.pure()
        this.needProcess ||= next.needProcess
      }
    }
    return this
  }
}
