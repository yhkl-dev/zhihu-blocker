// 屏蔽规则数据。单一真相：藏哪、藏啥全靠此文件。
// 选择器需对 live 站验证；知乎 A/B + 类名混淆会变，失效只改本文件不动逻辑。

export type Category = "feed-ads" | "sidebar" | "ads"

export interface Rule {
  id: string
  /** CSS 候选选择器 */
  selector: string
  /** 可选文本过滤：元素 textContent 含此串才藏。空串 = 仅靠选择器 */
  text?: string
  category: Category
  label: string
}

export const CATEGORIES: ReadonlyArray<{
  id: Category
  label: string
}> = [
  {
    id: "feed-ads",
    label: "信息流广告"
  },
  {
    id: "sidebar",
    label: "右侧推荐栏"
  },
  {
    id: "ads",
    label: "广告位"
  }
]

export const RULES: ReadonlyArray<Rule> = [
  {
    id: "feed-ad-tuiguang",
    selector: ".TopstoryCard, .Card.TopstoryCard",
    text: "推广",
    category: "feed-ads",
    label: "信息流推广卡片"
  },
  {
    id: "feed-ad-guanggao",
    selector: ".TopstoryCard, .Card.TopstoryCard",
    text: "广告",
    category: "feed-ads",
    label: "信息流广告卡片"
  },
  {
    id: "question-sidebar",
    selector: ".QuestionSideColumn",
    category: "sidebar",
    label: "问题页右侧栏"
  },
  {
    id: "home-sidebar",
    selector: '[data-za-detail-view-path-module="RightSideBar"]',
    category: "sidebar",
    label: "首页右侧栏"
  },
  {
    id: "creator-center",
    selector: ".GlobalSideBar .Card, .AppHeaderUserMenu",
    text: "创作中心",
    category: "ads",
    label: "创作中心入口"
  },
  {
    id: "trending-search",
    selector: ".HotSearchCard",
    category: "ads",
    label: "大家都在搜"
  },
  {
    // 文本子串匹配类规则一律框定侧栏容器,裸 .Card 会误伤正文卡
    id: "salt-author",
    selector: ".GlobalSideBar .Card",
    text: "盐言作者平台",
    category: "sidebar",
    label: "盐言作者平台"
  },
  {
    id: "paid-consult",
    selector: ".GlobalSideBar .Card",
    text: "付费咨询",
    category: "sidebar",
    label: "付费咨询/知乎知学堂"
  },
  {
    id: "recommend-follow",
    selector: ".GlobalSideBar .Card",
    text: "推荐关注",
    category: "sidebar",
    label: "推荐关注"
  }
]
