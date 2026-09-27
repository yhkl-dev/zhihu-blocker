// AI 判定缓存 + 误判白名单。签名→判定,内容不变判定不变,无 TTL。
// chrome.storage.local(不跨设备同步;判定量大,不放 sync)。
// 不可变读写,遵循 blocklist.ts 模式。

export interface Judgment {
  /** 复用 content-sig 签名(前 256 字去空白) */
  sig: string
  /** 作者 member_hash_id,惯犯索引用。旧条目可能缺。 */
  authorId?: string
  isAd: boolean
  /** 0..1 */
  confidence: number
  reason: string
  ts: number
}

const KEY = "aiJudgments"
const WHITELIST_KEY = "aiWhitelist"
const MAX = 1000
const WHITELIST_MAX = 500

// 存储是边界:旧版本/脏数据可能残留非法条目,读回时逐条校验再放行
function isJudgment(v: unknown): v is Judgment {
  if (typeof v !== "object" || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.sig === "string" &&
    (o.authorId === undefined || typeof o.authorId === "string") &&
    typeof o.isAd === "boolean" &&
    typeof o.confidence === "number" &&
    Number.isFinite(o.confidence) &&
    typeof o.reason === "string" &&
    typeof o.ts === "number" &&
    Number.isFinite(o.ts)
  )
}

export async function loadJudgments(): Promise<Record<string, Judgment>> {
  const result = await chrome.storage.local.get(KEY)
  const raw: unknown = result[KEY]
  if (typeof raw !== "object" || raw === null) return {}
  const out: Record<string, Judgment> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (isJudgment(v)) out[k] = v
  }
  return out
}

// 串行写:并发判定同时落库时排队,消除 load-modify-write 竞态丢条目
let saveQueue: Promise<unknown> = Promise.resolve()

export function saveJudgment(j: Judgment): Promise<Record<string, Judgment>> {
  const p = saveQueue.then(() => doSave(j))
  saveQueue = p.catch(() => {})
  return p
}

async function doSave(j: Judgment): Promise<Record<string, Judgment>> {
  const map = await loadJudgments()
  const next = { ...map, [j.sig]: j }
  // LRU:超 MAX 删最旧 ts
  const entries = Object.values(next).sort((a, b) => a.ts - b.ts)
  while (entries.length > MAX) {
    const oldest = entries.shift()
    if (oldest) delete next[oldest.sig]
  }
  await chrome.storage.local.set({ [KEY]: next })
  return next
}

export async function loadWhitelist(): Promise<string[]> {
  const result = await chrome.storage.local.get(WHITELIST_KEY)
  const raw: unknown = result[WHITELIST_KEY]
  return Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string")
    : []
}

export async function addWhitelist(sig: string): Promise<string[]> {
  const list = await loadWhitelist()
  if (list.includes(sig)) return list
  const next = [...list, sig].slice(-WHITELIST_MAX)
  await chrome.storage.local.set({ [WHITELIST_KEY]: next })
  return next
}
