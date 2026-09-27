import { describe, expect, it } from "vitest"

import {
  addWhitelist,
  loadJudgments,
  loadWhitelist,
  saveJudgment,
  type Judgment
} from "../judgments"

const j = (sig: string, isAd: boolean, ts?: number): Judgment => ({
  sig,
  authorId: `author-${sig}`,
  isAd,
  confidence: 0.9,
  reason: "r",
  ts: ts ?? Number(sig)
})

describe("judgments cache", () => {
  it("save 后 load 可见", async () => {
    await saveJudgment(j("100", true))
    const map = await loadJudgments()
    expect(map["100"].isAd).toBe(true)
    expect(map["100"].authorId).toBe("author-100")
  })

  it("同 sig 覆盖", async () => {
    await saveJudgment(j("1", false))
    await saveJudgment(j("1", true))
    expect((await loadJudgments())["1"].isAd).toBe(true)
  })

  it("LRU 上限 1000 删最旧 ts", async () => {
    for (let i = 0; i < 1005; i++) {
      await saveJudgment(j(String(i), true, i))
    }
    const map = await loadJudgments()
    expect(Object.keys(map)).toHaveLength(1000)
    expect(map["0"]).toBeUndefined()
    expect(map["1004"]).toBeDefined()
  })

  it("whitelist add/load", async () => {
    await addWhitelist("s1")
    await addWhitelist("s2")
    expect(await loadWhitelist()).toEqual(["s1", "s2"])
  })

  it("whitelist 去重", async () => {
    await addWhitelist("s1")
    await addWhitelist("s1")
    expect(await loadWhitelist()).toEqual(["s1"])
  })

  it("whitelist 上限 500,新进旧出", async () => {
    for (let i = 0; i < 505; i++) {
      await addWhitelist(`w${i}`)
    }
    const list = await loadWhitelist()
    expect(list).toHaveLength(500)
    expect(list[0]).toBe("w5")
    expect(list[499]).toBe("w504")
  })

  it("脏条目读回时过滤", async () => {
    await chrome.storage.local.set({
      aiJudgments: {
        good: j("good", true, 1),
        badTs: { ...j("badTs", true), ts: "now" },
        badConf: { ...j("badConf", true), confidence: "high" },
        badIsAd: { ...j("badIsAd", true), isAd: "yes" },
        junk: 42,
        nullEntry: null
      }
    })
    const map = await loadJudgments()
    expect(Object.keys(map)).toEqual(["good"])
  })

  it("并发 save 串行落库,不丢条目", async () => {
    const p1 = saveJudgment(j("a", true, 1))
    const p2 = saveJudgment(j("b", true, 2))
    const p3 = saveJudgment(j("c", true, 3))
    await Promise.all([p1, p2, p3])
    const map = await loadJudgments()
    expect(map.a).toBeDefined()
    expect(map.b).toBeDefined()
    expect(map.c).toBeDefined()
  })
})
