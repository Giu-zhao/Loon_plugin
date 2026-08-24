# YouTube Ultimate Loon 全系统 App 合并设计

日期：2026-08-24
状态：概念方案已确认，等待书面设计复核

## 1. 目标

把已经验证可用的 macOS Safari 网页去广告能力，与原 YouTube/YouTube Music App 插件能力合并为一个可长期维护的 Loon 插件入口：

```text
https://raw.githubusercontent.com/Giu-zhao/Loon_plugin/main/YouTubeUltimate.lpx
```

最终插件支持 iOS、iPadOS、macOS，不支持 tvOS。插件源码、构建产物、第三方许可证和来源记录全部存放在用户自己的 GitHub 仓库，不依赖 `kelee.one` 的脚本地址。

## 2. 功能范围

### 2.1 Safari 网页版

保留当前已经实机确认无广告的实现：

- 清理 `player`、`browse`、`search`、`guide`、`next`、`get_watch` JSON 响应中的广告字段；
- 清理首页、搜索、Shorts、推荐列表和播放页广告容器；
- 自动点击可用的跳过广告按钮；
- 保留登录状态、字幕、推荐内容和正常视频流；
- 不修改 Cookie、账号信息或正常播放地址。

### 2.2 YouTube 与 YouTube Music App

处理 App 使用的二进制 Protobuf 响应：

- 清理视频贴片、中插、瀑布流、搜索和 Shorts 广告；
- 清理升级入口；
- 可选隐藏上传按钮、Shorts 按钮和 YouTube Music 选段按钮；
- 增加画中画和后台播放能力；
- 增加字幕翻译；
- 增加 YouTube Music 普通歌词与逐行歌词翻译；
- 支持 Premium 订阅账号正常使用，不修改订阅状态；
- 不提供下载、会员或付费权益伪造。

## 3. 插件参数

合并后的 `[Argument]` 使用以下参数和默认值：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 总开关 |
| `web_enhance` | `true` | Safari 页面增强 |
| `app_enhance` | `true` | App 二进制响应处理 |
| `blockUpload` | `false` | 隐藏 YouTube 上传按钮 |
| `blockShorts` | `false` | 隐藏 YouTube Shorts 按钮 |
| `blockImmersive` | `false` | 隐藏 YouTube Music 选段按钮 |
| `captionLang` | `zh-Hans` | 字幕翻译语言，可选 `zh-Hans`、`zh-Hant`、`ja`、`ko`、`en`、`off` |
| `lyricLang` | `zh-Hans` | 歌词翻译语言，可选值同上 |
| `debug` | `false` | 隐私安全调试日志 |

默认值与用户现有 App 插件界面保持一致：三个隐藏按钮开关默认关闭，字幕和歌词默认翻译为简体中文。

## 4. 架构

### 4.1 单入口、双数据通道

`YouTubeUltimate.lpx` 保持唯一安装入口，但脚本按数据类型分流：

1. `www.youtube.com` 的 JSON 响应继续交给现有网页脚本；
2. `youtubei.googleapis.com` 的 App 二进制响应交给 `YouTubeUltimateApp.js`；
3. 对无法仅凭主机判断的请求，由统一分发器根据响应头和 Body 类型识别 JSON 或 Protobuf；
4. HTML 仅由 `YouTubeUltimatePage.js` 处理。

同一个响应只允许进入一种处理器，避免 JSON 与 Protobuf 脚本重复解码或连续改写。

### 4.2 App 端点

App 二进制处理覆盖：

```text
/youtubei/v1/browse
/youtubei/v1/next
/youtubei/v1/player
/youtubei/v1/search
/youtubei/v1/reel/reel_watch_sequence
/youtubei/v1/guide
/youtubei/v1/account/get_setting
/youtubei/v1/get_watch
/youtubei/v1/config
/youtubei/v1/log_event
```

其中 `config` 和 `log_event` 只用于维护 Onesie 播放所需配置，不打印或上传请求内容。

### 4.3 Protobuf 源码与构建

第三方基础来自 Apache-2.0 授权的 `Maasea/sgmodule`：

- 当前行为基线固定到提交 `65075cdb388fc5e3094afd7e7314c67b243f3525`；
- 歌词翻译源逻辑参考同仓库历史提交 `e5d66ffc39b71e499c6e9b24ef13d44598f2c86f`；
- `THIRD_PARTY_NOTICES.md` 记录仓库、提交、许可证和本项目修改；
- 仓库内保留 Apache-2.0 许可证副本；
- 生成的单文件 Loon 脚本放在仓库根目录，源码和 Protobuf 定义放在 `src/app/` 与 `vendor/maasea/`；
- 构建必须可重复执行，生成结果不得依赖 `kelee.one`。

歌词翻译逻辑将移植到当前 Protobuf 结构，而不是直接使用旧构建产物，避免旧字段定义覆盖新版本行为。

## 5. 广告流与 MitM 边界

App 广告可能通过 `*.googlevideo.com/initplayback` 发送。合并插件将：

- 让 `youtubei.googleapis.com` 与 `googlevideo.com` 的 QUIC 回退到 TCP/TLS；
- 仅拒绝 URL 中带明确广告标记的 `initplayback` 请求；
- 不修改普通 `videoplayback`、音视频分片、清晰度或媒体 Body；
- MitM 主机加入 `*.googlevideo.com` 是识别 HTTPS 广告路径所必需的范围扩大，脚本不会读取或记录正常视频内容。

Safari 已验证链路继续保留当前规则。若 App 功能关闭，App 响应脚本不执行；但 Loon 规则与 MitM 主机列表仍存在，这是单插件条件规则能力的限制。

## 6. 数据处理

### 6.1 播放响应

- 清空 `adPlacements` 和 `adSlots`；
- 删除广告转化追踪字段；
- 保留视频格式、播放地址、版权限制和账号状态；
- 增加画中画与后台播放渲染能力；
- 根据 `captionLang` 增加或选中翻译字幕轨道。

### 6.2 信息流、搜索和 Shorts

- 识别含 `pagead` 标记的未知 Protobuf 字段；
- 维护本地白名单和黑名单以降低重复扫描开销；
- 删除广告项，不删除普通视频；
- `blockShorts=false` 时保留正常 Shorts 内容，仅清理 Shorts 广告。

### 6.3 导航和设置

- 始终移除升级入口；
- 根据三个按钮参数移除对应导航项；
- 在设置响应中加入画中画和后台播放入口。

### 6.4 歌词翻译

- 仅处理 YouTube Music 歌词页面对应的 `MPLYt` browseId；
- 优先处理逐行歌词，找不到时处理普通歌词文本；
- 通过 Google Translate 接口请求目标语言；
- 原文已经是目标语言时不重复拼接；
- 翻译失败、结构变化或网络超时时保留原歌词并结束，不影响播放。

## 7. 错误处理与隐私

- JSON 或 Protobuf 解码失败时原样放行；
- 翻译请求失败时保留原歌词；
- `lyricLang` 不是 `off` 时，歌词翻译功能会把当前歌词正文发送给 Google Translate；设为 `off` 后不发送歌词翻译请求；
- 持久化数据只保存广告字段白名单、黑名单和 Onesie 所需密钥配置；
- 调试日志只记录端点、处理类型、删除数量和成功/失败状态；
- 除上述用户主动启用的歌词翻译请求外，不向第三方上传响应 Body；脚本不记录 Cookie、字幕正文、歌词正文、观看历史、账号标识或播放 URL；
- 用户可以通过关闭 `app_enhance` 或恢复配置备份立即回退。

## 8. 测试与验收

### 8.1 自动化测试

- 保留现有 Safari JSON/HTML 回归测试；
- 增加 Protobuf 编解码往返测试；
- 增加 player 广告、画中画、后台播放和字幕翻译测试；
- 增加 browse/search/next/Shorts 广告测试；
- 增加按钮开关测试；
- 增加普通歌词、逐行歌词、翻译失败回退测试；
- 增加 JSON/Protobuf 分流测试；
- 增加插件端点、参数、系统范围、许可证和本地脚本路径静态测试；
- 对构建产物执行语法检查和可重复构建校验。

测试夹具使用人工构造的最小 Protobuf 数据，不保存用户 Cookie、账号响应或真实观看数据。

### 8.2 实机验收

macOS：

- 重新验证 Safari 首页、搜索、Shorts 和普通视频；
- 验证页面注入、player 清理及正常视频播放；
- 验证配置重载后脚本确实命中。

iOS/iPadOS：

- 用户通过同一 GitHub 插件地址安装；
- 验证 YouTube App 视频、信息流、搜索和 Shorts；
- 验证画中画、后台播放、字幕翻译和三个按钮开关；
- 验证 YouTube Music 后台播放、选段按钮和歌词翻译。

无法在本机替代完成的 iOS/iPadOS 实机结果必须明确标记为待用户验收，不以自动化测试冒充实机成功。

## 9. 发布与回退

发布顺序：

1. 在仓库内完成源码、构建和测试；
2. 提交并推送 GitHub；
3. 校验 GitHub Raw 与本地构建产物哈希一致；
4. 备份 Loon 当前配置；
5. 直接修改 Loon 配置中的脚本、规则、MitM 和插件地址；
6. 确认运行中的 `lastConfig` 与配置文件一致；
7. 完成 macOS 实际请求链验证；
8. 由用户完成 iOS/iPadOS 实机验收。

回退时恢复本次配置备份，并把插件版本恢复到当前已验证的 Safari 版本。不得修改其他插件、节点、策略组或全局代理设置。

## 10. 不在本次范围

- tvOS 支持；
- SponsorBlock 或作者口播跳过；
- 伪造 Premium、下载或其他付费权益；
- 修改账号地区、年龄限制或版权限制；
- 屏蔽整个 Google 广告域名体系；
- 修改 Loon 之外的系统网络设置。
