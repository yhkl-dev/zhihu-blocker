// 本地初筛:关键词 + 软广话术。命中任一才送 LLM,省调用。
// patterns 关键词:用户填,子串匹配。
// COPY_PATTERNS 话术:内置常见软广句式,后续可配。
// 只送判不直接藏,LLM 兜底误伤。

export interface HeuristicResult {
  hit: boolean
  matches: string[]
}

export function isSuspicious(
  text: string,
  patterns: string[]
): HeuristicResult {
  if (!text || patterns.length === 0) return { hit: false, matches: [] }
  const matches: string[] = []
  for (const p of patterns) {
    if (p && text.includes(p)) matches.push(p)
  }
  return { hit: matches.length > 0, matches }
}

// 内置软广话术:夸张收益 / 种草 / 引流暗示。
export const COPY_PATTERNS: RegExp[] = [
  /亲测(有效|好用|亲测)/,
  /限时(免费|优惠|抢购|秒杀)/,
  /月入[过达超]\s*[\d万千百]/,
  /收益(惊人|翻倍|暴涨|过万)/,
  /效果(绝了|逆天|立竿见影|神奇)/,
  /加我(微信|v[x信])/,
  /私聊(领|送|了解|咨询)/,
  /免费领(取)?/,
  /戳[这这里](链接|打开)/,
  /复制[这此段]段?[文话]/,
  /点击(链接|了解|详情)/
]

export function matchesAdCopy(text: string): boolean {
  if (!text) return false
  return COPY_PATTERNS.some((re) => re.test(text))
}
