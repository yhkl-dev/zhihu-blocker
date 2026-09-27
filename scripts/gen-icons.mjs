// 从 assets/icon.svg 生成各尺寸 PNG。
// assets/icon.png (512) 是 Plasmo 约定的主图标,构建时自动生成 manifest icons;
// icon-128.png 供 Chrome Web Store 上架用。
import { mkdir } from "node:fs/promises"
import path from "node:path"

import sharp from "sharp"

const root = path.resolve(import.meta.dirname, "..")
const svg = path.join(root, "assets/icon.svg")
const outDir = path.join(root, "assets")

const sizes = [16, 32, 48, 128, 512]

await mkdir(outDir, { recursive: true })
for (const s of sizes) {
  const file = s === 512 ? "icon.png" : `icon-${s}.png`
  await sharp(svg).resize(s, s).png().toFile(path.join(outDir, file))
  console.log(`generated assets/${file}`)
}