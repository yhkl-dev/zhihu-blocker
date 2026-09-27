// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"

import {
  AI_FLAG_ATTR,
  AI_HIDE_ATTR,
  clearAiMarks,
  fixSidebarLayout,
  flagAi,
  HIDDEN_ATTR,
  hide,
  hideAi,
  restoreLayouts,
  unhideAi,
  unhideAll
} from "../hide"

const LAYOUT_FIX_ATTR = "data-zhihu-blocker-layout-fixed"

function buildHome(): {
  container: HTMLElement
  main: HTMLElement
  sidebar: HTMLElement
} {
  document.body.innerHTML = ""
  const container = document.createElement("div")
  container.style.display = "grid"
  container.style.marginRight = "-206px"
  const main = document.createElement("div")
  const sidebar = document.createElement("aside")
  container.append(main, sidebar)
  document.body.append(container)
  return { container, main, sidebar }
}

beforeEach(() => {
  document.body.innerHTML = ""
})

describe("fixSidebarLayout", () => {
  it("负 margin grid 父:归零 + 退单列 + 打标", () => {
    const { container, sidebar } = buildHome()
    fixSidebarLayout(sidebar)
    expect(container.hasAttribute(LAYOUT_FIX_ATTR)).toBe(true)
    expect(container.style.marginRight).toBe("0px")
    expect(container.style.gridTemplateColumns).toBe("minmax(0, 1fr)")
  })

  it("双列 grid 无负 margin:退单列,不动 margin", () => {
    const { container, sidebar } = buildHome()
    container.style.marginRight = "10px"
    container.style.gridTemplateColumns = "360px 1fr"
    fixSidebarLayout(sidebar)
    expect(container.hasAttribute(LAYOUT_FIX_ATTR)).toBe(true)
    expect(container.style.gridTemplateColumns).toBe("minmax(0, 1fr)")
    expect(container.style.marginRight).toBe("10px")
  })

  it("单列正 margin 容器:不动", () => {
    const { container, sidebar } = buildHome()
    container.style.marginRight = "20px"
    fixSidebarLayout(sidebar)
    expect(container.hasAttribute(LAYOUT_FIX_ATTR)).toBe(false)
    expect(container.style.marginRight).toBe("20px")
  })

  it("非 grid 父链往上找", () => {
    const { main, sidebar } = buildHome()
    // 侧栏包一层 block 容器,再上层才是 grid
    const wrapper = document.createElement("div")
    wrapper.append(sidebar)
    main.append(wrapper)
    fixSidebarLayout(sidebar)
    expect(
      document.querySelector<HTMLElement>(`[${LAYOUT_FIX_ATTR}]`)?.style
        .marginRight
    ).toBe("0px")
  })
})

describe("restoreLayouts", () => {
  it("摘标 + 清两个 inline 属性", () => {
    const { container, sidebar } = buildHome()
    fixSidebarLayout(sidebar)
    restoreLayouts(document)
    expect(container.hasAttribute(LAYOUT_FIX_ATTR)).toBe(false)
    expect(container.style.marginRight).toBe("")
    expect(container.style.gridTemplateColumns).toBe("")
  })
})

describe("attr 操作", () => {
  it("hide/unhideAll:只动 HIDDEN_ATTR", () => {
    const a = document.createElement("div")
    const b = document.createElement("div")
    document.body.append(a, b)
    hide(a)
    hideAi(a)
    flagAi(b)
    unhideAll(document.body)
    expect(a.hasAttribute(HIDDEN_ATTR)).toBe(false)
    // AI attr 不受扰
    expect(a.hasAttribute(AI_HIDE_ATTR)).toBe(true)
    expect(b.hasAttribute(AI_FLAG_ATTR)).toBe(true)
  })

  it("clearAiMarks:只摘 AI attr,HIDDEN_ATTR 保留", () => {
    const a = document.createElement("div")
    const b = document.createElement("div")
    document.body.append(a, b)
    hide(a)
    hideAi(a)
    flagAi(b)
    clearAiMarks(document.body)
    expect(a.hasAttribute(AI_HIDE_ATTR)).toBe(false)
    expect(b.hasAttribute(AI_FLAG_ATTR)).toBe(false)
    expect(a.hasAttribute(HIDDEN_ATTR)).toBe(true)
  })

  it("hideAi 摘橙框,unhideAi 全摘", () => {
    const a = document.createElement("div")
    flagAi(a)
    hideAi(a)
    expect(a.hasAttribute(AI_FLAG_ATTR)).toBe(false)
    expect(a.hasAttribute(AI_HIDE_ATTR)).toBe(true)
    unhideAi(a)
    expect(a.hasAttribute(AI_HIDE_ATTR)).toBe(false)
  })
})
