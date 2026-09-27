import { beforeEach, describe, expect, it } from "vitest"

import { defaultConfig, loadConfig, loadPatterns, saveConfig } from "../storage"

beforeEach(async () => {
  await chrome.storage.sync.set({ config: {} })
  await chrome.storage.local.set({ aiPatterns: [] })
})

describe("config", () => {
  it("无存储回落全默认", async () => {
    const cfg = await loadConfig()
    expect(cfg["feed-ads"]).toBe(true)
    expect(cfg.sidebar).toBe(true)
    expect(cfg.ads).toBe(true)
    expect(cfg.aiEnable).toBe(false)
    expect(cfg.aiConfidence).toBe(0.8)
    expect(cfg.aiMaxCallsPerSession).toBe(200)
  })

  it("部分覆盖与默认合并", async () => {
    await saveConfig({
      ...defaultConfig(),
      "feed-ads": false,
      aiEnable: true
    })
    const cfg = await loadConfig()
    expect(cfg["feed-ads"]).toBe(false)
    expect(cfg.aiEnable).toBe(true)
    expect(cfg.sidebar).toBe(true)
  })

  it("脏数据回落默认,类型错不越界", async () => {
    await chrome.storage.sync.set({
      config: {
        aiEnable: "yes",
        aiConfidence: 5,
        aiMaxCallsPerSession: "many",
        "feed-ads": "true",
        unknownField: 1
      }
    })
    const cfg = await loadConfig()
    expect(cfg.aiEnable).toBe(false)
    expect(cfg.aiConfidence).toBe(1) // 数字则 clamp
    expect(cfg.aiMaxCallsPerSession).toBe(200)
    expect(cfg["feed-ads"]).toBe(true)
  })

  it("aiConfidence 负数 clamp 到 0", async () => {
    await chrome.storage.sync.set({ config: { aiConfidence: -1 } })
    expect((await loadConfig()).aiConfidence).toBe(0)
  })
})

describe("patterns", () => {
  it("非字符串条目过滤", async () => {
    await chrome.storage.local.set({
      aiPatterns: ["加微信", 42, null, "公众号"]
    })
    expect(await loadPatterns()).toEqual(["加微信", "公众号"])
  })

  it("非数组回空", async () => {
    await chrome.storage.local.set({ aiPatterns: "junk" })
    expect(await loadPatterns()).toEqual([])
  })
})