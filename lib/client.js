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
		* Visual style mirrors the native dsh PluginCard/ValueField: a rounded
		* layer-3 card, disclosure header, fields separated by border-top. All
		* colors come from dsh's --dsw-alias-* design tokens so we match the host
		* theme (light/dark) with zero CSS of our own.
		*
		* Groups: 知识库 / 召回 / PostToolUse / 搜索后端. Each field writes via
		* scope.set → Host half onChange syncs to ~/.oks/config.json + recall.yaml.
		*/
		const FALLBACK = {
			knowledge_base_path: "",
			recall_floor: .7,
			recall_topn: 3,
			recall_minlen: 6,
			recall_cooldown: 10,
			prestep_floor: .85,
			prestep_knowledge_only: true,
			posttool_mode: "signal",
			posttool_floor: .9,
			posttool_topn: 2,
			posttool_signal_rel_floor: 2.5,
			search_backend: "native"
		};
		const T = {
			border: "var(--dsw-alias-border-l2)",
			borderHover: "var(--dsw-alias-label-dimmed)",
			bgLayer3: "var(--dsw-alias-bg-layer-3)",
			bgLayer2: "var(--dsw-alias-bg-layer-2)",
			labelPrimary: "var(--dsw-alias-label-primary)",
			labelSecondary: "var(--dsw-alias-label-secondary)",
			brand: "var(--dsw-alias-brand-primary)"
		};
		const card = {
			listStyle: "none",
			border: `1px solid ${T.border}`,
			borderRadius: 12,
			background: T.bgLayer3,
			transition: "border-color .16s, background .16s",
			overflow: "hidden"
		};
		const group = { padding: "4px 16px 0" };
		const groupTitle = {
			fontSize: 13,
			fontWeight: 600,
			lineHeight: 1.5,
			color: T.labelPrimary,
			padding: "12px 0 4px"
		};
		const field = {
			display: "flex",
			flexDirection: "column",
			gap: 6,
			padding: "12px 0",
			borderTop: `1px solid ${T.border}`
		};
		const label = {
			fontSize: 13,
			fontWeight: 500,
			lineHeight: 1.5,
			color: T.labelPrimary,
			flex: 1,
			minWidth: 0
		};
		const hint = {
			fontSize: 11,
			lineHeight: 1.45,
			color: T.labelSecondary
		};
		const input = {
			padding: "6px 8px",
			fontSize: 13,
			lineHeight: 1.5,
			color: T.labelPrimary,
			background: T.bgLayer2,
			border: `1px solid ${T.border}`,
			borderRadius: 6,
			width: "100%",
			boxSizing: "border-box",
			outline: "none"
		};
		function Field({ id, lab, h, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						style: label,
						htmlFor: id,
						children: lab
					}),
					children,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: hint,
						children: h
					})
				]
			});
		}
		function RecallParamsCard(props) {
			const scope = props.scope;
			if (!scope) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: { color: T.labelSecondary },
				children: "scope 未绑定"
			});
			const snap = (0, react.useSyncExternalStore)((cb) => scope.subscribe(cb), () => scope.getSnapshot(), () => scope.getSnapshot());
			if (snap.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					...card,
					padding: "14px 16px"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						margin: 0,
						color: T.labelSecondary,
						fontSize: 13
					},
					children: "加载 OKS 配置中…"
				})
			});
			if (snap.status === "unavailable") return null;
			const v = {
				...FALLBACK,
				...snap.value ?? {}
			};
			const up = (f, val) => {
				scope.set(f, val);
			};
			const gid = (s) => `oks-${s}`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 12,
						padding: "14px 16px"
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							flex: 1,
							minWidth: 0
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 14,
								fontWeight: 600,
								lineHeight: 1.4,
								color: T.labelPrimary
							},
							children: "OKS 知识库配置"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 12,
								lineHeight: 1.45,
								color: T.labelSecondary
							},
							children: "改 → 自动写 ~/.oks/config.json + settings/recall.yaml"
						})]
					})
				}), !snap.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: { padding: "0 16px 14px" },
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							color: T.labelSecondary,
							fontSize: 13
						},
						children: "只读"
					})
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: { borderTop: `1px solid ${T.border}` },
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: group,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: groupTitle,
								children: "📦 知识库"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								id: gid("kbp"),
								lab: "knowledge_base_path",
								h: "知识库地址，写 ~/.oks/config.json",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									id: gid("kbp"),
									style: input,
									type: "text",
									value: String(v.knowledge_base_path ?? ""),
									placeholder: "~/Desktop/school/repo/xinhai-knowledge-studio",
									onChange: (e) => up("knowledge_base_path", e.target.value)
								})
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: group,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: groupTitle,
									children: "🔍 召回 (recall)"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: gid("rf"),
									lab: "floor",
									h: "召回阈值，rel 低于此不注入",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("rf"),
										style: input,
										type: "number",
										step: "0.05",
										min: "0",
										max: "1",
										value: Number(v.recall_floor ?? .7),
										onChange: (e) => up("recall_floor", parseFloat(e.target.value))
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: gid("rt"),
									lab: "topn",
									h: "每次注入最多 N 条",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("rt"),
										style: input,
										type: "number",
										step: "1",
										min: "1",
										max: "10",
										value: Number(v.recall_topn ?? 3),
										onChange: (e) => up("recall_topn", parseInt(e.target.value, 10))
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: gid("rm"),
									lab: "minlen",
									h: "query 短于此跳过",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("rm"),
										style: input,
										type: "number",
										step: "1",
										min: "1",
										max: "50",
										value: Number(v.recall_minlen ?? 6),
										onChange: (e) => up("recall_minlen", parseInt(e.target.value, 10))
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: gid("rc"),
									lab: "cooldown",
									h: "同 query N 轮不重复",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("rc"),
										style: input,
										type: "number",
										step: "1",
										min: "0",
										max: "100",
										value: Number(v.recall_cooldown ?? 10),
										onChange: (e) => up("recall_cooldown", parseInt(e.target.value, 10))
									})
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: group,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: groupTitle,
									children: "⚡ pre-step hook（确定性每轮注入）"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: gid("pf"),
									lab: "prestep_floor",
									h: "pre-step 专用更高门槛，过滤噪音（默认 0.85）",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("pf"),
										style: input,
										type: "number",
										step: "0.05",
										min: "0",
										max: "1",
										value: Number(v.prestep_floor ?? .85),
										onChange: (e) => up("prestep_floor", parseFloat(e.target.value))
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: gid("pk"),
									lab: "prestep_knowledge_only",
									h: "只注入 wiki，不注入 episodic raw",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("pk"),
										type: "checkbox",
										checked: Boolean(v.prestep_knowledge_only ?? true),
										onChange: (e) => up("prestep_knowledge_only", e.target.checked)
									})
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: group,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: groupTitle,
									children: "🛠 PostToolUse（工具后补提醒）"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: gid("pm"),
									lab: "mode",
									h: "注入模式",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										id: gid("pm"),
										style: input,
										value: String(v.posttool_mode ?? "signal"),
										onChange: (e) => up("posttool_mode", e.target.value),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "signal",
											children: "signal（只 slug+rel，默认）"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "full",
											children: "full（注入 body）"
										})]
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: gid("ps"),
									lab: "signal_rel_floor",
									h: "J 模式 rel 门槛，极高才注入",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("ps"),
										style: input,
										type: "number",
										step: "0.1",
										min: "0",
										max: "10",
										value: Number(v.posttool_signal_rel_floor ?? 2.5),
										onChange: (e) => up("posttool_signal_rel_floor", parseFloat(e.target.value))
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: gid("pfl"),
									lab: "floor",
									h: "工具 query 的召回阈值",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("pfl"),
										style: input,
										type: "number",
										step: "0.05",
										min: "0",
										max: "1",
										value: Number(v.posttool_floor ?? .9),
										onChange: (e) => up("posttool_floor", parseFloat(e.target.value))
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: gid("pt"),
									lab: "topn",
									h: "PostToolUse 注入最多 N 条",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("pt"),
										style: input,
										type: "number",
										step: "1",
										min: "1",
										max: "10",
										value: Number(v.posttool_topn ?? 2),
										onChange: (e) => up("posttool_topn", parseInt(e.target.value, 10))
									})
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: group,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: groupTitle,
								children: "🔎 搜索后端"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								id: gid("sb"),
								lab: "search_backend",
								h: "召回后端引擎",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									id: gid("sb"),
									style: input,
									value: String(v.search_backend ?? "native"),
									onChange: (e) => up("search_backend", e.target.value),
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
								})
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: group,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: groupTitle,
								children: "📊 注入质量反馈（闭环）"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									...field,
									borderTop: `1px solid ${T.border}`
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: label,
									children: "闭环已启用"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: hint,
									children: "每次注入带 inject_id 标记 → AI 答完后调 oks_inject_feedback 打分 （useful/noise/irrelevant）→ 写 ~/.oks/inject_feedback.log → 调 oks_inject_stats 或 oks_metrics 查看统计 → noise 多则调高 prestep_floor。"
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: { height: 8 } })
					]
				})]
			});
		}
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
			const render = (props) => RecallParamsCard({
				scope,
				...props
			});
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: "oks",
				locale: "settings.oks",
				inject: () => ({})
			}, render));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "oks",
				order: 20,
				label: () => "OKS",
				inject: () => ({})
			}, render));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map