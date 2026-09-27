import { describe, it, expect } from "vitest"

import { isSuspicious, matchesAdCopy } from "../heuristic"

describe("isSuspicious", () => {
  it("命中关键词返 hit true", () => {
    expect(isSuspicious("加微信领资料", ["加微信"]).hit).toBe(true)
  })

  it("无关键词放行", () => {
    expect(isSuspicious("正常经验分享", ["加微信"]).hit).toBe(false)
  })

  it("空 patterns 放行", () => {
    expect(isSuspicious("任意内容", []).hit).toBe(false)
  })

  it("空文本放行", () => {
    expect(isSuspicious("", ["加微信"]).hit).toBe(false)
  })

  it("matches 记命中词", () => {
    const r = isSuspicious("加微信和公众号", ["加微信", "公众号"])
    expect(r.matches).toEqual(["加微信", "公众号"])
  })
})

describe("matchesAdCopy", () => {
  it("月入话术命中", () => {
    expect(matchesAdCopy("月入过万不是梦")).toBe(true)
  })

  it("限时话术命中", () => {
    expect(matchesAdCopy("限时免费领取")).toBe(true)
  })

  it("正常内容不命中", () => {
    expect(matchesAdCopy("今天天气不错")).toBe(false)
  })

  it("空文本不命中", () => {
    expect(matchesAdCopy("")).toBe(false)
  })
})
