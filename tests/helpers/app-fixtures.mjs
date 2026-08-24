import { BinaryWriter, WireType } from '@bufbuild/protobuf';
import {
  AdPlacement,
  AdPlacementRenderer,
  AdSlot,
  AudioTrack,
  CaptionTrack,
  Captions,
  MiniPlayer,
  MiniPlayerRender,
  PlaybackTracking,
  PlayabilityStatus,
  Player,
  PlayerCaptionsTrackListRenderer,
  Tracking,
} from '../../src/app/lib/protobuf/response/player_pb.js';
import {
  Browse,
  Content as BrowseContent,
  ItemSectionRenderer,
  LayoutRender,
  MusicDescriptionShelfRenderer,
  ReelShelfRenderer,
  RenderInfo,
  RichItemContent,
  RichSectionContent,
  SectionListRenderer,
  SectionListSupportedRenderer,
  ShelfRenderer,
  TimedLyricsContent,
  TimedLyricsRender,
  VideoContent,
  VideoContext,
  VideoInfo,
  VideoRendererContent,
  ElementRenderer,
} from '../../src/app/lib/protobuf/response/browse_pb.js';
import { ResponseContext, ServiceTrackingParam, Param } from '../../src/app/lib/protobuf/component/context_pb.js';
import { Label, Run } from '../../src/app/lib/protobuf/component/label_pb.js';
import { Guide, GuideSectionRenderer, Item, RendererItem, guideEntryRenderer } from '../../src/app/lib/protobuf/response/guide_pb.js';
import {
  BackgroundPlayBackSettingRenderer,
  Setting,
  SettingCategoryCollectionRenderer,
  SettingItem,
} from '../../src/app/lib/protobuf/response/setting_pb.js';
import { Entry, Command, Overlay, ReelPlayerOverlayRenderer, ReelWatchEndpoint, Shorts } from '../../src/app/lib/protobuf/response/shorts_pb.js';
import { Next, Content as NextContent, NextResult } from '../../src/app/lib/protobuf/response/next_pb.js';
import { Search } from '../../src/app/lib/protobuf/response/search_pb.js';
import { Content as WatchContent, Watch } from '../../src/app/lib/protobuf/response/watch_pb.js';

const encoder = new TextEncoder();

export function addUnknownField(message, { pagead = false, no = pagead ? 991 : 990 } = {}) {
  const marker = pagead ? 'pagead-private-fixture' : 'ordinary-private-fixture';
  const data = encoder.encode(`${marker}${'x'.repeat(1_100)}`);
  const wireData = new BinaryWriter().bytes(data).finish();
  message.getType().runtime.bin.onUnknownField(message, no, WireType.LengthDelimited, wireData);
  return message;
}

export function makeRichItem({ pagead = false, eml = 'video_card.eml' } = {}) {
  const item = new RichItemContent({
    videoWithContextRenderer: new ElementRenderer({
      videoRendererContent: new VideoRendererContent({
        renderInfo: new RenderInfo({ layoutRender: new LayoutRender({ eml }) }),
      }),
    }),
  });
  return addUnknownField(item, { pagead });
}

export function makeShelf() {
  return new SectionListSupportedRenderer({
    shelfRenderer: new ShelfRenderer({
      richSectionContent: new RichSectionContent({ reelShelfRenderer: new ReelShelfRenderer() }),
    }),
  });
}

export function encodePlayerFixture() {
  return new Player({
    adPlacements: [new AdPlacement({ adPlacementRenderer: new AdPlacementRenderer({ params: 'ad' }) })],
    adSlots: [new AdSlot()],
    playbackTracking: new PlaybackTracking({
      videostatsPlaybackUrl: new Tracking({ baseUrl: 'https://video.example/playback' }),
      pageadViewthroughconversion: new Tracking({ baseUrl: 'https://ad.example/pagead' }),
    }),
    playabilityStatus: new PlayabilityStatus({
      miniPlayer: new MiniPlayer({ miniPlayerRender: new MiniPlayerRender({ active: false }) }),
    }),
    captions: new Captions({
      playerCaptionsTrackListRenderer: new PlayerCaptionsTrackListRenderer({
        captionTracks: [new CaptionTrack({ baseUrl: 'https://caption.example/api?lang=en', languageCode: 'en' })],
        audioTracks: [new AudioTrack({ captionTrackIndices: [0] })],
      }),
    }),
  }).toBinary();
}

export function decodePlayer(bytes) { return Player.fromBinary(bytes); }

function browseContext(browseId) {
  return new ResponseContext({
    serviceTrackingParams: [new ServiceTrackingParam({
      params: [new Param({ key: 'browse_id', value: browseId })],
    })],
  });
}

export function makeBrowseMessage({ pagead = true, includeShelf = true, browseId = 'FEhome' } = {}) {
  const renderers = [new SectionListSupportedRenderer({
    itemSectionRenderer: new ItemSectionRenderer({
      richItemContent: [makeRichItem({ pagead }), makeRichItem({ pagead: false })],
    }),
  })];
  if (includeShelf) renderers.push(makeShelf());
  return new Browse({
    responseContext: browseContext(browseId),
    content: new BrowseContent({ sectionListRenderer: new SectionListRenderer({ sectionListSupportedRenderers: renderers }) }),
  });
}

export function encodeBrowseFixture(options) { return makeBrowseMessage(options).toBinary(); }
export function decodeBrowse(bytes) { return Browse.fromBinary(bytes); }

export function encodeSearchFixture() {
  return new Search({
    content: new BrowseContent({ sectionListRenderer: new SectionListRenderer({
      sectionListSupportedRenderers: [new SectionListSupportedRenderer({
        itemSectionRenderer: new ItemSectionRenderer({ richItemContent: [makeRichItem({ pagead: true }), makeRichItem()] }),
      })],
    }) }),
  }).toBinary();
}
export function decodeSearch(bytes) { return Search.fromBinary(bytes); }

export function encodeNextFixture() {
  return new Next({
    content: new NextContent({ nextResult: new NextResult({
      content: new BrowseContent({ sectionListRenderer: new SectionListRenderer({
        sectionListSupportedRenderers: [new SectionListSupportedRenderer({
          itemSectionRenderer: new ItemSectionRenderer({ richItemContent: [makeRichItem({ pagead: true }), makeRichItem()] }),
        })],
      }) }),
    }) }),
  }).toBinary();
}
export function decodeNext(bytes) { return Next.fromBinary(bytes); }

export function encodeShortsFixture() {
  return new Shorts({ entries: [
    new Entry({ command: new Command({ reelWatchEndpoint: new ReelWatchEndpoint() }) }),
    new Entry({ command: new Command({ reelWatchEndpoint: new ReelWatchEndpoint({
      overlay: new Overlay({ reelPlayerOverlayRenderer: new ReelPlayerOverlayRenderer({ style: 1 }) }),
    }) }) }),
  ] }).toBinary();
}
export function decodeShorts(bytes) { return Shorts.fromBinary(bytes); }

export function encodeGuideFixture() {
  const ids = ['SPunlimited', 'FEuploads', 'FEshorts', 'FEmusic_immersive', 'FEhome'];
  return new Guide({ items4: [new Item({ guideSectionRenderer: new GuideSectionRenderer({
    rendererItems: ids.map((browseId) => new RendererItem({ iconRender: new guideEntryRenderer({ browseId }) })),
  }) })] }).toBinary();
}
export function decodeGuide(bytes) { return Guide.fromBinary(bytes); }

export function encodeSettingFixture({ existing = false } = {}) {
  const settingItems = [new SettingItem({
    settingCategoryCollectionRenderer: new SettingCategoryCollectionRenderer({ categoryId: 10135 }),
  })];
  if (existing) settingItems.push(new SettingItem({
    backgroundPlayBackSettingRenderer: new BackgroundPlayBackSettingRenderer({ backgroundPlayback: true }),
  }));
  return new Setting({ settingItems }).toBinary();
}
export function decodeSetting(bytes) { return Setting.fromBinary(bytes); }

export function encodeWatchFixture() {
  return new Watch({ contents: [
    new WatchContent({ player: Player.fromBinary(encodePlayerFixture()) }),
    new WatchContent({ next: Next.fromBinary(encodeNextFixture()) }),
  ] }).toBinary();
}
export function decodeWatch(bytes) { return Watch.fromBinary(bytes); }

export function encodeLyricsFixture({ timed = false } = {}) {
  const lyrics = timed
    ? new VideoContent({ timedLyricsRender: new TimedLyricsRender({
      timedLyricsContent: new TimedLyricsContent({ runs: [new Run({ text: 'line one' }), new Run({ text: 'line two' })], footerLabel: 'footer' }),
    }) })
    : undefined;
  const renderer = timed
    ? new SectionListSupportedRenderer({ itemSectionRenderer: new ItemSectionRenderer({ richItemContent: [new RichItemContent({
      videoWithContextRenderer: new ElementRenderer({ videoRendererContent: new VideoRendererContent({
        videoInfo: new VideoInfo({ videoContext: new VideoContext({ videoContent: lyrics }) }),
      }) }),
    })] }) })
    : new SectionListSupportedRenderer({ musicDescriptionShelfRenderer: new MusicDescriptionShelfRenderer({
      description: new Label({ runs: [new Run({ text: 'line one\nline two' })] }),
      footer: new Label({ runs: [new Run({ text: 'footer' })] }),
    }) });
  return new Browse({
    responseContext: browseContext('MPLYt_fixture'),
    content: new BrowseContent({ sectionListRenderer: new SectionListRenderer({ sectionListSupportedRenderers: [renderer] }) }),
  }).toBinary();
}
