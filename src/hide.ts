// 隐藏属性 + 注入样式。规则 / 作者黑名单 / AI 判定各用独立 attr，
// 取消某一路时只摘对应 attr，不误伤其他路藏掉的元素。

export const HIDDEN_ATTR = "data-zhihu-blocker-hidden"
export const AUTHOR_BLOCKED_ATTR = "data-zhihu-blocker-author-blocked"
export const AI_HIDE_ATTR = "data-zhihu-blocker-ai-hidden"
export const AI_FLAG_ATTR = "data-zhihu-blocker-ai-flagged"

const STYLE_ID = "zhihu-blocker-style"

// 页面注入按钮样式:class 驱动,顺带暗色适配(知乎深色主题下 inline 灰框半瞎)
export function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = `
[${HIDDEN_ATTR}],[${AUTHOR_BLOCKED_ATTR}],[${AI_HIDE_ATTR}]{display:none!important}
[${AI_FLAG_ATTR}]{outline:2px solid #ff9a2e!important;outline-offset:-2px}
.zb-btn{margin-left:8px;padding:0 6px;font-size:12px;line-height:18px;color:#8590a6;background:transparent;border:1px solid #ebebeb;border-radius:4px;cursor:pointer}
.zb-btn:hover{color:#1a1a1a;border-color:#d3d3d3}
.zb-btn-danger{color:#f53f3f;border-color:#fbc4c4}
.zb-btn-ok{color:#00b42a;border-color:#beebc8}
@media (prefers-color-scheme: dark){
  .zb-btn{color:#8a94a6;border-color:#3a4156}
  .zb-btn:hover{color:#e6e6e6;border-color:#4a5268}
  .zb-btn-danger{color:#f76965;border-color:#5c3b3b}
  .zb-btn-ok{color:#3ddc84;border-color:#2e5c40}
}
`
  ;(document.head ?? document.documentElement).append(style)
}

export function hide(el: Element): void {
  if (el.hasAttribute(HIDDEN_ATTR)) return
  el.setAttribute(HIDDEN_ATTR, "1")
}

// 规则/配置变更时全量摘 HIDDEN_ATTR,再按新规则重扫。不做增量 diff。
export function unhideAll(root: ParentNode): void {
  for (const el of root.querySelectorAll(`[${HIDDEN_ATTR}]`)) {
    el.removeAttribute(HIDDEN_ATTR)
  }
}

// 关 AI 时清橙框/已藏卡:只摘 AI 两个 attr,不碰规则与黑名单的隐藏
export function clearAiMarks(root: ParentNode): void {
  for (const el of root.querySelectorAll(
    `[${AI_HIDE_ATTR}],[${AI_FLAG_ATTR}]`
  )) {
    el.removeAttribute(AI_HIDE_ATTR)
    el.removeAttribute(AI_FLAG_ATTR)
  }
}

const LAYOUT_FIX_ATTR = "data-zhihu-blocker-layout-fixed"

// 侧栏被藏后,知乎 Topstory-container 用负 margin 向右拉宽 206px 给悬浮
// 侧栏腾位,主列贴在左,藏栏后右侧留大空。向上找最近 grid 布局容器:
// 负 margin 归零 + 退单列,主列随容器居中占满。只看两类容器修正:
// 负 margin 的(首页)或多列 grid 的(问题页等真双列),单列正值的不乱动。
// 只在 sidebar 类规则命中时调用,feed 卡等非侧栏隐藏不走这。
export function fixSidebarLayout(el: Element): void {
  for (
    let node = el.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    if (node.hasAttribute(LAYOUT_FIX_ATTR)) return // 已修过
    const cs = getComputedStyle(node)
    if (cs.display !== "grid" && cs.display !== "inline-grid") continue
    const marginRight = parseFloat(cs.marginRight)
    const trackCount = cs.gridTemplateColumns.split(" ").filter(Boolean).length
    if (!(marginRight < 0 || trackCount > 1)) continue
    node.setAttribute(LAYOUT_FIX_ATTR, "1")
    if (marginRight < 0) {
      node.style.setProperty("margin-right", "0px", "important")
    }
    node.style.setProperty(
      "grid-template-columns",
      "minmax(0, 1fr)",
      "important"
    )
    return
  }
}

// 配置变更/侧栏恢复时,摘布局修复,容器回原布局
export function restoreLayouts(root: ParentNode): void {
  for (const el of root.querySelectorAll<HTMLElement>(`[${LAYOUT_FIX_ATTR}]`)) {
    el.removeAttribute(LAYOUT_FIX_ATTR)
    el.style.removeProperty("margin-right")
    el.style.removeProperty("grid-template-columns")
  }
}

export function hideAuthorCard(el: Element): void {
  if (el.hasAttribute(AUTHOR_BLOCKED_ATTR)) return
  el.setAttribute(AUTHOR_BLOCKED_ATTR, "1")
}

export function unhideAuthorCard(el: Element): void {
  el.removeAttribute(AUTHOR_BLOCKED_ATTR)
}

export function hideAi(el: Element): void {
  if (el.hasAttribute(AI_HIDE_ATTR)) return
  el.setAttribute(AI_HIDE_ATTR, "1")
  el.removeAttribute(AI_FLAG_ATTR)
}

export function flagAi(el: Element): void {
  if (el.hasAttribute(AI_HIDE_ATTR)) return
  el.setAttribute(AI_FLAG_ATTR, "1")
}

export function unhideAi(el: Element): void {
  el.removeAttribute(AI_HIDE_ATTR)
  el.removeAttribute(AI_FLAG_ATTR)
}
