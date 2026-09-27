// 从 feed 内容卡抽作者。feed 回答/文章卡无作者链接，
// 作者信息在 data-zop（名字）+ data-za-extra-module（author_member_hash_id）。

const CONTENT_SELECTOR = ".ContentItem[data-zop]"

export interface AuthorCard {
  card: Element
  /** author_member_hash_id，稳定 hash，作黑名单 key */
  authorId: string
  name: string
}

function parseAuthorHash(card: Element): string | null {
  const raw = card.getAttribute("data-za-extra-module")
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as {
      card?: { content?: { author_member_hash_id?: string } }
    }
    return data.card?.content?.author_member_hash_id ?? null
  } catch {
    return null
  }
}

function parseAuthorName(card: Element): string {
  const raw = card.getAttribute("data-zop")
  if (!raw) return ""
  try {
    const data = JSON.parse(raw) as { authorName?: string }
    return data.authorName ?? ""
  } catch {
    return ""
  }
}

function findCards(root: ParentNode): Element[] {
  const cards: Element[] = []
  if (root instanceof Element && root.matches(CONTENT_SELECTOR)) {
    cards.push(root)
  }
  cards.push(...root.querySelectorAll(CONTENT_SELECTOR))
  return cards
}

export function findAuthorCards(root: ParentNode): AuthorCard[] {
  return findCards(root)
    .map((card) => ({
      card,
      authorId: parseAuthorHash(card) ?? "",
      name: parseAuthorName(card)
    }))
    .filter((c) => c.authorId !== "")
}
