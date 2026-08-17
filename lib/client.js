window.__ModuleLoader__.load({
	id: "dsh-oks",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/RecallParamsCard.tsx
		/**
		* OKS settings card — browser half component.
		*
		* Grouped form: 知识库地址 / 召回 / PostToolUse / 搜索后端.
		* knowledge_base_path writes ~/.oks/config.json (via oks config set in
		* the Host half's onChange); the rest write settings/recall.yaml.
		*/
		const FALLBACK = {
			knowledge_base_path: "",
			recall_floor: .7,
			recall_topn: 3,
			recall_minlen: 6,
			recall_cooldown: 10,
			posttool_mode: "signal",
			posttool_floor: .9,
			posttool_topn: 2,
			posttool_signal_rel_floor: 2.5,
			search_backend: "native"
		};
		const field = (label, control) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: "0.15rem"
			},
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: { fontSize: "0.8rem" },
				children: label
			}), control]
		});
		function RecallParamsCard(props) {
			const scope = props.scope;
			if (!scope) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: { color: "#888" },
				children: "scope 未绑定"
			});
			const snap = (0, react.useSyncExternalStore)(scope.subscribe, scope.getSnapshot, scope.getSnapshot);
			if (snap.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: {
					padding: "0.5rem 0",
					color: "#888"
				},
				children: "加载 OKS 配置中…"
			});
			if (snap.status === "unavailable") return null;
			const v = {
				...FALLBACK,
				...snap.value
			};
			const update = (f, val) => {
				scope.set(f, val);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					padding: "0.5rem 0",
					display: "flex",
					flexDirection: "column",
					gap: "1rem"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
					style: { fontSize: "1rem" },
					children: "OKS 知识库配置"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						margin: 0,
						color: "#888",
						fontSize: "0.8rem"
					},
					children: "改 → 自动写 ~/.oks/config.json + settings/recall.yaml → 下次生效"
				})] }), !snap.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: { color: "#888" },
					children: "只读"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
						style: groupStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", {
							style: legendStyle,
							children: "📦 知识库"
						}), field("knowledge_base_path（知识库地址，写 ~/.oks/config.json）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "text",
							style: inputStyle,
							value: v.knowledge_base_path ?? "",
							placeholder: "~/Desktop/school/repo/xinhai-knowledge-studio",
							onChange: (e) => update("knowledge_base_path", e.target.value)
						}))]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
						style: groupStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", {
								style: legendStyle,
								children: "🔍 召回 (recall)"
							}),
							field("floor（召回阈值，rel 低于此不注入）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "number",
								step: "0.05",
								min: "0",
								max: "1",
								style: inputStyle,
								value: v.recall_floor ?? .7,
								onChange: (e) => update("recall_floor", parseFloat(e.target.value))
							})),
							field("topn（每次注入最多 N 条）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "number",
								step: "1",
								min: "1",
								max: "10",
								style: inputStyle,
								value: v.recall_topn ?? 3,
								onChange: (e) => update("recall_topn", parseInt(e.target.value, 10))
							})),
							field("minlen（query 短于此跳过）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "number",
								step: "1",
								min: "1",
								max: "50",
								style: inputStyle,
								value: v.recall_minlen ?? 6,
								onChange: (e) => update("recall_minlen", parseInt(e.target.value, 10))
							})),
							field("cooldown（同 query N 轮不重复）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "number",
								step: "1",
								min: "0",
								max: "100",
								style: inputStyle,
								value: v.recall_cooldown ?? 10,
								onChange: (e) => update("recall_cooldown", parseInt(e.target.value, 10))
							}))
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
						style: groupStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", {
								style: legendStyle,
								children: "⚡ PostToolUse（工具后补提醒）"
							}),
							field("mode（注入模式）", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								style: inputStyle,
								value: v.posttool_mode ?? "signal",
								onChange: (e) => update("posttool_mode", e.target.value),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "signal",
									children: "signal（只 slug+rel，默认）"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "full",
									children: "full（注入 body）"
								})]
							})),
							field("signal_rel_floor（J 模式 rel 门槛，极高才注入）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "number",
								step: "0.1",
								min: "0",
								max: "10",
								style: inputStyle,
								value: v.posttool_signal_rel_floor ?? 2.5,
								onChange: (e) => update("posttool_signal_rel_floor", parseFloat(e.target.value))
							})),
							field("floor（工具 query 的召回阈值）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "number",
								step: "0.05",
								min: "0",
								max: "1",
								style: inputStyle,
								value: v.posttool_floor ?? .9,
								onChange: (e) => update("posttool_floor", parseFloat(e.target.value))
							})),
							field("topn（PostToolUse 注入最多 N 条）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "number",
								step: "1",
								min: "1",
								max: "10",
								style: inputStyle,
								value: v.posttool_topn ?? 2,
								onChange: (e) => update("posttool_topn", parseInt(e.target.value, 10))
							}))
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
						style: groupStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", {
							style: legendStyle,
							children: "🔎 搜索后端"
						}), field("search_backend", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							style: inputStyle,
							value: v.search_backend ?? "native",
							onChange: (e) => update("search_backend", e.target.value),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "native",
									children: "native（6+1 因子，默认）"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "fts5",
									children: "fts5（SQLite FTS5 + BM25）"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "fusion",
									children: "fusion（native + fts5 补盲）"
								})
							]
						}))]
					})
				] })]
			});
		}
		const groupStyle = {
			border: "1px solid #ddd",
			padding: "0.5rem 0.75rem",
			borderRadius: "4px",
			display: "flex",
			flexDirection: "column",
			gap: "0.5rem"
		};
		const legendStyle = {
			fontWeight: 600,
			fontSize: "0.85rem",
			padding: "0 0.4rem"
		};
		const inputStyle = {
			padding: "0.25rem 0.4rem",
			fontSize: "0.85rem"
		};
		//#endregion
		//#region src/client/index.ts
		const inject = [
			"slots",
			"locale",
			"connection",
			"remote",
			"settingsScope"
		];
		function apply(ctx) {
			const scope = ctx.settingsScope.bind({ namespace: "oks" });
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: "oks",
				locale: "settings.oks",
				inject: () => ({})
			}, (props) => RecallParamsCard({
				scope,
				...props
			})));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "oks",
				order: 20,
				label: () => "OKS",
				inject: () => ({ scope })
			}, (props) => RecallParamsCard({
				scope: props.scope ?? scope,
				...props
			})));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map