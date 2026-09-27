import { findAuthorCards } from "~src/author"
import {
  applyBlocklist,
  injectBlockButtons,
  injectFlagButtons,
  injectSampleButtons,
  removeFlagButtons,
  type SampleInput
} from "~src/author-block"
import {
  addBlocked,
  loadBlocklist,
  toIdSet,
  toSigSet,
  type BlockedAuthor
} from "~src/blocklist"
import { getFullText, getSignature } from "~src/content-sig"
import { isSuspicious, matchesAdCopy } from "~src/heuristic"
import {
  clearAiMarks,
  ensureStyle,
  fixSidebarLayout,
  flagAi,
  hide,
  hideAi,
  restoreLayouts,
  unhideAi,
  unhideAll
} from "~src/hide"
import {
  addWhitelist,
  loadJudgments,
  loadWhitelist,
  saveJudgment,
  type Judgment
} from "~src/judgments"
import { RULES, type Category } from "~src/rules"
import { addSample } from "~src/samples"
import { loadConfig, loadPatterns, type Config } from "~src/storage"

type Action = "hide" | "flag" | "pass"

function isTextMatch(el: Element, text: string): boolean {
  return text === "" || el.textContent?.includes(text) === true
}

function applyTo(
  root: ParentNode,
  rules: ReadonlyArray<(typeof RULES)[number]>
): void {
  for (const rule of rules) {
    root.querySelectorAll(rule.selector).forEach((el) => {
      if (isTextMatch(el, rule.text ?? "")) {
        hide(el)
        // 侧栏藏掉后父级双列布局退单列,主列占满不贴左
        if (rule.category === "sidebar") fixSidebarLayout(el)
      }
    })
  }
}

function hideIfMatches(
  el: Element,
  rules: ReadonlyArray<(typeof RULES)[number]>
): void {
  for (const rule of rules) {
    if (el.matches(rule.selector) && isTextMatch(el, rule.text ?? "")) {
      hide(el)
      if (rule.category === "sidebar") fixSidebarLayout(el)
    }
  }
}

function activeRules(config: Config): typeof RULES {
  return RULES.filter((rule) => config[rule.category as Category] === true)
}

function buildAuthorAdSet(map: Record<string, Judgment>): Set<string> {
  return new Set(
    Object.values(map)
      .filter((j) => j.isAd && j.authorId)
      .map((j) => j.authorId as string)
  )
}

let idSet: Set<string> = new Set()
let sigSet: Set<string> = new Set()
let judgmentMap: Record<string, Judgment> = {}
let whitelistSet: Set<string> = new Set()
let authorAdSet: Set<string> = new Set()
let aiEnable = false
let confidenceThreshold = 0.8
let patterns: string[] = []
// 配置变更时更新,onMutations 闭包读它,避免用启动时快照
let rules: ReadonlyArray<(typeof RULES)[number]> = []
const pendingSigs = new Set<string>()

function onBlock(author: BlockedAuthor, btn: HTMLButtonElement): void {
  void addBlocked(author)
    .then((list) => {
      idSet = toIdSet(list)
      sigSet = toSigSet(list)
      applyBlocklist(document, idSet, sigSet)
    })
    .catch(() => flashBtnError(btn))
}

// 存储写失败(配额/异常)就地反馈,别让用户以为操作成功。
// 每按钮带序号 token:连点两次只有最后一次 timer 能复原,防旧 timer 用错的原文盖回
function flashBtnError(btn: HTMLButtonElement): void {
  btn.dataset.flashText = btn.dataset.flashText ?? btn.textContent ?? ""
  btn.textContent = "失败"
  btn.style.color = "#f53f3f"
  const seq = Number(btn.dataset.flashSeq ?? "0") + 1
  btn.dataset.flashSeq = String(seq)
  setTimeout(() => {
    if (Number(btn.dataset.flashSeq) !== seq) return
    btn.textContent = btn.dataset.flashText ?? ""
    btn.style.color = ""
    delete btn.dataset.flashSeq
    delete btn.dataset.flashText
  }, 2000)
}

// flag 卡 [藏了]:判定置信拉满落库,作者进惯犯集,当场藏
function onFlagHide(
  card: Element,
  sig: string,
  authorId: string,
  btn: HTMLButtonElement
): void {
  void saveJudgment({
    sig,
    authorId,
    isAd: true,
    confidence: 1,
    reason: "用户确认",
    ts: Date.now()
  })
    .then((map) => {
      judgmentMap = map
      authorAdSet = buildAuthorAdSet(map)
      hideAi(card)
      removeFlagButtons(card)
    })
    .catch(() => flashBtnError(btn))
}

// flag 卡 [正常]:进白名单解标。storage 监听会兜底同步其他卡
function onFlagNormal(
  card: Element,
  sig: string,
  btn: HTMLButtonElement
): void {
  unhideAi(card)
  removeFlagButtons(card)
  void addWhitelist(sig).catch(() => flashBtnError(btn))
}

function onSample(s: SampleInput, btn: HTMLButtonElement): void {
  void addSample(s.text, s.label).catch(() => flashBtnError(btn))
}

async function loadAiState(): Promise<void> {
  const [map, wl, cfg, pats] = await Promise.all([
    loadJudgments(),
    loadWhitelist(),
    loadConfig(),
    loadPatterns()
  ])
  judgmentMap = map
  whitelistSet = new Set(wl)
  authorAdSet = buildAuthorAdSet(map)
  aiEnable = cfg.aiEnable
  confidenceThreshold = cfg.aiConfidence
  patterns = pats
}

function applyAiCards(root: ParentNode): void {
  if (!aiEnable) return
  for (const { card, authorId, name } of findAuthorCards(root)) {
    const sig = getSignature(card)
    if (sig === "") continue
    if (whitelistSet.has(sig)) {
      unhideAi(card)
      removeFlagButtons(card)
      continue
    }
    const cached = judgmentMap[sig]
    if (cached) {
      if (cached.isAd) {
        if (cached.confidence >= confidenceThreshold) {
          hideAi(card)
          removeFlagButtons(card)
        } else {
          flagAi(card)
          injectFlagButtons(card, onFlagHide, onFlagNormal)
        }
      }
      continue
    }
    if (pendingSigs.has(sig)) continue
    const text = getFullText(card)
    if (!text) continue
    // 三路任一命中送判:关键词 / 软广话术 / 惯犯作者
    if (
      !isSuspicious(text, patterns).hit &&
      !matchesAdCopy(text) &&
      !(authorId !== "" && authorAdSet.has(authorId))
    ) {
      continue
    }
    pendingSigs.add(sig)
    void chrome.runtime
      .sendMessage({
        type: "judge",
        sig,
        authorId,
        text,
        authorName: name || authorId
      })
      .then((resp) => {
        pendingSigs.delete(sig)
        const r = resp as
          | { action: Action; judgment: Judgment | null }
          | undefined
        if (!r || typeof r.action !== "string") return
        if (r.judgment) {
          judgmentMap[sig] = r.judgment
          if (r.judgment.isAd && r.judgment.authorId) {
            authorAdSet.add(r.judgment.authorId)
          }
        }
        applyAiAction(sig, r.action)
      })
      .catch(() => {
        // SW 被杀/消息端口关闭等:必删 pendingSigs,否则该卡本会话不再送判
        pendingSigs.delete(sig)
      })
  }
}

function applyAiAction(sig: string, action: Action): void {
  for (const { card } of findAuthorCards(document)) {
    if (getSignature(card) !== sig) continue
    if (action === "hide") {
      hideAi(card)
      removeFlagButtons(card)
    } else if (action === "flag") {
      flagAi(card)
      injectFlagButtons(card, onFlagHide, onFlagNormal)
    }
  }
}

function onMutations(
  mutations: MutationRecord[],
  rules: ReadonlyArray<(typeof RULES)[number]>
): void {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue
      const el = node as Element
      hideIfMatches(el, rules)
      applyTo(el, rules)
      applyBlocklist(el, idSet, sigSet)
      applyAiCards(el)
      injectBlockButtons(el, onBlock)
      injectSampleButtons(el, onSample)
      injectFlagButtons(el, onFlagHide, onFlagNormal)
    }
  }
}

export function start(): void {
  ensureStyle()
  void Promise.all([
    loadConfig(),
    loadBlocklist(),
    loadJudgments(),
    loadWhitelist(),
    loadPatterns()
  ]).then(([config, blocked, map, wl, pats]) => {
    rules = activeRules(config)
    idSet = toIdSet(blocked)
    sigSet = toSigSet(blocked)
    judgmentMap = map
    whitelistSet = new Set(wl)
    authorAdSet = buildAuthorAdSet(map)
    aiEnable = config.aiEnable
    confidenceThreshold = config.aiConfidence
    patterns = pats
    applyTo(document, rules)
    applyBlocklist(document, idSet, sigSet)
    applyAiCards(document)
    injectBlockButtons(document, onBlock)
    injectSampleButtons(document, onSample)
    injectFlagButtons(document, onFlagHide, onFlagNormal)
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.blockedAuthors) {
        const list = (changes.blockedAuthors.newValue as BlockedAuthor[]) ?? []
        idSet = toIdSet(list)
        sigSet = toSigSet(list)
        applyBlocklist(document, idSet, sigSet)
      }
      if (changes.config) {
        // 分类开关变了:摘全部规则隐藏 attr,按新配置全量重扫。
        // 布局修复先复原;重扫后 sidebar 类仍开则重新标。
        void loadConfig().then((cfg) => {
          rules = activeRules(cfg)
          restoreLayouts(document)
          unhideAll(document)
          applyTo(document, rules)
        })
      }
      if (
        changes.config ||
        changes.aiJudgments ||
        changes.aiWhitelist ||
        changes.aiPatterns
      ) {
        void loadAiState().then(() => {
          if (!aiEnable) {
            // 关 AI:摘橙框/已藏 + flag 按钮,不碰规则和黑名单的隐藏
            clearAiMarks(document)
            removeFlagButtons(document)
          }
          applyAiCards(document)
        })
      }
    })
    const observer = new MutationObserver((muts) => onMutations(muts, rules))
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  })
}
