# dsh-oks

> DeepSeek Harness 插件——在 dsh Web UI 里可视化配置 + 查看 OKS 知识库。

[OKS](https://github.com/open-agent-power/open-knowledge-studio) 是 Agent 状态栏注入 + Recall 原语的知识库。本插件让 dsh agent 能调 OKS recall、看状态、标记引用，并在 Web UI 设置页可视化配置召回参数。

## 安装

### 正式（发布后）

```bash
dsh plugin --profile web add github:open-agent-power/dsh-oks
```

### 开发（--patch 覆盖层，不需要 pnpm add）

```bash
cd dsh-oks
dsh --profile web --patch ./oks-patch.yml "任务"
```

## 工具

| 工具 | 调 oks CLI | 作用 |
|------|-----------|------|
| `oks_recall` | `oks recall "<q>" --format json --limit N` | 召回相关 wiki |
| `oks_status` | `oks status` | 知识库状态 |
| `oks_wiki_use` | `oks wiki use <slug>` | 标记引用（埋点代填）|
| `oks_metrics` | `oks metrics` | 4 维度指标 + 注入统计 + 当前参数 |

## 设置卡

Web UI 设置页 → **Plugins** → **oks** 卡片：

- `recall.floor`（召回阈值）
- `recall.topn`（注入最多 N 条）
- `posttool.mode`（signal / full）
- `search_backend`（native / fts5 / fusion）

改 → 写回 `settings/recall.yaml` → git 同步 → 走到哪带到哪。

## skill

`oks-recall` skill 注册为 runtime skill——告诉模型何时调 `oks_recall`（不确定概念 / 历史决策 / 竞品对照）。

## 集成方式

插件调 `oks` CLI（subprocess）—— **dsh（Node）和 oks（Python）解耦**，各自升级不耦合。

## 前置

- `oks` 在 PATH（`pip install open-knowledge-studio`）
- `OKS_ROOT` env 或 `~/.oks/config.json` 指向 KB 实例

## License

MIT
