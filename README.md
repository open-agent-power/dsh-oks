# dsh-oks

> DeepSeek Harness 插件：在 DSH Web UI 中连接本地 Open Knowledge Studio（OKS）知识库，提供召回、知识库浏览与可视化设置。

[Open Knowledge Studio (OKS)](https://github.com/open-agent-power/open-knowledge-studio) 是文件式知识库：原始材料保留在 `raw/`，审核后的可复用知识位于 `wiki/`，Agent 通过 `oks recall` 召回相关内容。`dsh-oks` 不复制或托管知识数据；它调用本机 `oks` CLI，并读取你已经配置的本地 OKS 目录。

## 功能

- 在每轮 Agent 对话开始前按配置进行 OKS 召回；可在面板中关闭自动召回。
- 提供 `oks_recall`、`oks_status`、`oks_wiki_use`、`oks_metrics`、`oks_inject_stats`、`oks_inject_feedback` 六个工具。
- 在 DSH Web 设置中提供中文 OKS 卡片，并将设置写回 OKS 配置。
- 浏览本地知识库中的 **Wiki、待审核 Draft 和 Raw Bundle**；支持筛选、搜索、详情查看与刷新。
- 对未安装 OKS、未配置知识库、目录结构不完整等情况提供明确诊断，不会静默创建或迁移你的知识库。

## 安装

### 前置条件

先安装并初始化 OKS。以下示例路径仅为占位符，请替换为自己的知识库目录：

```bash
pipx install open-knowledge-studio
oks init <knowledge-base-path>
oks config set knowledge_base_path <knowledge-base-path>
```

### 安装插件

```bash
dsh plugin --profile web add github:open-agent-power/dsh-oks
```

启动 DSH Web 后，打开 **系统设置 → OKS**。面板会检查：

- `oks` CLI 是否可用；
- `knowledge_base_path` 是否已配置；
- 目标目录是否含有 `wiki/`、`drafts/` 和 `raw/`。

## Web 面板与数据边界

面板显示的数量和内容直接来自已配置的本地 OKS 文件：

| 区域 | 读取内容 |
| --- | --- |
| Wiki | 已审核、可被长期召回的知识 |
| Draft | AI 生成、等待人工审核的候选知识 |
| Raw | 原始证据 Bundle，不等于知识条目 |

面板提供手动刷新，并在打开期间低频刷新。刷新不会上传、复制或改写知识条目；设置写回只影响 OKS 配置文件。

## 工具

| 工具 | 用途 |
| --- | --- |
| `oks_recall` | 召回与当前问题相关的 Wiki 知识 |
| `oks_status` | 查看知识库状态 |
| `oks_wiki_use` | 记录某个 Wiki 知识被实际使用 |
| `oks_metrics` | 查看 OKS 指标 |
| `oks_inject_stats` | 查看注入质量统计 |
| `oks_inject_feedback` | 提交注入质量反馈 |

## 验证建议

不要只以首页 HTTP 200 判断插件可用。至少确认：

1. DSH Settings API 能发现 `oks` 命名空间；
2. 系统设置中的 OKS 卡片可见并能显示字段；
3. `oks_status` 与 `oks_recall` 能获得非异常结果；
4. 修改设置后，OKS 配置写回并在刷新后仍然生效；
5. Wiki、Draft 和 Raw 页面展示的是当前本地知识库数据。

## 开发与发布边界

仓库仅保留可移植的 `cordis.patch.yml`。本机开发补丁、验收日志、个人知识库、案例运行记录与机器相关配置均不应提交或发布。

## License

MIT