# 更新记录

## 2.0.0 - 2026-08-24

- 支持 Loon iOS、iPadOS 和 macOS；明确不支持 tvOS；
- 新增统一 JSON/Protobuf 分发器和确定性单文件构建，保留 Safari 原有行为；
- 新增 App player、browse、next、search、Shorts、guide、settings 和 get_watch
  二进制响应处理；
- 清理明确广告和升级入口，增加画中画、后台播放与字幕翻译；
- 增加上传、Shorts、YouTube Music 选段三个默认关闭的独立开关；
- 恢复普通歌词和逐行歌词翻译，并在失败、非法响应或行数不匹配时原样放行；
- 明确披露歌词翻译会把歌词正文发送给 Google Translate，可用
  `lyricLang=off` 关闭；
- 仅拒绝带 `&oad` 的 `initplayback`，不拒绝普通 `videoplayback` 或整个
  `googlevideo.com`；
- 固定 `@bufbuild/protobuf`、esbuild 和 TypeScript 版本，补充 Apache-2.0
  第三方声明与来源校验；
- 上游 Request 与 Onesie 构建产物均只保留作审计，不被生产插件引用；为避免
  查询字符串路由碰撞，生产插件有意不处理 `config`/`log_event` 响应；
- 不提供 Premium/下载权益伪造或 SponsorBlock。

自动化测试不等于真实设备验收；iOS/iPadOS 功能仍需用户实机验证。

## 1.0.1 - 2026-08-24

- 新增 `YouTubeUltimate.lpx` 稳定入口，避免 Loon 复用旧插件地址缓存；
- 保留 `YouTubeSafariAdBlock.lpx` 作为历史兼容文件。

## 1.0.0 - 2026-08-24

- 新增 macOS Safari player、browse/search/guide、next/get_watch JSON 净化；
- 新增带 CSP nonce 复用的页面增强；
- 缩小跨站广告与媒体流阻断范围，并加入 Node.js 回归测试。
