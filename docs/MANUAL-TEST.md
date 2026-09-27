# 手动验证清单

代码评审发现 selectors 全凭猜测、未对 live 站验证。类名混淆 + A/B 下规则随时死,且死得无声。每次改 `src/rules.ts` 或知乎大改版后,重跑一遍。

## 一次动作拿到全部验证能力

1. `pnpm dev`
2. Chrome `chrome://extensions` → 开发者模式 → 加载已解压 → 选 `build/chrome-mv3-dev`(dev 模式产出目录)
3. 打开知乎,**每次改动插件代码后**按插件卡片上的刷新图标重载

## 逐条规则验证

按规则 id 在对应页面查:`src/rules.ts` 的 `RULES` 数组。

| 页面 | 待验证 |
|------|--------|
| 首页 feed | `feed-ad-tuiguang`:滚 5 屏,凡带"推广"标签卡必藏;正常回答带"推广"二字的**不能**藏(误伤检查) |
| 首页 feed | `feed-ad-guanggao`:"广告"标签卡藏 |
| 问题页 | `question-sidebar`:右侧栏消失 |
| 首页 | `home-sidebar`:右侧栏消失,**且文章列表主列占满、不再贴左大空**(布局修复生效) |
| 问题页 | `question-sidebar`:右侧栏消失,主列占满居中 |
| 首页侧栏 | `creator-center`:"创作中心"入口藏 |
| 首页 | `trending-search`:"大家都在搜"藏 |
| 首页侧栏 | `salt-author` / `paid-consult` / `recommend-follow`:"盐言作者平台"/"付费咨询"/"推荐关注"卡藏 |

任一规则不命中:该 selector 已死,改 `rules.ts`,回填本清单。

## 作者 hash 稳定性(黑名单命根子)

`src/author.ts:13` 拿的 `author_member_hash_id` 如果 per-content 而非 per-author,黑名单整个报废。验证:

1. DevTools Console(F12)执行:
   ```js
   [...document.querySelectorAll('.ContentItem[data-zop]')]
     .slice(0, 10)
     .map(c => JSON.parse(c.getAttribute('data-za-extra-module') || '{}')
       .card?.content?.author_member_hash_id)
   ```
2. 同一作者的两条回答,hash **必须相同**;不同作者必须不同。
3. 不同则:黑名单按 sig(内容签名)也能兜一部分,但"惯犯作者"功能失效,需另找锚点。

## 交互流验证

- 屏蔽按钮:点"屏蔽" → 卡藏 + 该作者其他卡藏;popup 黑名单可见;删除/清空后卡恢复
- 屏蔽失败反馈:DevTools 里 `chrome.storage.local.set` 人为断点?不必 — 正常流下按钮变"失败"两秒即样式通路正常
- 样本按钮:点"软广"/"非软广" → popup few-shot 列表 +1
- flag 闭环:AI 开 + 阈值 1(让判定落入"只标不藏")→ 橙框卡出现[藏了][正常]两钮。[藏了]→藏 + popup 判定列表出现"用户确认";[正常]→解框,poup 白名单生效
- 关闭 AI 开关:所有橙框、AI 隐藏卡、flag 按钮全部消失,规则/黑名单隐藏不受影响
- 分类开关:popup 关"信息流广告" → 页内已藏推广卡恢复;再开 → 重新藏
- 分类开关对布局:关"右侧推荐栏" → 侧栏回来 + 主列回双列布局(布局修复反转);再开 → 侧栏藏 + 主列占满
- 布局修复失效时诊断(侧栏藏了但主列仍贴左):DevTools Console 执行,把输出贴回:
  ```js
  ;(() => {
    const sel = '[data-za-detail-view-path-module="RightSideBar"], .QuestionSideColumn'
    const sb = document.querySelector(sel)
    if (!sb) return console.log("侧栏选择器没中,sidebar 规则已死")
    let n = sb
    for (let i = 0; n && i < 6; i++) {
      n = n.parentElement
      if (!n) break
      const cs = getComputedStyle(n)
      if (cs.display.includes("grid") || cs.marginRight !== "0px") {
        console.log(
          i + 1,
          n.tagName,
          n.className.slice(0, 80),
          "display:" + cs.display,
          "gridTemplateColumns:" + cs.gridTemplateColumns,
          "marginRight:" + cs.marginRight,
          "fixed:" + n.hasAttribute("data-zhihu-blocker-layout-fixed")
        )
      }
    }
  })()
  ```
  `fixed:true` 但仍贴左 = 容器不是 grid 双列,知乎换了布局方式,拿输出来改 `fixSidebarLayout`。
- 深色模式:切知乎深色主题,注入按钮可读
- 迁移:旧版本(本改动前)产生的 sync 黑名单,升级后仍生效且不再出现在 sync

## 验证一个 API 错误可见性

1. popup 填错的 API key,开 AI,刷 feed 触发判定
2. 重开 popup → stats 行"最近错误"显示 `http 401`
3. 换对 key,判定成功后错误提示消失

## 疑问留档

- [ ] 移动端 UA / 深色主题下 `.GlobalSideBar` 是否更名
- [ ] feed 卡在"关注"tab 与"推荐"tab 的 DOM 差异
- [ ] 创作者主页/专栏页是否需要覆盖(当前 content script 只配了 zhihu.com 全域,效果未验)