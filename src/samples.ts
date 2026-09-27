// few-shot 样本库。用户标注软广/非软广,注入 LLM prompt 提准度。
// chrome.storage.local,上限 50(LRU by ts,新在前删尾)。不可变读写。

export interface Sample {
  id: string
  text: string
  label: "ad" | "notad"
  note?: string
  ts: number
}

const KEY = "aiSamples"
const MAX = 50

function isSample(v: unknown): v is Sample {
  if (typeof v !== "object" || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === "string" &&
    typeof o.text === "string" &&
    (o.label === "ad" || o.label === "notad") &&
    (o.note === undefined || typeof o.note === "string") &&
    typeof o.ts === "number" &&
    Number.isFinite(o.ts)
  )
}

export async function loadSamples(): Promise<Sample[]> {
  const result = await chrome.storage.local.get(KEY)
  const raw: unknown = result[KEY]
  return Array.isArray(raw) ? raw.filter(isSample) : []
}

export async function addSample(
  text: string,
  label: Sample["label"],
  note?: string
): Promise<Sample[]> {
  const list = await loadSamples()
  const next = [
    { id: crypto.randomUUID(), text, label, note, ts: Date.now() },
    ...list
  ]
  while (next.length > MAX) next.pop()
  await chrome.storage.local.set({ [KEY]: next })
  return next
}

export async function removeSample(id: string): Promise<Sample[]> {
  const list = await loadSamples()
  const next = list.filter((s) => s.id !== id)
  await chrome.storage.local.set({ [KEY]: next })
  return next
}
