import { beforeEach } from "vitest"

// 内存 mock chrome.storage,跨 test 隔离(beforeEach 清空)。
const localStore: Record<string, unknown> = {}
const sessionStore: Record<string, unknown> = {}
const syncStore: Record<string, unknown> = {}

function makeArea(store: Record<string, unknown>) {
  return {
    get(keys: string | string[] | null) {
      const arr =
        keys == null ? Object.keys(store) : Array.isArray(keys) ? keys : [keys]
      const out: Record<string, unknown> = {}
      for (const k of arr) if (k in store) out[k] = store[k]
      return Promise.resolve(out)
    },
    set(items: Record<string, unknown>) {
      Object.assign(store, items)
      return Promise.resolve()
    },
    remove(keys: string | string[]) {
      const arr = Array.isArray(keys) ? keys : [keys]
      for (const k of arr) delete store[k]
      return Promise.resolve()
    }
  }
}

globalThis.chrome = {
  storage: {
    local: makeArea(localStore),
    session: makeArea(sessionStore),
    sync: makeArea(syncStore),
    onChanged: { addListener: () => {}, removeListener: () => {} }
  },
  runtime: {
    sendMessage: () => Promise.resolve(),
    onMessage: { addListener: () => {} }
  }
} as unknown as typeof chrome

beforeEach(() => {
  for (const k of Object.keys(localStore)) delete localStore[k]
  for (const k of Object.keys(sessionStore)) delete sessionStore[k]
  for (const k of Object.keys(syncStore)) delete syncStore[k]
})
