import { describe, expect, it } from "vitest"

import { CATEGORIES, RULES } from "../rules"

describe("rules 完整性", () => {
  it("id 唯一", () => {
    const ids = RULES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("selector 非空,类别合法", () => {
    const catIds = new Set(CATEGORIES.map((c) => c.id))
    for (const r of RULES) {
      expect(r.selector.trim()).not.toBe("")
      expect(catIds.has(r.category)).toBe(true)
    }
  })

  it("文本子串匹配规则不用裸 .Card/.Popover 兜全场", () => {
    for (const r of RULES) {
      if (!r.text) continue
      const tokens = r.selector.split(",").map((s) => s.trim())
      expect(tokens).not.toContain(".Card")
      expect(tokens).not.toContain(".Popover")
    }
  })
})