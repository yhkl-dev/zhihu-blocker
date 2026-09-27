// 作者黑名单存储。不可变读写,数组存 chrome.storage.local:
// sync 每 key 8KB/总 100KB 硬配额,中文名单几百条即超,local 无此限。
// 旧版本存 sync,load 时一次性迁移。

export interface BlockedAuthor {
  /** 作者 member_hash_id，抓同作者其他回答 */
  id: string
  name: string
  /** 回答正文签名，抓同内容不同作者。旧条目可能缺。 */
  sig?: string
}

const KEY = "blockedAuthors"
const MAX_BLOCKED = 500

function isBlockedAuthor(v: unknown): v is BlockedAuthor {
  if (typeof v !== "object" || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === "string" &&
    o.id !== "" &&
    typeof o.name === "string" &&
    (o.sig === undefined || typeof o.sig === "string")
  )
}

function sanitize(raw: unknown): BlockedAuthor[] {
  return Array.isArray(raw) ? raw.filter(isBlockedAuthor) : []
}

export async function loadBlocklist(): Promise<BlockedAuthor[]> {
  const localResult = await chrome.storage.local.get(KEY)
  const list = sanitize(localResult[KEY])
  const syncResult = await chrome.storage.sync.get(KEY)
  const legacy = sanitize(syncResult[KEY])
  if (legacy.length > 0) {
    // 旧版 sync 数据:local 为空则迁移过去;无论是否迁移都清 sync 残留,
    // 别让 legacy 永久占 sync 配额,也防清空 local 后"复活"
    if (list.length === 0) {
      await chrome.storage.local.set({ [KEY]: legacy })
    }
    await chrome.storage.sync.remove(KEY)
    return list.length > 0 ? list : legacy
  }
  return list
}

export async function addBlocked(
  author: BlockedAuthor
): Promise<BlockedAuthor[]> {
  const list = await loadBlocklist()
  const sig = author.sig
  const dup =
    list.some((a) => a.id === author.id) ||
    // 无 sig 条目不能 undefined===undefined 互相判重
    (typeof sig === "string" && sig !== "" && list.some((a) => a.sig === sig))
  if (dup) return list
  const next = [...list, author].slice(-MAX_BLOCKED)
  await chrome.storage.local.set({ [KEY]: next })
  return next
}

export async function removeBlocked(id: string): Promise<BlockedAuthor[]> {
  const list = await loadBlocklist()
  const next = list.filter((a) => a.id !== id)
  await chrome.storage.local.set({ [KEY]: next })
  return next
}

export async function clearBlocklist(): Promise<void> {
  await chrome.storage.local.set({ [KEY]: [] })
}

export function toIdSet(list: BlockedAuthor[]): Set<string> {
  return new Set(list.map((a) => a.id))
}

export function toSigSet(list: BlockedAuthor[]): Set<string> {
  return new Set(list.map((a) => a.sig).filter((s): s is string => !!s))
}
