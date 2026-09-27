import { useEffect, useState } from "react"

import {
  clearBlocklist,
  loadBlocklist,
  removeBlocked,
  type BlockedAuthor
} from "~src/blocklist"
import {
  addWhitelist,
  loadJudgments,
  loadWhitelist,
  type Judgment
} from "~src/judgments"
import { CATEGORIES } from "~src/rules"
import { addSample, loadSamples, removeSample, type Sample } from "~src/samples"
import {
  defaultConfig,
  loadApiKey,
  loadConfig,
  loadPatterns,
  saveApiKey,
  saveConfig,
  savePatterns,
  type Config
} from "~src/storage"

function useConfig() {
  const [config, setConfig] = useState<Config>(defaultConfig)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void loadConfig().then((c) => {
      setConfig(c)
      setLoaded(true)
    })
  }, [])

  function setValue<K extends keyof Config>(id: K, value: Config[K]): void {
    const next = { ...config, [id]: value }
    setConfig(next)
    void saveConfig(next)
  }

  return { config, loaded, setValue }
}

function useApiKey() {
  const [key, setKey] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void loadApiKey().then(setKey)
  }, [])

  function save(value: string): void {
    setKey(value)
    void saveApiKey(value).then(() => {
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })
  }

  return { key, saved, save }
}

function useBlocklist() {
  const [blocked, setBlocked] = useState<BlockedAuthor[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    void loadBlocklist().then(setBlocked)
    const listener = (changes: {
      blockedAuthors?: { newValue?: BlockedAuthor[] }
    }) => {
      if (changes.blockedAuthors) {
        setBlocked(changes.blockedAuthors.newValue ?? [])
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  function remove(id: string): void {
    void removeBlocked(id)
      .then((list) => {
        setBlocked(list)
        setError("")
      })
      .catch(() => setError("保存失败,请重试"))
  }

  function clear(): void {
    void clearBlocklist()
      .then(() => {
        setBlocked([])
        setError("")
      })
      .catch(() => setError("清空失败,请重试"))
  }

  return { blocked, remove, clear, error }
}

function usePatterns() {
  const [list, setList] = useState<string[]>([])

  useEffect(() => {
    void loadPatterns().then(setList)
    const listener = (changes: { aiPatterns?: { newValue?: string[] } }) => {
      if (changes.aiPatterns) setList(changes.aiPatterns.newValue ?? [])
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  function add(v: string): void {
    const t = v.trim()
    if (!t || list.includes(t)) return
    const next = [...list, t]
    setList(next)
    void savePatterns(next)
  }

  function remove(v: string): void {
    const next = list.filter((x) => x !== v)
    setList(next)
    void savePatterns(next)
  }

  return { list, add, remove }
}

function useSamples() {
  const [list, setList] = useState<Sample[]>([])

  useEffect(() => {
    void loadSamples().then(setList)
    const listener = (changes: { aiSamples?: { newValue?: Sample[] } }) => {
      if (changes.aiSamples) setList(changes.aiSamples.newValue ?? [])
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  function add(text: string, label: Sample["label"]): void {
    const t = text.trim()
    if (!t) return
    void addSample(t, label).then(setList)
  }

  function remove(id: string): void {
    void removeSample(id).then(setList)
  }

  return { list, add, remove }
}

interface Stats {
  callCount: number
  maxCalls: number
  hasKey: boolean
  aiEnable: boolean
  lastError: string | null
}

function useAdJudgments() {
  const [list, setList] = useState<Judgment[]>([])

  const refresh = (): void => {
    void Promise.all([loadJudgments(), loadWhitelist()]).then(([map, wl]) => {
      const wset = new Set(wl)
      setList(
        Object.values(map)
          .filter((j) => j.isAd && !wset.has(j.sig))
          .sort((a, b) => b.ts - a.ts)
          .slice(0, 20)
      )
    })
  }

  useEffect(() => {
    refresh()
    const listener = (changes: {
      aiJudgments?: unknown
      aiWhitelist?: unknown
    }) => {
      if (changes.aiJudgments || changes.aiWhitelist) refresh()
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  function markWhitelist(sig: string): void {
    void addWhitelist(sig).then(refresh)
  }

  return { list, markWhitelist }
}

function useStats(aiEnable: boolean) {
  const [stats, setStats] = useState<Stats>({
    callCount: 0,
    maxCalls: 200,
    hasKey: false,
    aiEnable: false,
    lastError: null
  })

  useEffect(() => {
    // SW 冷启动瞬时报错属正常:catch 吞掉,下轮 aiEnable/重开 popup 再取
    void chrome.runtime
      .sendMessage({ type: "stats" })
      .then((s) => {
        if (s) setStats(s as Stats)
      })
      .catch(() => {})
  }, [aiEnable])

  return stats
}

function CategorySection({
  config,
  setValue
}: {
  config: Config
  setValue: <K extends keyof Config>(id: K, value: Config[K]) => void
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      {CATEGORIES.map((cat) => (
        <label
          key={cat.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 0"
          }}>
          <input
            type="checkbox"
            checked={config[cat.id]}
            onChange={() => setValue(cat.id, !config[cat.id])}
          />
          {cat.label}
        </label>
      ))}
    </div>
  )
}

function AiToggleSection({
  config,
  setValue
}: {
  config: Config
  setValue: <K extends keyof Config>(id: K, value: Config[K]) => void
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 0"
        }}>
        <input
          type="checkbox"
          checked={config.aiEnable}
          onChange={() => setValue("aiEnable", !config.aiEnable)}
        />
        启用 AI 自动识别
      </label>
      <div style={{ fontSize: 11, color: "#8590a6", marginTop: 4 }}>
        关键词/话术/惯犯任一命中才送云端 LLM。回答正文发往你自己的 DeepSeek
        key。
      </div>
    </div>
  )
}

function PatternsSection() {
  const patterns = usePatterns()
  const [newPattern, setNewPattern] = useState("")

  return (
    <div style={{ marginBottom: 12 }}>
      <label
        htmlFor="new-pattern"
        style={{ fontSize: 13, marginBottom: 4, display: "block" }}>
        初筛关键词
      </label>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <input
          id="new-pattern"
          type="text"
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newPattern.trim()) {
              patterns.add(newPattern)
              setNewPattern("")
            }
          }}
          placeholder="如 加微信 / 公众号 / 私聊"
          style={{
            flex: 1,
            padding: "4px 6px",
            fontSize: 12,
            border: "1px solid #ebebeb",
            borderRadius: 4
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (newPattern.trim()) {
              patterns.add(newPattern)
              setNewPattern("")
            }
          }}
          style={{
            padding: "4px 10px",
            fontSize: 12,
            border: "1px solid #ebebeb",
            borderRadius: 4,
            background: "transparent",
            cursor: "pointer"
          }}>
          添加
        </button>
      </div>
      {patterns.list.length === 0 ? (
        <div style={{ color: "#8590a6", fontSize: 11 }}>
          空。命中任一关键词才送 LLM。
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {patterns.list.map((p) => (
            <span
              key={p}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 6px",
                fontSize: 12,
                background: "#f7f8fa",
                border: "1px solid #ebebeb",
                borderRadius: 10
              }}>
              {p}
              <button
                type="button"
                aria-label={`删除关键词 ${p}`}
                onClick={() => patterns.remove(p)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#8590a6",
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1
                }}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ApiKeySection() {
  const { key, saved, save } = useApiKey()
  // 本地草稿,失焦或回车才落库:避免每键一次 storage.local.set
  const [draft, setDraft] = useState<string | null>(null)

  function commit(): void {
    if (draft !== null && draft !== key) save(draft)
    setDraft(null)
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <label
        htmlFor="api-key"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13
        }}>
        API Key
        <input
          id="api-key"
          type="password"
          value={draft ?? key}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
          }}
          placeholder="sk-..."
          style={{
            flex: 1,
            padding: "4px 6px",
            fontSize: 12,
            border: "1px solid #ebebeb",
            borderRadius: 4
          }}
        />
      </label>
      <div style={{ fontSize: 11, color: saved ? "#00b42a" : "#8590a6" }}>
        {saved ? "已保存(仅本地存储)" : "明文存本地,不跨设备同步"}
      </div>
    </div>
  )
}

function ThresholdSection({
  config,
  setValue
}: {
  config: Config
  setValue: <K extends keyof Config>(id: K, value: Config[K]) => void
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        htmlFor="confidence-threshold"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13
        }}>
        藏的置信阈值
        <input
          id="confidence-threshold"
          type="range"
          min={0.5}
          max={1}
          step={0.05}
          value={config.aiConfidence}
          onChange={(e) => setValue("aiConfidence", Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 12 }}>{config.aiConfidence.toFixed(2)}</span>
      </label>
      <div style={{ fontSize: 11, color: "#8590a6" }}>
        ≥阈值藏,低于阈值只标(橙框)不藏
      </div>
    </div>
  )
}

function StatsLine({ aiEnable }: { aiEnable: boolean }) {
  const stats = useStats(aiEnable)
  return (
    <div
      style={{
        fontSize: 12,
        color: "#8590a6",
        marginBottom: 12,
        padding: "4px 0",
        borderTop: "1px solid #f0f0f0"
      }}>
      本会话调用:{stats.callCount}/{stats.maxCalls}
      {!stats.hasKey && " · 未填 key"}
      {stats.aiEnable &&
        stats.hasKey &&
        stats.callCount >= stats.maxCalls &&
        " · 已达上限"}
      {stats.lastError && (
        <div style={{ color: "#f53f3f", marginTop: 4, wordBreak: "break-all" }}>
          最近错误:{stats.lastError}
        </div>
      )}
    </div>
  )
}

function AiJudgmentsSection() {
  const { list, markWhitelist } = useAdJudgments()

  return (
    <>
      <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#646464" }}>
        AI 判定软广({list.length})
      </h3>
      {list.length === 0 ? (
        <div style={{ color: "#8590a6", fontSize: 12, marginBottom: 12 }}>
          空。初筛命中 + LLM 确认后出现。
        </div>
      ) : (
        <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
          {list.map((j) => (
            <div
              key={j.sig}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 8,
                padding: "4px 0",
                fontSize: 12,
                borderBottom: "1px solid #f5f5f5"
              }}>
              <span style={{ flex: 1, color: "#333" }}>
                <span style={{ color: "#ff9a2e" }}>
                  {(j.confidence * 100).toFixed(0)}%
                </span>{" "}
                {j.reason}
              </span>
              <button
                type="button"
                onClick={() => markWhitelist(j.sig)}
                style={{
                  color: "#f53f3f",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  whiteSpace: "nowrap"
                }}>
                误判
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function SamplesSection() {
  const samples = useSamples()
  const [sampleText, setSampleText] = useState("")
  const [sampleLabel, setSampleLabel] = useState<Sample["label"]>("ad")

  return (
    <>
      <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#646464" }}>
        few-shot 样本({samples.list.length})
      </h3>
      <div style={{ marginBottom: 8 }}>
        <label
          htmlFor="sample-text"
          style={{ fontSize: 11, color: "#8590a6", display: "block" }}>
          粘贴回答正文作为标注样本
        </label>
        <textarea
          id="sample-text"
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: "4px 6px",
            fontSize: 12,
            border: "1px solid #ebebeb",
            borderRadius: 4,
            boxSizing: "border-box",
            resize: "vertical",
            marginTop: 2
          }}
        />
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <label
            htmlFor="sample-label"
            style={{ fontSize: 12, display: "flex", alignItems: "center" }}>
            标签
          </label>
          <select
            id="sample-label"
            value={sampleLabel}
            onChange={(e) => setSampleLabel(e.target.value as Sample["label"])}
            style={{
              padding: "4px 6px",
              fontSize: 12,
              border: "1px solid #ebebeb",
              borderRadius: 4
            }}>
            <option value="ad">软广</option>
            <option value="notad">非软广</option>
          </select>
          <button
            type="button"
            onClick={() => {
              if (sampleText.trim()) {
                samples.add(sampleText, sampleLabel)
                setSampleText("")
              }
            }}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              border: "1px solid #ebebeb",
              borderRadius: 4,
              background: "transparent",
              cursor: "pointer"
            }}>
            添加样本
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#8590a6", marginTop: 4 }}>
          回答卡可点"软广/非软广"按钮直接标注。样本注入 LLM prompt 提准度。
        </div>
      </div>
      {samples.list.length > 0 && (
        <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 12 }}>
          {samples.list.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 8,
                padding: "4px 0",
                fontSize: 12,
                borderBottom: "1px solid #f5f5f5"
              }}>
              <span style={{ flex: 1, color: "#333", overflow: "hidden" }}>
                <span
                  style={{
                    color: s.label === "ad" ? "#f53f3f" : "#00b42a",
                    fontWeight: 600
                  }}>
                  {s.label === "ad" ? "软广" : "非软广"}
                </span>{" "}
                {s.text.slice(0, 40)}
                {s.text.length > 40 ? "…" : ""}
              </span>
              <button
                type="button"
                aria-label="删除样本"
                onClick={() => samples.remove(s.id)}
                style={{
                  color: "#8590a6",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  whiteSpace: "nowrap"
                }}>
                删
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function BlocklistSection() {
  const { blocked, remove, clear, error } = useBlocklist()

  return (
    <>
      <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#646464" }}>
        作者黑名单（{blocked.length}）
      </h3>
      {error && (
        <div style={{ color: "#f53f3f", fontSize: 12, marginBottom: 8 }}>
          {error}
        </div>
      )}
      {blocked.length === 0 ? (
        <div style={{ color: "#8590a6", fontSize: 12 }}>
          空。回答卡片点"屏蔽"加入。
        </div>
      ) : (
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          {blocked.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "4px 0",
                fontSize: 13
              }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {a.name || a.id}
              </span>
              <button
                type="button"
                onClick={() => remove(a.id)}
                style={{
                  marginLeft: 8,
                  color: "#f53f3f",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer"
                }}>
                移除
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={clear}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "6px",
              fontSize: 12,
              color: "#f53f3f",
              background: "transparent",
              border: "1px solid #ebebeb",
              borderRadius: 4,
              cursor: "pointer"
            }}>
            清空
          </button>
        </div>
      )}
    </>
  )
}

function IndexPopup() {
  const { config, loaded, setValue } = useConfig()

  if (!loaded) return null

  return (
    <div style={{ padding: 16, minWidth: 320, fontFamily: "sans-serif" }}>
      <h2 style={{ margin: 0, marginBottom: 12 }}>知乎屏蔽</h2>
      <CategorySection config={config} setValue={setValue} />
      <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#646464" }}>
        AI 软广识别(DeepSeek)
      </h3>
      <AiToggleSection config={config} setValue={setValue} />
      <PatternsSection />
      <ApiKeySection />
      <ThresholdSection config={config} setValue={setValue} />
      <StatsLine aiEnable={config.aiEnable} />
      <AiJudgmentsSection />
      <SamplesSection />
      <BlocklistSection />
    </div>
  )
}

export default IndexPopup
