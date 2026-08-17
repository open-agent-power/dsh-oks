# oks-recall

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
