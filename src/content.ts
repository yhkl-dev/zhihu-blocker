import type { PlasmoCSConfig } from "plasmo"

import { start } from "~src/blocker"

export const config: PlasmoCSConfig = {
  matches: ["https://www.zhihu.com/*", "https://zhihu.com/*"]
}

start()
