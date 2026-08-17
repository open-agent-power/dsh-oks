# dsh-oks

> DeepSeek Harness 插件——在 dsh Web UI 里给 agent 注入 OKS 记忆 + 可视化配置召回参数。

[OKS](https://github.com/open-agent-power/open-knowledge-studio) 是文件式知识库（raw → wiki → recall）。本插件让 dsh agent **确定性每轮注入**相关记忆（等价 Claude Code 的 UserPromptSubmit hook），并提供 6 个 agent 可主动调的工具 + 设置卡。

## 四环境支持

OKS 在四个 Agent 环境都用同一套提示词（`<recalled-memory source="oks">`），行为一致：

| 环境 | 集成方式 | 安装命令 |
|------|---------|---------|
| **Claude Code** | shell-hook（`.claude/hooks/`） | `oks hook install --editor claude` |
| **Qoder** | shell-hook | `oks hook install --editor qoder` |
| **pi** | pi extension（`.pi/extensions/oks-*.ts`） | 复制 extension + `oks hook install`（提供脚本） |
| **dsh** | 原生 Cordis 插件（本仓库） | `dsh plugin --profile web add github:open-agent-power/dsh-oks` |

Claude/Qoder/pi 都依赖 `oks hook install` 写入的 `.claude/hooks/` 脚本；dsh 不依赖脚本，直接调 `oks` CLI（原生事件订阅，更强、typed、无序列化边界）。

## 安装（dsh）

### 前置
```bash
pipx install open-knowledge-studio   # oks 在 PATH
oks init ~/my-kb                      # 创建知识库实例
oks config set knowledge_base_path ~/my-kb   # 全局默认（dsh 进程靠这个找 KB）
```

### 正式
```bash
dsh plugin --profile web add github:open-agent-power/dsh-oks
cd <deepseek-harness> && pnpm dsh web   # 启动，设置页可见 OKS 卡片
```

### 开发（--patch 覆盖层）
```bash
cd dsh-oks
dsh --profile web --patch ./oks-patch.yml "任务"
# 改完重新编译 client：
DSH_BUILD_FACE=client <dsh>/node_modules/.bin/tsdown
```

## 工具（6 个，agent 可主动调）

| 工具 | 调 oks CLI | 作用 |
|------|-----------|------|
| `oks_recall` | `oks recall <q> --format json --limit N` | 召回相关 wiki |
| `oks_status` | `oks status` | 知识库状态（wiki 数/领域/草稿） |
| `oks_wiki_use` | `oks wiki use <slug>` | 标记引用（自评埋点代填） |
| `oks_metrics` | `oks metrics` + 注入质量段 | 4 维度指标 + 注入反馈统计 |
| `oks_inject_feedback` | 写 `~/.oks/inject_feedback.log` | AI 给本轮注入打分（useful/noise/irrelevant） |
| `oks_inject_stats` | 读 feedback log | 注入质量统计（total/useful 率/per-slug） |

## Hook 订阅（确定性注入，不靠 agent 自觉）

| DSH 原生事件 | 等价 Claude hook | 干的事 |
|---|---|---|
| `agent/pre-step` | UserPromptSubmit | 每轮用户开口 → `oks recall` → 注入 `<recalled-memory source="oks">` |
| `tools/post-execute` | PostToolUse | read/write/edit/bash/grep/glob 后 → `oks recall` → 注入 `<oks-memory-signal source="oks-posttool">` |

**降级**：query < 10 字 / oks 失败 / 无结果 → `return next()`（零成本，不阻塞）。

注入文本带 `<!-- inject_id:xxx slugs:a,b -->` 标记，AI 答完调 `oks_inject_feedback` 闭环。

## 设置卡（Web UI → 设置 → 侧边栏 OKS）

6 个分组，改 → 自动写 `~/.oks/config.json` + `<KB>/settings/recall.yaml`：

| 分组 | 字段 |
|------|------|
| 📦 知识库 | `knowledge_base_path` |
| 🔍 召回 | `recall.floor` / `topn` / `minlen` / `cooldown` |
| ⚡ pre-step hook | `prestep_floor`(0.85) / `prestep_knowledge_only`(true) |
| 🛠 PostToolUse | `posttool.mode` / `floor` / `topn` / `signal_rel_floor` |
| 🔎 搜索后端 | `search_backend`（native/fts5/fusion） |
| 📊 注入质量反馈 | 闭环说明 |

视觉复刻 dsh 原生 PluginCard/ValueField（`--dsw-alias-*` token，深浅主题自适应）。

## 集成方式

插件调 `oks` CLI（`execFile`，不走 shell，防注入）—— **dsh（Node）和 oks（Python）解耦**，各自升级不耦合。

## License

MIT
