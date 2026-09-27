import { CATEGORIES, type Category } from "~src/rules"

const STORAGE_KEY = "config"
const API_KEY_STORAGE = "deepseekApiKey"

export type Config = Record<Category, boolean> & {
  aiEnable: boolean
  /** AI 判定藏的置信阈值 0..1 */
  aiConfidence: number
  /** 单会话 LLM 调用上限,防成本爆炸 */
  aiMaxCallsPerSession: number
}

// 只收已知字段且类型合法,脏数据回落默认值
function sanitizeConfig(raw: unknown): Partial<Config> {
  if (typeof raw !== "object" || raw === null) return {}
  const o = raw as Record<string, unknown>
  const out: Partial<Config> = {}
  for (const cat of CATEGORIES) {
    if (typeof o[cat.id] === "boolean") {
      out[cat.id] = o[cat.id] as boolean
    }
  }
  if (typeof o.aiEnable === "boolean") out.aiEnable = o.aiEnable
  if (typeof o.aiConfidence === "number" && Number.isFinite(o.aiConfidence)) {
    out.aiConfidence = Math.max(0, Math.min(1, o.aiConfidence))
  }
  if (
    typeof o.aiMaxCallsPerSession === "number" &&
    Number.isFinite(o.aiMaxCallsPerSession)
  ) {
    out.aiMaxCallsPerSession = Math.max(0, Math.floor(o.aiMaxCallsPerSession))
  }
  return out
}

export async function loadConfig(): Promise<Config> {
  const result = await chrome.storage.sync.get(STORAGE_KEY)
  return { ...defaultConfig(), ...sanitizeConfig(result[STORAGE_KEY]) }
}

export async function saveConfig(config: Config): Promise<void> {
  await chrome.storage.sync.set({
    [STORAGE_KEY]: config
  })
}

export function defaultConfig(): Config {
  return {
    ...CATEGORIES.reduce(
      (acc, cat) => ({ ...acc, [cat.id]: true }),
      {} as Record<Category, boolean>
    ),
    aiEnable: false,
    aiConfidence: 0.8,
    aiMaxCallsPerSession: 200
  }
}

// API key 单独存 local:不跨设备明文同步,降低泄露面。
export async function loadApiKey(): Promise<string> {
  const result = await chrome.storage.local.get(API_KEY_STORAGE)
  const raw: unknown = result[API_KEY_STORAGE]
  return typeof raw === "string" ? raw : ""
}

export async function saveApiKey(key: string): Promise<void> {
  await chrome.storage.local.set({ [API_KEY_STORAGE]: key })
}

const PATTERNS_KEY = "aiPatterns"

export async function loadPatterns(): Promise<string[]> {
  const result = await chrome.storage.local.get(PATTERNS_KEY)
  const raw: unknown = result[PATTERNS_KEY]
  return Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string")
    : []
}

export async function savePatterns(list: string[]): Promise<void> {
  await chrome.storage.local.set({ [PATTERNS_KEY]: list })
}
