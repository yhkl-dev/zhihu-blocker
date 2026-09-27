// DeepSeek 调用纯函数。OpenAI 兼容。
// 仅 background service worker 调用:避免 content script 跨域 + key 暴露页面上下文。
import type { Judgment } from "~src/judgments"
import type { Sample } from "~src/samples"

const ENDPOINT = "https://api.deepseek.com/chat/completions"
const MODEL = "deepseek-chat"
const MAX_INPUT = 2000
const SAMPLE_TEXT_LEN = 300
const SAMPLE_PER_LABEL = 5
const TIMEOUT_MS = 10000

const BASE_SYSTEM = `你判定知乎回答是否软广。软广=伪装成经验/科普,实为推广产品/服务/引流。
看:植入产品名、留联系方式(微信/公众号/QQ)、诱导私聊/点击、夸张营销话术。
输出严格 JSON:{"isAd":boolean,"confidence":0-1浮点,"reason":"一句话理由"}。
confidence=判定把握程度,非广告嫌疑程度。正常经验分享→isAd=false,confidence高。`

function fewShotBlock(samples: Sample[]): string {
  if (samples.length === 0) return ""
  const ads = samples
    .filter((s) => s.label === "ad")
    .slice(0, SAMPLE_PER_LABEL)
    .map((s) => s.text.slice(0, SAMPLE_TEXT_LEN))
    .join("\n---\n")
  const notads = samples
    .filter((s) => s.label === "notad")
    .slice(0, SAMPLE_PER_LABEL)
    .map((s) => s.text.slice(0, SAMPLE_TEXT_LEN))
    .join("\n---\n")
  return `\n\n参考示例(照此标准判定):
软举示例:
${ads || "无"}

非软举示例:
${notads || "无"}`
}

interface LlmResponse {
  isAd: boolean
  confidence: number
  reason: string
}

export async function judgeAd(
  sig: string,
  authorId: string,
  text: string,
  authorName: string,
  apiKey: string,
  samples: Sample[]
): Promise<Judgment> {
  const ts = Date.now()
  if (!apiKey) {
    return { sig, authorId, isAd: false, confidence: 0, reason: "no api key", ts }
  }
  const system = BASE_SYSTEM + fewShotBlock(samples)
  const user = `作者:${authorName || "未知"}\n回答:\n${text.slice(0, MAX_INPUT)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 200
      }),
      signal: controller.signal
    })
    if (!res.ok) {
      return { sig, authorId, isAd: false, confidence: 0, reason: `http ${res.status}`, ts }
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const raw = data.choices?.[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(raw) as LlmResponse
    return {
      sig,
      authorId,
      isAd: parsed.isAd === true,
      confidence: clamp(parsed.confidence),
      reason: parsed.reason ?? "",
      ts
    }
  } catch (e) {
    return {
      sig,
      authorId,
      isAd: false,
      confidence: 0,
      reason: e instanceof Error ? e.message : "fetch error",
      ts
    }
  } finally {
    clearTimeout(timer)
  }
}

function clamp(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}
