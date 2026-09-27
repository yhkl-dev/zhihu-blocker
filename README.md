# 知乎屏蔽器 (zhihu-blocker)

Plasmo (Chrome MV3) 扩展。藏掉知乎的广告、误用栏目,并可选接入 DeepSeek 自动识别软广。

## 功能

| 模块 | 说明 |
|------|------|
| 规则屏蔽 | 按 CSS 选择器 + 可选文本子串,分类开关:信息流广告 / 右侧推荐栏 / 广告位。`src/rules.ts` 单一真相,失效只改选择器 |
| 作者黑名单 | 回答卡"屏蔽"按钮:按 `author_member_hash_id` 抓同作者,按正文签名抓同内容不同作者 |
| AI 软广识别 | 三路初筛(关键词 / 内置软广话术 / 惯犯作者)任一命中才送 DeepSeek,省钱防误伤;判定缓存 + 白名单;橙框(低置信)卡可 [藏了]/[正常] 闭环标注 |
| few-shot 样本 | 回答卡"软广/非软广"按钮或 popup 手动添加,样本注入 LLM prompt 提准度 |
| 布局修复 | 右侧栏藏掉后,知乎 `Topstory-container` 的负 margin 展宽归零,主列居中占满 |
| 深色适配 | 注入按钮走 `.zb-btn` class,自动适配知乎深色主题 |

## 工作原理

```
页面突变 → 规则匹配(selectors)→ 藏
        → 黑名单(作者 hash / 内容签名)→ 藏
        → AI 初筛(关键词/话术/惯犯)→ background service worker → DeepSeek
            → 置信 ≥ 阈值:藏
            → 置信 < 阈值:橙框标出 + [藏了]/[正常] 按钮
```

- 内容脚本只做 DOM 与判定应用,LLM 调用全在 background,key 不暴露页面上下文
- 三路隐藏各用独立 attr,取消某一路不误伤其他路
- 判定缓存按内容签名(前 256 字去空白),内容不变判定不变,无 TTL

## 存储布局 (chrome.storage)

| Key | 区域 | 内容 |
|-----|------|------|
| `config` | sync | 分类开关 + AI 开关/阈值/会话上限 |
| `blockedAuthors` | local | 作者黑名单,上限 500(旧版 sync 数据自动迁移) |
| `aiJudgments` | local | 判定缓存,LRU 上限 1000 |
| `aiWhitelist` | local | 误判白名单(签名),上限 500 |
| `aiSamples` | local | few-shot 样本,LRU 上限 50 |
| `aiPatterns` | local | 用户关键词 |
| `deepseekApiKey` | local | API key,明文,不跨设备同步 — UI 已明示 |
| `aiCallCount` | session | 会话 LLM 调用计数,跨 SW 休眠 |
| `aiLastError` | local | 最近一次 LLM 失败原因,popup 展示 |

## 权限与理由

| 权限 | 为什么需要 |
|------|-----------|
| `storage` | 保存你的配置、黑名单、AI 判定缓存、few-shot 样本和 API key。不申请则每次打开全部重置,黑名单无法跨页面生效 |
| `https://*.zhihu.com/*`、`https://zhihu.com/*`(host) | 唯一工作对象:在知乎页面隐藏所选模块、注入"屏蔽/标注"按钮、应用黑名单与判定结果。没有它无法碰知乎 DOM |
| `https://api.deepseek.com/*`(host) | 仅在你开启 AI 识别并填了自己的 key 后,由后台把命中初筛的回答正文发给 DeepSeek 判定软广。不开 AI 时无任何网络请求 |

不申请:通知、下载、历史、cookies、无限存储,也不需要。web 页面不可读任何扩展数据。

## 开发

```bash
pnpm install
pnpm dev          # 开发模式
pnpm test         # vitest(57 例,含 jsdom DOM 套件)
pnpm typecheck    # tsc --noEmit
pnpm build        # 生产构建 build/chrome-mv3-prod
```

装插件:`chrome://extensions` → 开发者模式 → 加载已解压 → `build/chrome-mv3-dev`。改代码后必须在插件卡片上手动重载(dev 模式的热重载对 content script 不全可靠)。

## 测试

- 单测:storage 沙盒 mock(`src/__tests__/setup.ts`),覆盖 storage 校验、LRU、迁移、LLM 解析边界、布局修复、attr 语义
- **手动验证:[docs/MANUAL-TEST.md](docs/MANUAL-TEST.md)** — selector 全靠知乎类名,类名混淆 + A/B 随时让规则静默失效。改 rules 或知乎大改版后必须过一遍,含作者 hash 稳定性检查

## 隐私

- 回答正文仅在命中初筛时发送到你自己的 DeepSeek key(opens in popup 明示),仅用于软广判定
- API key、判定缓存、样本均存 `storage.local`,不跨设备明文同步
- 无遥测、无第三方服务、无网络请求超出 `api.deepseek.com`

## 已知限制

- 规则选择器依赖知乎 DOM,需要 MANUAL-TEST 维护
- 评论区软广不覆盖(`.ContentItem` 之外)
- 判定无 TTL:换模型/换样本后旧判定不失效(清缓存)