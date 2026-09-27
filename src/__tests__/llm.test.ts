import { afterEach, describe, expect, it, vi } from "vitest"

import { judgeAd } from "../llm"

function stubFetch(init: {
  ok?: boolean
  status?: number
  content?: string
}): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => ({ choices: [{ message: { content: init.content } }] })
  }))
  vi.stubGlobal("fetch", fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("judgeAd", () => {
  it("无 key 不调 fetch,置信 0", async () => {
    const fn = stubFetch({})
    const j = await judgeAd("s1", "a1", "正文", "作者", "", [])
    expect(j.isAd).toBe(false)
    expect(j.confidence).toBe(0)
    expect(j.reason).toBe("no api key")
    expect(fn).not.toHaveBeenCalled()
  })

  it("正常解析:isAd/confidence/authorId 传递", async () => {
    const fn = stubFetch({
      content: '{"isAd":true,"confidence":0.95,"reason":"植入产品"}'
    })
    const j = await judgeAd("s1", "a1", "正文", "作者", "sk-test", [])
    expect(fn).toHaveBeenCalledTimes(1)
    const [url, init] = fn.mock.calls[0]
    expect(url).toContain("chat/completions")
    expect(
      (init.headers as Record<string, string>).Authorization
    ).toBe("Bearer sk-test")
    expect(j.isAd).toBe(true)
    expect(j.confidence).toBe(0.95)
    expect(j.reason).toBe("植入产品")
    expect(j.sig).toBe("s1")
    expect(j.authorId).toBe("a1")
  })

  it("confidence 越界 clamp 到 0..1", async () => {
    stubFetch({ content: '{"isAd":true,"confidence":1.7,"reason":"x"}' })
    expect((await judgeAd("s", "a", "t", "n", "k", [])).confidence).toBe(1)
  })

  it("confidence 非数字回 0", async () => {
    stubFetch({ content: '{"isAd":true,"confidence":"high","reason":"x"}' })
    expect((await judgeAd("s", "a", "t", "n", "k", [])).confidence).toBe(0)
  })

  it("isAd 非 true 一律 false", async () => {
    stubFetch({ content: '{"isAd":"yes","confidence":0.9,"reason":"x"}' })
    expect((await judgeAd("s", "a", "t", "n", "k", [])).isAd).toBe(false)
  })

  it("坏 JSON 不抛,置信 0", async () => {
    stubFetch({ content: "oops" })
    const j = await judgeAd("s", "a", "t", "n", "k", [])
    expect(j.isAd).toBe(false)
    expect(j.confidence).toBe(0)
    expect(j.reason).toBeTruthy()
  })

  it("HTTP 非 200 记状态码", async () => {
    stubFetch({ ok: false, status: 429 })
    const j = await judgeAd("s", "a", "t", "n", "k", [])
    expect(j.isAd).toBe(false)
    expect(j.reason).toBe("http 429")
  })

  it("网络异常不抛", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      })
    )
    const j = await judgeAd("s", "a", "t", "n", "k", [])
    expect(j.isAd).toBe(false)
    expect(j.confidence).toBe(0)
    expect(j.reason).toBe("network down")
  })
})