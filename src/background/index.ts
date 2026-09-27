// Plasmo background service worker(MV3)。
// content script 经 chrome.runtime.sendMessage 调本 worker 调 DeepSeek,
// 避免 content 跨域 + key 暴露页面上下文。
import {
  loadJudgments,
  loadWhitelist,
  saveJudgment,
  type Judgment
} from "~src/judgments"
import { judgeAd } from "~src/llm"
import { loadSamples } from "~src/samples"
import { loadApiKey, loadConfig } from "~src/storage"

type Action = "hide" | "flag" | "pass"

interface JudgeMessage {
  type: "judge"
  sig: string
  authorId: string
  text: string
  authorName: string
}

interface JudgeResponse {
  judgment: Judgment | null
  action: Action
  reason: string
}

interface StatsResponse {
  callCount: number
  maxCalls: number
  hasKey: boolean
  aiEnable: boolean
  /** 最近一次 LLM 调用失败原因,成功即清 */
  lastError: string | null
}

// 内存态:SW 休眠会丢。callCount 用内存原子计数 + session 快照恢复跨休眠。
let judgmentMap: Record<string, Judgment> = {}
let whitelistSet: Set<string> = new Set()
let aiEnable = false
let hasKey = false
let confidenceThreshold = 0.8
let maxCalls = 200
let callCount = 0
const inFlight = new Map<string, Promise<JudgeResponse>>()
const SESSION_KEY = "aiCallCount"
const LAST_ERROR_KEY = "aiLastError"

let lastError: string | null = null

async function restoreLastError(): Promise<void> {
  const r = await chrome.storage.local.get(LAST_ERROR_KEY)
  const raw: unknown = r[LAST_ERROR_KEY]
  lastError = typeof raw === "string" ? raw : null
}

// key 错/欠费/网络挂静默失败,用户无从察觉。记下来给 popup 展示
function recordAiError(reason: string): void {
  lastError = reason
  void chrome.storage.local.set({ [LAST_ERROR_KEY]: reason })
}

function clearAiError(): void {
  if (lastError === null) return
  lastError = null
  void chrome.storage.local.remove(LAST_ERROR_KEY)
}

async function restoreCallCount(): Promise<void> {
  const r = await chrome.storage.session.get(SESSION_KEY)
  callCount = (r[SESSION_KEY] as number | undefined) ?? 0
}

function incCallCount(): void {
  // 内存++ 同步原子,消除 read-modify-write 竞态;session 异步快照持久跨休眠。
  callCount++
  void chrome.storage.session.set({ [SESSION_KEY]: callCount })
}

// 外部消息走边界:逐字段校验,不裸转
function isJudgeMessage(m: unknown): m is JudgeMessage {
  if (typeof m !== "object" || m === null) return false
  const o = m as Record<string, unknown>
  return (
    o.type === "judge" &&
    typeof o.sig === "string" &&
    typeof o.authorId === "string" &&
    typeof o.text === "string" &&
    typeof o.authorName === "string"
  )
}

async function refreshState(): Promise<void> {
  const [map, wl, cfg, key] = await Promise.all([
    loadJudgments(),
    loadWhitelist(),
    loadConfig(),
    loadApiKey()
  ])
  judgmentMap = map
  whitelistSet = new Set(wl)
  aiEnable = cfg.aiEnable
  confidenceThreshold = cfg.aiConfidence
  maxCalls = cfg.aiMaxCallsPerSession
  hasKey = key !== ""
  await Promise.all([restoreCallCount(), restoreLastError()])
}

void refreshState()
chrome.storage.onChanged.addListener(() => {
  void refreshState()
})

function actionFor(j: Judgment): Action {
  if (!j.isAd) return "pass"
  return j.confidence >= confidenceThreshold ? "hide" : "flag"
}

async function handleJudge(m: JudgeMessage): Promise<JudgeResponse> {
  if (whitelistSet.has(m.sig)) {
    return { judgment: null, action: "pass", reason: "whitelisted" }
  }
  const cached = judgmentMap[m.sig]
  if (cached) {
    return { judgment: cached, action: actionFor(cached), reason: "cached" }
  }
  if (!aiEnable || !hasKey) {
    return { judgment: null, action: "pass", reason: "ai disabled or no key" }
  }
  // 并发去重:同 sig 不重复发
  const existing = inFlight.get(m.sig)
  if (existing) return existing
  if (callCount >= maxCalls) {
    return { judgment: null, action: "pass", reason: "session limit" }
  }
  // 预占:发起即计数,并发在途调用不绕上限
  incCallCount()
  const p = (async (): Promise<JudgeResponse> => {
    const [key, samples] = await Promise.all([loadApiKey(), loadSamples()])
    const j = await judgeAd(
      m.sig,
      m.authorId,
      m.text,
      m.authorName,
      key,
      samples
    )
    // 置信 0 且非软广 = 调用失败(HTTP 错/解析错/网络),"no api key" 走 stats 未填提示
    if (!j.isAd && j.confidence === 0 && j.reason !== "no api key") {
      recordAiError(j.reason)
    } else {
      clearAiError()
    }
    judgmentMap = await saveJudgment(j)
    return { judgment: j, action: actionFor(j), reason: "fresh" }
  })().finally(() => {
    inFlight.delete(m.sig)
  })
  inFlight.set(m.sig, p)
  return p
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (isJudgeMessage(msg)) {
    void handleJudge(msg).then(sendResponse)
    return true // 保持 channel 等异步响应
  }
  if (msg?.type === "stats") {
    void (async (): Promise<void> => {
      const resp: StatsResponse = {
        callCount,
        maxCalls,
        hasKey,
        aiEnable,
        lastError
      }
      sendResponse(resp)
    })()
    return true
  }
  return
})
