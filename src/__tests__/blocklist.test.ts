import { describe, expect, it } from "vitest"

import {
  addBlocked,
  clearBlocklist,
  loadBlocklist,
  removeBlocked,
  toIdSet,
  toSigSet
} from "../blocklist"

describe("blocklist", () => {
  it("add 后 load 可见", async () => {
    const list = await addBlocked({ id: "a1", name: "作者A", sig: "sig1" })
    expect(list).toHaveLength(1)
    expect((await loadBlocklist())[0].name).toBe("作者A")
  })

  it("同 id 去重", async () => {
    await addBlocked({ id: "a1", name: "作者A", sig: "sig1" })
    const list = await addBlocked({ id: "a1", name: "作者A", sig: "sig2" })
    expect(list).toHaveLength(1)
  })

  it("同 sig 去重(同内容不同作者)", async () => {
    await addBlocked({ id: "a1", name: "作者A", sig: "sig1" })
    const list = await addBlocked({ id: "a2", name: "作者B", sig: "sig1" })
    expect(list).toHaveLength(1)
  })

  it("remove 删除指定", async () => {
    await addBlocked({ id: "a1", name: "作者A", sig: "sig1" })
    await addBlocked({ id: "a2", name: "作者B", sig: "sig2" })
    const list = await removeBlocked("a1")
    expect(list.map((a) => a.id)).toEqual(["a2"])
  })

  it("clear 清空", async () => {
    await addBlocked({ id: "a1", name: "作者A", sig: "sig1" })
    await clearBlocklist()
    expect(await loadBlocklist()).toEqual([])
  })

  it("toIdSet/toSigSet 过滤空 sig", async () => {
    await addBlocked({ id: "a1", name: "作者A", sig: "sig1" })
    await addBlocked({ id: "a2", name: "作者B", sig: "" })
    const list = await loadBlocklist()
    expect(toIdSet(list)).toEqual(new Set(["a1", "a2"]))
    expect(toSigSet(list)).toEqual(new Set(["sig1"]))
  })

  it("脏数据读回时过滤", async () => {
    await chrome.storage.local.set({
      blockedAuthors: [
        { id: "a1", name: "ok" },
        { id: "", name: "" },
        null,
        "junk",
        { name: "no-id" },
        { id: "a2", name: 42 }
      ]
    })
    const list = await loadBlocklist()
    expect(list.map((a) => a.id)).toEqual(["a1"])
  })

  it("旧版 sync 数据迁移到 local 并删残留", async () => {
    await chrome.storage.sync.set({
      blockedAuthors: [{ id: "a1", name: "n", sig: "s1" }]
    })
    const list = await loadBlocklist()
    expect(list.map((a) => a.id)).toEqual(["a1"])
    const local = await chrome.storage.local.get("blockedAuthors")
    expect(Array.isArray(local.blockedAuthors)).toBe(true)
    const sync = await chrome.storage.sync.get("blockedAuthors")
    expect(sync.blockedAuthors).toBeUndefined()
  })

  it("local 有数据时优先 local,sync 残留照清", async () => {
    await chrome.storage.local.set({
      blockedAuthors: [{ id: "local1", name: "n" }]
    })
    await chrome.storage.sync.set({
      blockedAuthors: [{ id: "sync1", name: "n" }]
    })
    const list = await loadBlocklist()
    expect(list.map((a) => a.id)).toEqual(["local1"])
    const sync = await chrome.storage.sync.get("blockedAuthors")
    expect(sync.blockedAuthors).toBeUndefined()
  })

  it("上限 500,新进旧出", async () => {
    for (let i = 0; i < 505; i++) {
      await addBlocked({ id: `a${i}`, name: `n${i}` })
    }
    const list = await loadBlocklist()
    expect(list).toHaveLength(500)
    expect(list[0].id).toBe("a5")
    expect(list[499].id).toBe("a504")
  })
})
