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
		const T$2 = {
			border: "var(--dsw-alias-border-l2)",
			borderHover: "var(--dsw-alias-label-dimmed)",
			bgLayer3: "var(--dsw-alias-bg-layer-3)",
			bgLayer2: "var(--dsw-alias-bg-layer-2)",
			labelPrimary: "var(--dsw-alias-label-primary)",
			labelSecondary: "var(--dsw-alias-label-secondary)",
			brand: "var(--dsw-alias-brand-primary)"
		};
		const card$1 = {
			listStyle: "none",
			border: `1px solid ${T$2.border}`,
			borderRadius: 12,
			background: T$2.bgLayer3,
			transition: "border-color .16s, background .16s",
			overflow: "hidden"
		};
		const group = { padding: "4px 16px 0" };
		const groupTitle = {
			fontSize: 13,
			fontWeight: 600,
			lineHeight: 1.5,
			color: T$2.labelPrimary,
			padding: "12px 0 4px"
		};
		const field = {
			display: "flex",
			flexDirection: "column",
			gap: 6,
			padding: "12px 0",
			borderTop: `1px solid ${T$2.border}`
		};
		const label = {
			fontSize: 13,
			fontWeight: 500,
			lineHeight: 1.5,
			color: T$2.labelPrimary,
			flex: 1,
			minWidth: 0
		};
		const hint = {
			fontSize: 11,
			lineHeight: 1.45,
			color: T$2.labelSecondary
		};
		const input$1 = {
			padding: "6px 8px",
			fontSize: 13,
			lineHeight: 1.5,
			color: T$2.labelPrimary,
			background: T$2.bgLayer2,
			border: `1px solid ${T$2.border}`,
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
				style: { color: T$2.labelSecondary },
				children: "scope 未绑定"
			});
			const snap = (0, react.useSyncExternalStore)((cb) => scope.subscribe(cb), () => scope.getSnapshot(), () => scope.getSnapshot());
			if (snap.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					...card$1,
					padding: "14px 16px"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						margin: 0,
						color: T$2.labelSecondary,
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
				style: card$1,
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
								color: T$2.labelPrimary
							},
							children: "OKS 知识库配置"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 12,
								lineHeight: 1.45,
								color: T$2.labelSecondary
							},
							children: "改 → 自动写 ~/.oks/config.json + settings/recall.yaml"
						})]
					})
				}), !snap.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: { padding: "0 16px 14px" },
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							color: T$2.labelSecondary,
							fontSize: 13
						},
						children: "只读"
					})
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: { borderTop: `1px solid ${T$2.border}` },
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: group,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: groupTitle,
								children: "📦 知识库"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								id: gid("kbp"),
								lab: "知识库地址",
								h: "知识库地址，写 ~/.oks/config.json",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									id: gid("kbp"),
									style: input$1,
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
									lab: "召回门槛",
									h: "召回阈值，rel 低于此不注入",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("rf"),
										style: input$1,
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
									lab: "召回条数",
									h: "每次注入最多 N 条",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("rt"),
										style: input$1,
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
									lab: "最短问题长度",
									h: "用户问题短于此长度时跳过召回",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("rm"),
										style: input$1,
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
									lab: "冷却轮数",
									h: "相同问题在 N 轮内不重复召回",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("rc"),
										style: input$1,
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
									lab: "前置召回门槛",
									h: "前置步骤使用更高门槛，过滤噪音（默认 0.85）",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("pf"),
										style: input$1,
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
									lab: "仅注入 Wiki",
									h: "只注入 Wiki，不注入原始资料（episodic Raw）",
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
									children: "🛠 PostToolUse（工具执行后补充提醒）"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: gid("pm"),
									lab: "注入模式",
									h: "注入模式",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										id: gid("pm"),
										style: input$1,
										value: String(v.posttool_mode ?? "signal"),
										onChange: (e) => up("posttool_mode", e.target.value),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "signal",
											children: "signal（仅注入 slug 和相关度，默认）"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "full",
											children: "full（注入正文）"
										})]
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: gid("ps"),
									lab: "信号门槛",
									h: "信号模式的相关度门槛，达到较高值才注入",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("ps"),
										style: input$1,
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
									lab: "工具召回门槛",
									h: "工具查询的召回阈值",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("pfl"),
										style: input$1,
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
									lab: "工具注入条数",
									h: "工具执行后最多注入 N 条",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: gid("pt"),
										style: input$1,
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
								lab: "搜索后端",
								h: "召回后端引擎",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									id: gid("sb"),
									style: input$1,
									value: String(v.search_backend ?? "native"),
									onChange: (e) => up("search_backend", e.target.value),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "native",
											children: "native（6+1 因子召回，默认）"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "fts5",
											children: "fts5（SQLite FTS5 全文检索 + BM25）"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "fusion",
											children: "fusion（native + fts5 组合补充）"
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
									borderTop: `1px solid ${T$2.border}`
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: label,
									children: "闭环已启用"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: hint,
									children: "每次注入带 inject_id 标记 → AI 答完后调 oks_inject_feedback 打分 （有用/噪声/不相关）→ 写 ~/.oks/inject_feedback.log → 调 oks_inject_stats 或 oks_metrics 查看统计 → 噪声较多时调高前置召回门槛。"
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: { height: 8 } })
					]
				})]
			});
		}
		//#endregion
		//#region src/client/WikiBrowser.tsx
		/** Read-only browser for the three OKS lifecycle layers: Wiki, Draft, and Raw. */
		const T$1 = {
			border: "var(--dsw-alias-border-l2)",
			bgLayer3: "var(--dsw-alias-bg-layer-3)",
			bgLayer2: "var(--dsw-alias-bg-layer-2)",
			labelPrimary: "var(--dsw-alias-label-primary)",
			labelSecondary: "var(--dsw-alias-label-secondary)",
			brand: "var(--dsw-alias-brand-primary)"
		};
		const card = {
			border: `1px solid ${T$1.border}`,
			borderRadius: 12,
			background: T$1.bgLayer3,
			overflow: "hidden"
		};
		const input = {
			padding: "8px 10px",
			fontSize: 13,
			lineHeight: 1.5,
			color: T$1.labelPrimary,
			background: T$1.bgLayer2,
			border: `1px solid ${T$1.border}`,
			borderRadius: 7,
			boxSizing: "border-box"
		};
		const button = {
			border: `1px solid ${T$1.border}`,
			borderRadius: 7,
			padding: "6px 9px",
			background: T$1.bgLayer2,
			color: T$1.labelPrimary,
			cursor: "pointer",
			fontSize: 12
		};
		function asPageList(value) {
			if (!value || typeof value !== "object") return void 0;
			const data = value;
			if (!Array.isArray(data.items) || typeof data.total !== "number") return void 0;
			return {
				total: data.total,
				items: data.items,
				areas: Array.isArray(data.areas) ? data.areas : [],
				types: Array.isArray(data.types) ? data.types : []
			};
		}
		function asRawList(value) {
			if (!value || typeof value !== "object") return void 0;
			const data = value;
			if (!Array.isArray(data.items) || typeof data.total !== "number") return void 0;
			return {
				total: data.total,
				items: data.items,
				statuses: Array.isArray(data.statuses) ? data.statuses : [],
				truncated: data.truncated === true
			};
		}
		function asOverview(value) {
			if (!value || typeof value !== "object") return void 0;
			const data = value;
			if (data.connected !== true) return void 0;
			if (typeof data.wikiCount !== "number" || typeof data.draftCount !== "number" || typeof data.rawFileCount !== "number" || typeof data.rawBundleCount !== "number") return void 0;
			return data;
		}
		function asDiagnostics(value) {
			if (!value || typeof value !== "object") return void 0;
			const data = value;
			if (typeof data.status !== "string" || typeof data.message !== "string") return void 0;
			if (typeof data.wikiCount !== "number" || typeof data.draftCount !== "number" || typeof data.rawFileCount !== "number" || typeof data.rawBundleCount !== "number") return void 0;
			return data;
		}
		function asDetail(value) {
			if (!value || typeof value !== "object") return void 0;
			const data = value;
			if (typeof data.body !== "string" || typeof data.bodyTruncated !== "boolean") return void 0;
			const raw = data;
			if (typeof raw.id === "string" && typeof raw.bundleId === "string" && typeof raw.captureId === "string" && typeof raw.capturedAt === "string" && typeof raw.status === "string" && typeof raw.sourceType === "string" && typeof raw.fileCount === "number" && typeof raw.summary === "string") return data;
			const page = data;
			if (typeof page.slug === "string" && typeof page.title === "string" && typeof page.area === "string" && typeof page.type === "string" && typeof page.summary === "string" && typeof page.created === "string") return data;
		}
		function isRawDetail(detail) {
			return "id" in detail;
		}
		function tabLabel(tab) {
			return tab === "wiki" ? "Wiki 知识" : tab === "drafts" ? "审核草稿" : "Raw 原始资料";
		}
		function readError(tab) {
			return `无法读取 OKS ${tabLabel(tab)}，请稍后重试。`;
		}
		function WikiBrowser({ rpc, onOpenSettings }) {
			const [tab, setTab] = (0, react.useState)("wiki");
			const [query, setQuery] = (0, react.useState)("");
			const [area, setArea] = (0, react.useState)("");
			const [type, setType] = (0, react.useState)("");
			const [rawStatus, setRawStatus] = (0, react.useState)("");
			const [pageData, setPageData] = (0, react.useState)();
			const [rawData, setRawData] = (0, react.useState)();
			const [overview, setOverview] = (0, react.useState)();
			const [diagnostics, setDiagnostics] = (0, react.useState)();
			const [selected, setSelected] = (0, react.useState)();
			const [error, setError] = (0, react.useState)("");
			const [loading, setLoading] = (0, react.useState)(false);
			const [refreshing, setRefreshing] = (0, react.useState)(false);
			const [lastUpdated, setLastUpdated] = (0, react.useState)();
			const [refreshNonce, setRefreshNonce] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				setLoading(true);
				setError("");
				const endpoint = tab === "raw" ? "raw-list" : tab === "drafts" ? "draft-list" : "wiki-list";
				const payload = tab === "raw" ? {
					query,
					status: rawStatus
				} : {
					query,
					area,
					type
				};
				rpc.call("/oks", endpoint, payload, controller.signal).then((result) => {
					if (controller.signal.aborted) return;
					if (tab === "raw") {
						const next = result.ok ? asRawList(result.value) : void 0;
						if (!next) setError(result.error?.message || readError(tab));
						else setRawData(next);
					} else {
						const next = result.ok ? asPageList(result.value) : void 0;
						if (!next) setError(result.error?.message || readError(tab));
						else setPageData(next);
					}
					setLastUpdated(/* @__PURE__ */ new Date());
				}).catch(() => {
					if (!controller.signal.aborted) setError(readError(tab));
				}).finally(() => {
					if (!controller.signal.aborted) {
						setLoading(false);
						setRefreshing(false);
					}
				});
				return () => controller.abort();
			}, [
				rpc,
				tab,
				query,
				area,
				type,
				rawStatus,
				refreshNonce
			]);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				Promise.all([rpc.call("/oks", "overview", {}, controller.signal), rpc.call("/oks", "diagnostics", {}, controller.signal)]).then(([overviewResult, diagnosticsResult]) => {
					if (controller.signal.aborted) return;
					const nextOverview = overviewResult.ok ? asOverview(overviewResult.value) : void 0;
					const nextDiagnostics = diagnosticsResult.ok ? asDiagnostics(diagnosticsResult.value) : void 0;
					if (nextOverview) setOverview(nextOverview);
					if (nextDiagnostics) setDiagnostics(nextDiagnostics);
				}).catch(() => void 0);
				return () => controller.abort();
			}, [rpc, refreshNonce]);
			(0, react.useEffect)(() => {
				const timer = window.setInterval(() => setRefreshNonce((value) => value + 1), 3e4);
				return () => window.clearInterval(timer);
			}, []);
			const refresh = () => {
				setRefreshing(true);
				setRefreshNonce((value) => value + 1);
			};
			const changeTab = (next) => {
				setTab(next);
				setSelected(void 0);
				setError("");
				setPageData(void 0);
				setRawData(void 0);
				setQuery("");
				setArea("");
				setType("");
				setRawStatus("");
			};
			const open = async (id) => {
				setLoading(true);
				setError("");
				try {
					const endpoint = tab === "wiki" ? "wiki-get" : tab === "drafts" ? "draft-get" : "raw-get";
					const result = await rpc.call("/oks", endpoint, tab === "raw" ? { id } : { slug: id });
					const detail = result.ok ? asDetail(result.value) : void 0;
					if (!detail) setError(result.error?.message || `无法打开此${tabLabel(tab)}条目。`);
					else setSelected(detail);
				} catch {
					setError(`无法打开此${tabLabel(tab)}条目。`);
				} finally {
					setLoading(false);
				}
			};
			if (selected) {
				const raw = isRawDetail(selected);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: card,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								padding: "14px 16px",
								borderBottom: `1px solid ${T$1.border}`
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setSelected(void 0),
									style: {
										border: 0,
										padding: 0,
										background: "transparent",
										color: T$1.brand,
										cursor: "pointer",
										fontSize: 13
									},
									children: "← 返回列表"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: {
										margin: "12px 0 4px",
										fontSize: 17,
										lineHeight: 1.4,
										color: T$1.labelPrimary
									},
									children: raw ? selected.captureId : selected.title
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										margin: 0,
										color: T$1.labelSecondary,
										fontSize: 12
									},
									children: raw ? `${selected.status} · ${selected.sourceType}${selected.capturedAt ? ` · ${selected.capturedAt}` : ""}` : `${selected.area} · ${selected.type}`
								}),
								tab === "drafts" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										margin: "8px 0 0",
										color: "#b27616",
										fontSize: 12
									},
									children: "AI 生成候选 · 等待人工审核 · 不会自动晋升为正式召回知识。"
								}) : null,
								raw ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										margin: "8px 0 0",
										color: T$1.labelSecondary,
										fontSize: 12
									},
									children: "原始证据包 · 只读预览 · episodic 使用取决于现有 OKS 查询与 Hook 配置。"
								}) : null
							]
						}),
						raw ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								margin: "12px 16px 0",
								padding: "10px",
								borderRadius: 8,
								background: T$1.bgLayer2,
								color: T$1.labelSecondary,
								fontSize: 12,
								lineHeight: 1.55
							},
							children: [
								"证据包：",
								selected.bundleId,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
								"包内文件数：",
								selected.fileCount
							]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("article", {
							style: {
								padding: "16px",
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
								color: T$1.labelPrimary,
								fontSize: 13,
								lineHeight: 1.7
							},
							children: selected.body || "此内容没有可预览的文本。"
						}),
						selected.bodyTruncated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								margin: "0 16px 16px",
								color: T$1.labelSecondary,
								fontSize: 12
							},
							children: "预览最多显示前 60,000 个字符。"
						}) : null
					]
				});
			}
			const pageItems = pageData?.items ?? [];
			const rawItems = rawData?.items ?? [];
			const items = tab === "raw" ? rawItems : pageItems;
			const total = tab === "raw" ? rawData?.total : pageData?.total;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: card,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: "14px 16px",
							borderBottom: `1px solid ${T$1.border}`
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									justifyContent: "space-between",
									gap: 12,
									alignItems: "flex-start"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: {
										margin: 0,
										color: T$1.labelPrimary,
										fontSize: 17
									},
									children: "我的 OKS 知识库"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										margin: "5px 0 0",
										color: T$1.labelSecondary,
										fontSize: 12
									},
									children: "Wiki 是已审核知识；Draft 需要人工审核；Raw 是原始证据。"
								})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: refresh,
									disabled: refreshing,
									style: {
										...button,
										opacity: refreshing ? .6 : 1
									},
									children: refreshing ? "刷新中…" : "刷新"
								})]
							}),
							diagnostics ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									marginTop: 10,
									padding: "9px 10px",
									background: T$1.bgLayer2,
									borderRadius: 8,
									color: T$1.labelSecondary,
									fontSize: 12,
									lineHeight: 1.55
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
										style: { color: T$1.labelPrimary },
										children: diagnostics.connected ? "已连接" : diagnostics.status
									}),
									": ",
									diagnostics.message,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
									"Wiki ",
									diagnostics.wikiCount,
									" · 审核草稿 ",
									diagnostics.draftCount,
									" · Raw 证据包 ",
									diagnostics.rawBundleCount,
									" · Raw 文件 ",
									diagnostics.rawFileCount,
									!diagnostics.connected && onOpenSettings ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: onOpenSettings,
										style: {
											...button,
											marginTop: 8
										},
										children: "打开系统设置"
									})] }) : null
								]
							}) : null,
							lastUpdated ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									marginTop: 7,
									color: T$1.labelSecondary,
									fontSize: 11
								},
								children: ["最近更新： ", lastUpdated.toLocaleTimeString()]
							}) : null
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							gap: 18,
							padding: "0 16px",
							borderBottom: `1px solid ${T$1.border}`,
							background: T$1.bgLayer2
						},
						children: [
							["wiki", "Wiki 知识"],
							["drafts", "审核草稿"],
							["raw", "Raw 原始资料"]
						].map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => changeTab(value),
							style: {
								border: 0,
								borderBottom: tab === value ? `2px solid ${T$1.brand}` : "2px solid transparent",
								padding: "10px 2px 8px",
								background: "transparent",
								color: tab === value ? T$1.labelPrimary : T$1.labelSecondary,
								cursor: "pointer",
								fontSize: 13,
								fontWeight: tab === value ? 600 : 500
							},
							children: label
						}, value))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: 8,
							padding: "12px 16px",
							borderBottom: `1px solid ${T$1.border}`
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							"aria-label": "搜索知识",
							value: query,
							onChange: (event) => setQuery(event.target.value),
							placeholder: tab === "wiki" ? "搜索 Wiki" : tab === "drafts" ? "搜索草稿" : "搜索 Raw 原始资料",
							style: input
						}), tab === "raw" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							"aria-label": "Raw 处理状态",
							value: rawStatus,
							onChange: (event) => setRawStatus(event.target.value),
							style: input,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: "全部状态"
							}), (rawData?.statuses ?? []).map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value,
								children: value
							}, value))]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								"aria-label": "知识领域",
								value: area,
								onChange: (event) => setArea(event.target.value),
								style: input,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: "全部领域"
								}), (pageData?.areas ?? []).map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value,
									children: value
								}, value))]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								"aria-label": "知识类型",
								value: type,
								onChange: (event) => setType(event.target.value),
								style: input,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: "全部类型"
								}), (pageData?.types ?? []).map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value,
									children: value
								}, value))]
							})]
						})]
					}),
					loading && total === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						style: {
							margin: 0,
							padding: "16px",
							color: T$1.labelSecondary,
							fontSize: 13
						},
						children: [
							"正在加载 ",
							tabLabel(tab),
							"…"
						]
					}) : null,
					error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							padding: "16px",
							color: T$1.labelSecondary,
							fontSize: 13
						},
						children: error
					}) : null,
					!loading && !error && items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							padding: "16px",
							color: T$1.labelSecondary,
							fontSize: 13
						},
						children: "暂无匹配内容。"
					}) : null,
					tab === "raw" && rawData?.truncated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							padding: "12px 16px",
							color: T$1.labelSecondary,
							fontSize: 12
						},
						children: "Raw 目录较大；当前仅显示首个安全扫描窗口。"
					}) : null,
					items.map((item) => tab === "raw" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => void open(item.id),
						style: {
							display: "block",
							width: "100%",
							textAlign: "left",
							padding: "14px 16px",
							border: 0,
							borderBottom: `1px solid ${T$1.border}`,
							background: "transparent",
							color: T$1.labelPrimary,
							cursor: "pointer"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 14,
									fontWeight: 600,
									lineHeight: 1.45
								},
								children: item.captureId
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									marginTop: 3,
									color: T$1.labelSecondary,
									fontSize: 12
								},
								children: [
									item.status,
									" · ",
									item.sourceType,
									item.capturedAt ? ` · ${item.capturedAt}` : "",
									" · ",
									item.fileCount,
									" 个文件"
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									margin: "7px 0 0",
									color: T$1.labelSecondary,
									fontSize: 12,
									lineHeight: 1.5
								},
								children: item.summary
							})
						]
					}, item.id) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => void open(item.slug),
						style: {
							display: "block",
							width: "100%",
							textAlign: "left",
							padding: "14px 16px",
							border: 0,
							borderBottom: `1px solid ${T$1.border}`,
							background: "transparent",
							color: T$1.labelPrimary,
							cursor: "pointer"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 14,
									fontWeight: 600,
									lineHeight: 1.45
								},
								children: item.title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									marginTop: 3,
									color: T$1.labelSecondary,
									fontSize: 12
								},
								children: [
									item.area,
									" · ",
									item.type,
									item.created ? ` · ${item.created}` : ""
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									margin: "7px 0 0",
									color: T$1.labelSecondary,
									fontSize: 12,
									lineHeight: 1.5
								},
								children: item.summary
							})
						]
					}, item.slug))
				]
			});
		}
		//#endregion
		//#region src/client/OksPanel.tsx
		/** Dedicated OKS page: knowledge browser first, advanced settings second. */
		const T = {
			border: "var(--dsw-alias-border-l2)",
			bgLayer2: "var(--dsw-alias-bg-layer-2)",
			labelPrimary: "var(--dsw-alias-label-primary)",
			labelSecondary: "var(--dsw-alias-label-secondary)",
			brand: "var(--dsw-alias-brand-primary)"
		};
		function KnowledgeRecallSwitch({ scope }) {
			const snap = (0, react.useSyncExternalStore)((listener) => scope.subscribe(listener), () => scope.getSnapshot(), () => scope.getSnapshot());
			const enabled = (snap.value?.prestep_enabled ?? true) !== false;
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const update = async (next) => {
				if (!snap.writable || saving) return;
				setSaving(true);
				setError("");
				try {
					await scope.set("prestep_enabled", next);
				} catch {
					setError("召回开关保存失败，请稍后重试。");
				} finally {
					setSaving(false);
				}
			};
			if (snap.status === "unavailable") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					margin: "0 0 12px",
					padding: "12px 14px",
					border: `1px solid ${T.border}`,
					borderRadius: 10,
					background: T.bgLayer2
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: 12,
						justifyContent: "space-between",
						alignItems: "flex-start"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { minWidth: 0 },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 13,
								fontWeight: 600,
								color: T.labelPrimary
							},
							children: "回答时自动参考我的知识"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								margin: "4px 0 0",
								fontSize: 12,
								lineHeight: 1.5,
								color: T.labelSecondary
							},
							children: "当问题相关时，Agent 会优先参考已审核的 Wiki 知识。关闭后不会影响手动召回或工具调用后的记忆提示。"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						role: "switch",
						"aria-checked": enabled,
						disabled: !snap.writable || saving || snap.status === "loading",
						onClick: () => void update(!enabled),
						style: {
							flex: "0 0 auto",
							minWidth: 56,
							border: 0,
							borderRadius: 999,
							padding: "7px 10px",
							background: enabled ? T.brand : T.border,
							color: "#fff",
							cursor: snap.writable && !saving ? "pointer" : "not-allowed",
							fontSize: 12,
							fontWeight: 600
						},
						children: saving ? "保存中…" : enabled ? "开启" : "关闭"
					})]
				}), error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						marginTop: 6,
						fontSize: 11,
						color: T.labelSecondary
					},
					children: error
				}) : null]
			});
		}
		function OksPanel({ scope, rpc }) {
			const [tab, setTab] = (0, react.useState)("library");
			const tabStyle = (active) => ({
				border: 0,
				borderBottom: active ? `2px solid ${T.brand}` : "2px solid transparent",
				padding: "10px 2px 8px",
				marginRight: 18,
				background: "transparent",
				color: active ? T.labelPrimary : T.labelSecondary,
				cursor: "pointer",
				fontSize: 13,
				fontWeight: active ? 600 : 500
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					marginBottom: 12,
					borderBottom: `1px solid ${T.border}`,
					background: T.bgLayer2,
					padding: "0 12px"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setTab("library"),
					style: tabStyle(tab === "library"),
					children: "知识库"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setTab("settings"),
					style: tabStyle(tab === "settings"),
					children: "系统设置"
				})]
			}), tab === "library" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KnowledgeRecallSwitch, { scope }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiBrowser, {
				rpc,
				onOpenSettings: () => setTab("settings")
			})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecallParamsCard, { scope })] });
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
			const settingsCard = (props) => RecallParamsCard({
				scope,
				...props
			});
			const panel = (props) => OksPanel({
				scope,
				rpc: ctx.connection.rpc,
				...props
			});
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: "oks",
				inject: () => ({})
			}, settingsCard));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "oks",
				order: 20,
				label: () => "OKS",
				inject: () => ({})
			}, panel));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map