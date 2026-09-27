# Chrome Web Store 上架清单

上架入口:`https://chrome.google.com/webstore/devconsole` → 新项目 → zip 上传 `pnpm package` 产物。

## 基本信息

| 字段 | 值 |
|------|-----|
| 标题(中文) | 知乎屏蔽器 |
| 标题(英文) | Zhihu Blocker |
| 短描述(≤132 字符) | 屏蔽知乎广告和推广模块,支持用你自己的 DeepSeek key 做 AI 软广识别 |
| 短描述(英文) | Hide ads and promotional modules on Zhihu, with optional AI soft-ad detection via your own DeepSeek API key. |
| 版本 | 0.0.1 |
| 图标 | `assets/icon-128.png` |
| 类别 | 生产工具(Productivity) |
| 语言 | 中文(简体) + 英语 |

## 详细描述

### 中文

屏蔽知乎广告和与阅读无关的模块,把时间还给内容。

**功能**

- 规则屏蔽:信息流推广卡片、"大家都在搜"、右侧推荐栏等,分三类独立开关,随时可逆
- 作者黑名单:回答卡片一键"屏蔽",同作者或同内容的其他回答一并藏掉
- AI 软广识别(可选,默认关):关键词 / 常见软广话术 / 惯犯作者三路初筛命中后,才把回答正文发送到你自己的 DeepSeek API key 做判定。高置信自动隐藏,低置信只标橙框,由你点 [藏了] / [正常] 决定,标注反馈进缓存让判定越来越准
- 白名单:误判一键解除
- 布局修复:右侧栏藏掉后文章列表自动居中占满,不留空
- 深色模式适配:注入按钮随知乎深色主题切换

**使用说明**

打开 popup 勾选要屏蔽的分类。要用 AI 识别:填入 [[DeepSeek](https://platform.deepseek.com/)]] 的 API key 并打开"启用 AI 自动识别"。所有设定、黑名单、样本都存在本机浏览器 `chrome.storage`,不跨设备同步。

**隐私**

- 无账户、无遥测、无广告、完全开源
- 回答正文仅在命中初筛时发送到你自己的 DeepSeek key,只用于判定软广
- 数据不出浏览器与 DeepSeek 之外,不收集、不转卖、不做分析

**反馈**

问题与建议请发 [[GitHub Issues](https://github.com/yhkl-dev/zhihu-blocker/issues)]]。

### English

Hide ads and irrelevant modules on Zhihu, and get your feed back.

**Features**

- Rule-based blocking: promoted cards, trending searches, the right sidebar, and more, each with an independent toggle that takes effect immediately
- Author blocklist: one-click "block" on any answer card hides every answer from that author and identical content from others
- AI soft-ad detection (optional, off by default): answer text is only sent to *your own* DeepSeek API key after a three-way local pre-filter (keywords / ad copy patterns / repeat-offender authors). High-confidence matches are hidden, low-confidence ones get an orange outline with [Hide] / [Not an ad] buttons so you stay in control, and your feedback improves future judgments
- Whitelist: one click to undo any false positive
- Layout fix: with the sidebar hidden, the main feed re-centers with no empty gap
- Dark mode: injected buttons adapt to Zhihu's dark theme

**Setup**

Tick the categories you want hidden in the popup. For AI detection, paste a [DeepSeek](https://platform.deepseek.com/) API key and enable "AI 自动识别". All settings, blocklist, and samples are stored in local `chrome.storage` and never synced across devices.

**Privacy**

No accounts, no telemetry, no ads, fully open source. Answer text is sent only to your own DeepSeek key, solely for soft-ad classification. No data collection, no selling, no analytics.

**Feedback**

Please file an issue on [GitHub](https://github.com/yhkl-dev/zhihu-blocker/issues).

## 权限用途说明(商店逐条字段)

| 权限 | 用途 |
|------|------|
| `storage` | 在浏览器本地保存你的配置、黑名单、AI 判定缓存、few-shot 样本和 API key。其中仅配置走 `chrome.storage.sync`,其余全部 `local`,不跨设备明文同步 |
| `https://*.zhihu.com/*` 与 `https://zhihu.com/*`(host) | 这是插件的唯一工作对象:在知乎页面隐藏用户选定的内容模块、注入"屏蔽/标注"按钮、应用黑名单与 AI 判定结果 |
| `https://api.deepseek.com/*`(host) | 仅在用户开启 AI 识别且本地初筛命中时,由后台把回答正文发送到用户自己填写的 DeepSeek API key 做软广判定 |

商店"权限使用范围"字段直接填:storage — 保存用户配置与本地数据;host 权限 — 在知乎页面隐藏用户选定内容,并按用户操作调用 DeepSeek API。

## 数据使用声明(Data usage disclosure)

- **单一用途**:屏蔽知乎广告与推广内容,本地数据全部服务于该功能
- "远程代码执行":无
- "已获认证"?无需
- 填写商家隐私政策链接(GitHub Pages 或 gist 均可),内容直接贴 `docs/privacy.md`

## 截图(需自拍,商店 1280x800 或 640x400)

至少 1 张,建议 3 张:

1. 知乎首页:右栏与推广卡被藏、主列居中占满的效果
2. popup 全貌:分类开关 + AI 设置 + 黑名单/样本列表
3. AI 判定效果:橙框卡 + [藏了]/[正常] 按钮

拍摄时注意:截图不得含真实用户昵称/头像(隐私合规),建议用未登录状态或打码。

## 上架前自检

- [ ] `pnpm test` + `pnpm typecheck` + `pnpm build` 全绿
- [ ] `pnpm package` 产物 zip 大小 < 20MB(商店上限)
- [ ] ~~push + 换链接~~ 完成:https://github.com/yhkl-dev/zhihu-blocker,隐私政策链接 https://github.com/yhkl-dev/zhihu-blocker/blob/main/docs/privacy.md
- [ ] 真机过一遍 `docs/MANUAL-TEST.md`
- [ ] 截图不含个人隐私信息
- [ ] 发布后 Chrome 审核约 1-3 天,提审前版本号定稿 1.0.0(0.0.1 会被视为 pre-release 惯例,不强制)