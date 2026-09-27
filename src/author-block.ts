// 作者黑名单应用 + 屏蔽按钮 + 样本标注按钮 + flag 卡确认按钮注入。
// 按钮塞进 ContentItem-actions 行。样式走 hide.ts 注入的 .zb-btn class。

import { findAuthorCards } from "~src/author"
import { type BlockedAuthor } from "~src/blocklist"
import { getFullText, getSignature } from "~src/content-sig"
import { AI_FLAG_ATTR, hideAuthorCard, unhideAuthorCard } from "~src/hide"

const BLOCK_BTN_ATTR = "data-zhihu-blocker-btn"
const SAMPLE_BTN_ATTR = "data-zhihu-blocker-sample-btn"
const FLAG_BTN_ATTR = "data-zhihu-blocker-flag-btn"
const ACTIONS_SELECTOR = ".ContentItem-actions"

export function applyBlocklist(
  root: ParentNode,
  idSet: ReadonlySet<string>,
  sigSet: ReadonlySet<string>
): void {
  for (const { card, authorId } of findAuthorCards(root)) {
    const sig = getSignature(card)
    if (idSet.has(authorId) || sigSet.has(sig)) {
      hideAuthorCard(card)
    } else {
      unhideAuthorCard(card)
    }
  }
}

export function injectBlockButtons(
  root: ParentNode,
  onBlock: (author: BlockedAuthor, btn: HTMLButtonElement) => void
): void {
  for (const { card, authorId, name } of findAuthorCards(root)) {
    if (card.querySelector(`[${BLOCK_BTN_ATTR}]`)) continue
    const actions = card.querySelector(ACTIONS_SELECTOR)
    if (!actions) continue
    const sig = getSignature(card)
    const btn = document.createElement("button")
    btn.type = "button"
    btn.textContent = "屏蔽"
    btn.setAttribute(BLOCK_BTN_ATTR, "1")
    btn.title = `屏蔽 ${name || authorId} 及相似内容`
    btn.className = "zb-btn"
    btn.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      onBlock({ id: authorId, name, sig }, btn)
    })
    actions.append(btn)
  }
}

// 橙框卡补闭环:[藏了]=置信拉满直接藏,[正常]=进白名单解标。
// 只在带 AI_FLAG_ATTR 的卡上注入,解标/藏掉后按钮随 attr 一起摘。
export function injectFlagButtons(
  root: ParentNode,
  onHide: (
    card: Element,
    sig: string,
    authorId: string,
    btn: HTMLButtonElement
  ) => void,
  onNormal: (card: Element, sig: string, btn: HTMLButtonElement) => void
): void {
  for (const { card, authorId } of findAuthorCards(root)) {
    if (!card.hasAttribute(AI_FLAG_ATTR)) continue
    if (card.querySelector(`[${FLAG_BTN_ATTR}]`)) continue
    const actions = card.querySelector(ACTIONS_SELECTOR)
    if (!actions) continue
    const sig = getSignature(card)
    if (sig === "") continue
    const makeBtn = (
      text: string,
      cls: string,
      handler: (btn: HTMLButtonElement) => void
    ): HTMLButtonElement => {
      const btn = document.createElement("button")
      btn.type = "button"
      btn.textContent = text
      btn.setAttribute(FLAG_BTN_ATTR, "1")
      btn.className = cls
      btn.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        handler(btn)
      })
      return btn
    }
    actions.append(
      makeBtn("藏了", "zb-btn zb-btn-danger", (btn) =>
        onHide(card, sig, authorId, btn)
      )
    )
    actions.append(
      makeBtn("正常", "zb-btn zb-btn-ok", (btn) => onNormal(card, sig, btn))
    )
  }
}

// 移掉 root 内全部 flag 按钮:卡解标(或关 AI 清标)后按钮不能变成孤儿
export function removeFlagButtons(root: ParentNode): void {
  for (const btn of root.querySelectorAll(`[${FLAG_BTN_ATTR}]`)) {
    btn.remove()
  }
}

export interface SampleInput {
  text: string
  label: "ad" | "notad"
}

// 注入"软广/非软广"标注按钮,点击抽全文回调。供 few-shot 样本库。
export function injectSampleButtons(
  root: ParentNode,
  onSample: (s: SampleInput, btn: HTMLButtonElement) => void
): void {
  for (const { card } of findAuthorCards(root)) {
    if (card.querySelector(`[${SAMPLE_BTN_ATTR}]`)) continue
    const actions = card.querySelector(ACTIONS_SELECTOR)
    if (!actions) continue
    for (const label of ["ad", "notad"] as const) {
      const btn = document.createElement("button")
      btn.type = "button"
      btn.textContent = label === "ad" ? "软广" : "非软广"
      btn.setAttribute(SAMPLE_BTN_ATTR, "1")
      btn.dataset.label = label
      btn.title = label === "ad" ? "标为软广样本" : "标为非软广样本"
      btn.className = "zb-btn"
      btn.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        const text = getFullText(card)
        if (!text) return
        onSample({ text, label }, btn)
      })
      actions.append(btn)
    }
  }
}
