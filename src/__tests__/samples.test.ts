import { describe, expect, it } from "vitest"

import { addSample, loadSamples, removeSample } from "../samples"

describe("samples", () => {
  it("add 后 load 可见", async () => {
    const list = await addSample("内容A", "ad")
    expect(list).toHaveLength(1)
    expect(list[0].label).toBe("ad")
    expect(list[0].text).toBe("内容A")
    expect((await loadSamples())[0].id).toBe(list[0].id)
  })

  it("LRU 上限 50,删最旧", async () => {
    for (let i = 0; i < 55; i++) {
      await addSample(`t${i}`, "ad")
    }
    const loaded = await loadSamples()
    expect(loaded).toHaveLength(50)
    expect(loaded.some((s) => s.text === "t0")).toBe(false)
    expect(loaded.some((s) => s.text === "t54")).toBe(true)
  })

  it("remove 删除指定", async () => {
    const list = await addSample("x", "notad")
    await removeSample(list[0].id)
    expect(await loadSamples()).toHaveLength(0)
  })

  it("label 区分 ad/notad", async () => {
    await addSample("软广", "ad")
    await addSample("正常", "notad")
    const loaded = await loadSamples()
    expect(loaded.find((s) => s.text === "软广")?.label).toBe("ad")
    expect(loaded.find((s) => s.text === "正常")?.label).toBe("notad")
  })

  it("脏条目读回时过滤", async () => {
    const good = { id: "x", text: "t", label: "ad", ts: 1 }
    await chrome.storage.local.set({
      aiSamples: [good, null, "junk", { ...good, id: 42 }, { ...good, ts: NaN }]
    })
    expect(await loadSamples()).toEqual([good])
  })
})
