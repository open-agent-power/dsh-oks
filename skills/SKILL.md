# oks-recall

## 主动验证猜想（核心心智）

**不确定时先 recall 验证，别凭记忆猜。** 你脑子里记的不一定准——wiki 里可能已有更可靠的沉淀。
- 想用某个模式但不确定细节 → 先 recall，别猜
- 觉得“之前好像做过” → 先 recall 确认，别重复踩坑
- 模糊任务 → 传 `queries: string[]`（5-6 个替代措辞）并行 fan-out，按 slug 去重合并 → 覆盖更广

```
oks_recall(
  query: "git branch",
  queries: ["branch strategy", "trunk-based", "git flow", "release flow"]
)
```

## 何时用 oks_recall

任务涉及以下情况时，调 `oks_recall`：
- **不确定的概念 / 模式**——任务提到一个你不完全确定的技术概念
- **历史决策**——想知道"之前做过类似任务吗 / 当时怎么决定的"
- **竞品对照**——如"OKS vs nowledge / ai-book"
- **想引用之前的沉淀**——复用已 wiki 化的经验，不重复踩坑

## 怎么调

```
oks_recall(query: "OKS 记忆体系 对比 ai-book 第3章", limit: 3)
```

**query 用任务意图**，不是工具操作衍生的词（如 file stem / command）。

## 引用了记忆后

实际引用了某条记忆（在回答里提到 slug 或用了某条经验）→ 调：
```
oks_wiki_use(slug: "<slug>")
```
标记引用（access_count++，埋点代填——人类不手动调，AI 代填）。

## 不调也行

任务简单 / 已读够 / 上下文已足时不调。零 token 浪费。

## 看 OKS 状态

```
oks_status()    # 知识库状态（wiki 数 / tier / drafts）
oks_metrics()   # 4 维度指标 + 注入统计 + 当前参数
```
