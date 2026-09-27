// 回答正文签名：抓同内容不同作者的软广。
// 取正文 textContent 去空白前 256 字。copy-paste 完全同 → 命中；
// 开头段相同 → 命中（spam 常同 intro）。

const BODY_SELECTOR = '[itemprop="text"], [itemprop="articleBody"]'
const SIG_LEN = 256

export function getSignature(card: Element): string {
  const body = card.querySelector(BODY_SELECTOR)
  const text = body?.textContent ?? card.textContent ?? ""
  return text.replace(/\s+/g, "").slice(0, SIG_LEN)
}

// LLM 判定用全文(签名只前 256 字)。抽不到回空串,调用方 null guard。
export function getFullText(card: Element): string {
  const body = card.querySelector(BODY_SELECTOR)
  return (body?.textContent ?? card.textContent ?? "").trim()
}
