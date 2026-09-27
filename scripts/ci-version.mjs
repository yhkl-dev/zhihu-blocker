// CI 版本同步:tag 与 package.json 版本保持同步,PR 合并到 main 后自动升版本。
// 规则:
//   - 已存在 v{当前版本} 的 tag → 读 tag..HEAD 提交类型升级版本并写回 package.json:
//     含 feat 或 BREAKING:minor(+1, patch 归零);BREAKING 或 feat!:major;否则 patch。
//   - tag 不存在 → 基线,不动版本(首次发布按当前版本打 tag)。
// 版本唯一真相是 package.json;tag 由 workflow 按它打,Chrome 商店按它识别新版本。

import { execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"

const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const current = pkg.version

const tags = execSync("git tag --list 'v*'", { encoding: "utf8" })
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean)

const tag = `v${current}`
if (!tags.includes(tag)) {
  console.log(`baseline: ${tag} missing, keep version ${current}`)
  process.exit(0)
}

const [major, minor, patch] = current.split(".").map(Number)
const cmp = (a, b) => {
  const pa = a.slice(1).split(".").map(Number)
  const pb = b.slice(1).split(".").map(Number)
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2]
}
const lastTag = [...tags].sort(cmp).at(-1)

const subjects = execSync(`git log --format=%s ${lastTag}..HEAD`, {
  encoding: "utf8"
})
  .split("\n")
  .filter(Boolean)

const hasBreaking = subjects.some(
  (s) => /^feat.*!:/.test(s) || s.includes("BREAKING CHANGE")
)
const hasFeat = subjects.some((s) => /^feat/.test(s))

const next = hasBreaking
  ? `${major + 1}.0.0`
  : hasFeat
    ? `${major}.${minor + 1}.0`
    : `${major}.${minor}.${patch + 1}`

pkg.version = next
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n")
console.log(`bumped ${current} -> ${next} (breaking:${hasBreaking} feat:${hasFeat})`)