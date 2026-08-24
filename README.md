# YouTube Ultimate Loon

YouTube Ultimate 是一个面向 Loon 的单一插件入口，支持 iOS、iPadOS 和
macOS，不支持 tvOS。它保留已验证的 Safari 网页净化逻辑，并为 YouTube 与
YouTube Music App 增加 Protobuf 响应处理。

安装地址：

```text
https://raw.githubusercontent.com/Giu-zhao/Loon_plugin/main/YouTubeUltimate.lpx
```

## 功能与边界

- 清理 player、browse、next、search、Shorts、guide、settings 和 get_watch
  响应中的明确广告或升级入口；
- 可启用画中画、后台播放、字幕翻译与 YouTube Music 歌词翻译；
- 三个独立开关可隐藏上传、Shorts 和 YouTube Music 选段按钮；
- Safari 继续清理 JSON/HTML 广告字段、页面广告容器并点击可用的跳过按钮；
- 不改写普通 `videoplayback`、流媒体 URL、Cookie、账号状态、版权规则或历史；
- 不伪造 Premium、下载、智能下载或其他付费权益，也不提供 SponsorBlock；
- JSON、Protobuf 或翻译失败时原样放行，优先保证播放可用。

## 参数

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `enabled` | `true` | 总开关 |
| `web_enhance` | `true` | Safari 页面增强 |
| `app_enhance` | `true` | App Protobuf 响应增强 |
| `blockUpload` | `false` | 隐藏上传按钮 |
| `blockShorts` | `false` | 隐藏 Shorts 按钮和 Shorts shelf |
| `blockImmersive` | `false` | 隐藏 YouTube Music 选段按钮 |
| `captionLang` | `zh-Hans` | 字幕目标语言；可选 `zh-Hans`、`zh-Hant`、`ja`、`ko`、`en`、`off` |
| `lyricLang` | `zh-Hans` | 歌词目标语言；可选值同上 |
| `debug` | `false` | 仅记录端点、处理类型、计数及成功/失败状态 |

## 隐私说明

脚本不会在日志中写入响应 Body、Cookie、账号标识、字幕或歌词正文、播放 URL
和观看历史。持久化广告缓存仅包含 Protobuf 字段号和 EML 名称。

当 `lyricLang` 不是 `off` 且打开 YouTube Music 的 `MPLYt` 歌词页时，当前
歌词正文会发送给 Google Translate 以取得译文。若不希望发送歌词，请把
`lyricLang` 设为 `off`。除此之外，生产插件加载的脚本均来自
`Giu-zhao/Loon_plugin`；固定上游请求脚本只作来源审计，不会被插件加载。

## 网络前提

Loon 需要启用 MitM 并在设备上安装、信任证书。插件让 `youtube.com`、
`youtubei.googleapis.com` 和 `googlevideo.com` 的 QUIC 回退到 TCP/TLS；MitM
包含 `*.googlevideo.com`，但 Rewrite 只拒绝 URL 带明确 `&oad` 标记的
`initplayback`，不会拒绝普通视频流或整个 Google 视频域名。

关闭 `app_enhance` 会停止 App 响应处理，但 Loon 插件格式无法随参数动态删除
已声明的 QUIC 与 MitM 主机范围；如需完全撤销该范围，请停用或移除插件。

## 更新与验证

自动化测试使用不含用户数据的人工 Protobuf 夹具，并保留全部 Safari 回归测试。
它不能替代真实账号、设备、地区和广告投放环境。

macOS 建议验证 Safari 首页、搜索、Shorts、普通视频、字幕和推荐列表。iOS 与
iPadOS 必须由用户在真实设备上验证 YouTube App 的播放、信息流、搜索、Shorts、
画中画、锁屏后台、字幕和按钮开关，以及 YouTube Music 的后台播放、普通/逐行
歌词和 `lyricLang=off`。当前文档不声称 iOS/iPadOS 已实机通过。

## 回退

在 Loon 中停用本插件可立即停止规则与脚本。若升级前已备份配置，也可恢复备份，
再将插件入口恢复到上一条已验证提交；无需改动其他插件、节点或全局代理设置。

## 本地构建

需要 Node.js 18 或更高版本：

```bash
npm ci
npm run build
npm run check
npm test
```

`YouTubeUltimateAPI.js` 使用固定依赖和无时间戳 banner 构建，两次构建应产生完全
相同的 SHA-256。第三方来源与许可证见 `THIRD_PARTY_NOTICES.md`。
