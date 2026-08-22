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
			prestep_enabled: true,
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
			const [expanded, setExpanded] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: card$1,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-expanded": expanded,
					"aria-controls": "oks-settings-content",
					onClick: () => setExpanded((value) => !value),
					style: {
						display: "flex",
						alignItems: "center",
						gap: 12,
						width: "100%",
						border: 0,
						padding: "14px 16px",
						background: "transparent",
						color: T$2.labelPrimary,
						textAlign: "left",
						cursor: "pointer"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
							children: expanded ? "改 → 自动写 ~/.oks/config.json + settings/recall.yaml" : `当前：recall ${Number(v.recall_floor ?? .7)} · 每次 ${Number(v.recall_topn ?? 3)} 条`
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						style: {
							flex: "0 0 auto",
							color: T$2.labelSecondary,
							fontSize: 16
						},
						children: expanded ? "⌃" : "⌄"
					})]
				}), expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					id: "oks-settings-content",
					role: "region",
					"aria-label": "OKS 知识库配置详情",
					style: { borderTop: `1px solid ${T$2.border}` },
					children: !snap.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { padding: "14px 16px" },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								margin: 0,
								color: T$2.labelSecondary,
								fontSize: 13
							},
							children: "只读"
						})
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
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
									id: gid("pe"),
									lab: "自动召回",
									h: "开启后，每轮回答前自动召回相关 Wiki；关闭后仍可手动调用 oks_recall。",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										id: gid("pe"),
										type: "button",
										role: "switch",
										"aria-checked": Boolean(v.prestep_enabled ?? true),
										onClick: () => up("prestep_enabled", !Boolean(v.prestep_enabled ?? true)),
										style: {
											alignSelf: "flex-start",
											minWidth: 68,
											border: 0,
											borderRadius: 999,
											padding: "7px 11px",
											background: Boolean(v.prestep_enabled ?? true) ? T$2.brand : T$2.border,
											color: "#fff",
											cursor: "pointer",
											fontSize: 12,
											fontWeight: 600
										},
										children: Boolean(v.prestep_enabled ?? true) ? "已开启" : "已关闭"
									})
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
					] })
				}) : null]
			});
		}
		//#endregion
		//#region src/client/rpc.ts
		/** Keep the OKS surface fail-closed when a host exposes a transient/incompatible RPC face. */
		function callOksRpc(rpc, channel, endpoint, payload, signal) {
			const candidate = rpc;
			const nested = candidate && typeof candidate.rpc === "object" ? candidate.rpc : void 0;
			const owner = candidate && typeof candidate.call === "function" ? candidate : nested && typeof nested.call === "function" ? nested : void 0;
			const call = owner && owner.call;
			if (!call) return Promise.resolve({
				ok: false,
				error: { message: "OKS 连接接口暂不可用" }
			});
			try {
				return Promise.resolve(call.call(owner, channel, endpoint, payload, signal));
			} catch (error) {
				return Promise.reject(error);
			}
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
		function asOverview$1(value) {
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
				callOksRpc(rpc, "/oks", tab === "raw" ? "raw-list" : tab === "drafts" ? "draft-list" : "wiki-list", tab === "raw" ? {
					query,
					status: rawStatus
				} : {
					query,
					area,
					type
				}, controller.signal).then((result) => {
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
				Promise.all([callOksRpc(rpc, "/oks", "overview", {}, controller.signal), callOksRpc(rpc, "/oks", "diagnostics", {}, controller.signal)]).then(([overviewResult, diagnosticsResult]) => {
					if (controller.signal.aborted) return;
					const nextOverview = overviewResult.ok ? asOverview$1(overviewResult.value) : void 0;
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
					const result = await callOksRpc(rpc, "/oks", tab === "wiki" ? "wiki-get" : tab === "drafts" ? "draft-get" : "raw-get", tab === "raw" ? { id } : { slug: id });
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
		/** Compact OKS launcher with an opt-in knowledge workspace. */
		const launcherPositionKey = "dsh-oks.launcher-position.v1";
		const defaultLauncherPosition = {
			top: 72,
			right: 18
		};
		function readLauncherPosition() {
			if (typeof window === "undefined") return defaultLauncherPosition;
			try {
				const raw = window.localStorage.getItem(launcherPositionKey);
				if (!raw) return defaultLauncherPosition;
				const parsed = JSON.parse(raw);
				if (typeof parsed.top !== "number" || typeof parsed.right !== "number") return defaultLauncherPosition;
				return {
					top: Math.max(12, parsed.top),
					right: Math.max(12, parsed.right)
				};
			} catch {
				return defaultLauncherPosition;
			}
		}
		function writeLauncherPosition(position) {
			try {
				window.localStorage.setItem(launcherPositionKey, JSON.stringify(position));
			} catch {}
		}
		const surfaceListeners = /* @__PURE__ */ new Set();
		let surfaceState = {
			open: false,
			view: "overview"
		};
		function openOksSurface(view = "overview") {
			surfaceState = {
				open: true,
				view
			};
			surfaceListeners.forEach((listener) => listener());
		}
		function closeOksSurface() {
			if (!surfaceState.open) return;
			surfaceState = {
				...surfaceState,
				open: false
			};
			surfaceListeners.forEach((listener) => listener());
		}
		const oksSurfaceStore = {
			subscribe(listener) {
				surfaceListeners.add(listener);
				return () => surfaceListeners.delete(listener);
			},
			getSnapshot() {
				return surfaceState;
			}
		};
		const T = {
			border: "var(--dsw-alias-border-l2)",
			borderSoft: "var(--dsw-alias-border-l1)",
			bgBase: "var(--dsw-alias-bg-base)",
			bgLayer1: "var(--dsw-alias-bg-layer-1)",
			bgLayer2: "var(--dsw-alias-bg-layer-2)",
			bgLayer3: "var(--dsw-alias-bg-layer-3)",
			labelPrimary: "var(--dsw-alias-label-primary)",
			labelSecondary: "var(--dsw-alias-label-secondary)",
			brand: "var(--dsw-alias-brand-primary)",
			brandSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)",
			brandBorder: "color-mix(in srgb, var(--dsw-alias-brand-primary) 32%, var(--dsw-alias-border-l2))",
			success: "#16a36b",
			warning: "#b9852f",
			danger: "#b54747",
			shadow: "0 18px 48px rgba(15, 23, 42, 0.18)"
		};
		const navButton = (active) => ({
			display: "flex",
			width: "100%",
			alignItems: "center",
			gap: 9,
			border: 0,
			borderLeft: active ? `3px solid ${T.brand}` : "3px solid transparent",
			borderRadius: 7,
			padding: "9px 10px",
			background: active ? T.bgLayer2 : "transparent",
			color: active ? T.labelPrimary : T.labelSecondary,
			cursor: "pointer",
			fontSize: 13,
			fontWeight: active ? 600 : 500,
			textAlign: "left"
		});
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
		function asActivityList(value) {
			if (!value || typeof value !== "object") return {
				items: [],
				truncated: false
			};
			const data = value;
			return {
				items: Array.isArray(data.items) ? data.items : [],
				truncated: data.truncated === true
			};
		}
		function ActivityPanel({ rpc, compact = false }) {
			const [data, setData] = (0, react.useState)({
				items: [],
				truncated: false
			});
			const [loading, setLoading] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				const load = () => {
					setLoading(true);
					callOksRpc(rpc, "/oks", "activity", { limit: compact ? 5 : 12 }, controller.signal).then((result) => {
						if (!controller.signal.aborted && result.ok) setData(asActivityList(result.value));
					}).catch(() => void 0).finally(() => {
						if (!controller.signal.aborted) setLoading(false);
					});
				};
				load();
				const timer = window.setInterval(load, 3e4);
				return () => {
					controller.abort();
					window.clearInterval(timer);
				};
			}, [compact, rpc]);
			const items = data.items;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"aria-label": "活动时间线",
				style: {
					border: `1px solid ${T.border}`,
					borderRadius: 10,
					background: T.bgLayer3,
					overflow: "hidden"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						justifyContent: "space-between",
						gap: 8,
						alignItems: "center",
						padding: "11px 12px",
						borderBottom: `1px solid ${T.border}`
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: T.labelPrimary,
							fontSize: 13,
							fontWeight: 600
						},
						children: "活动时间线"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							color: T.labelSecondary,
							fontSize: 11
						},
						children: loading ? "同步中…" : "当前进程"
					})]
				}), items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						margin: 0,
						padding: 12,
						color: T.labelSecondary,
						fontSize: 12,
						lineHeight: 1.5
					},
					children: "暂无活动记录。开始一次召回或打开知识条目后，这里会显示真实的 OKS/Host 事件。"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						padding: "11px 12px",
						borderBottom: `1px solid ${T.border}`
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							justifyContent: "space-between",
							gap: 8
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: {
								color: item.status === "error" ? "#b54747" : T.labelPrimary,
								fontSize: 12
							},
							children: item.label
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
							style: {
								color: T.labelSecondary,
								fontSize: 11
							},
							children: new Date(item.at).toLocaleTimeString()
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							marginTop: 4,
							color: T.labelSecondary,
							fontSize: 11,
							lineHeight: 1.45
						},
						children: item.detail
					})]
				}, item.id)), data.truncated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						padding: "8px 12px",
						color: T.labelSecondary,
						fontSize: 11
					},
					children: "仅显示最近的有界记录。"
				}) : null] })]
			});
		}
		function asTraceList(value) {
			if (!value || typeof value !== "object") return {
				items: [],
				truncated: false
			};
			const data = value;
			return {
				items: Array.isArray(data.items) ? data.items : [],
				truncated: data.truncated === true
			};
		}
		function RecallTracePanel({ rpc, compact = false }) {
			const [data, setData] = (0, react.useState)({
				items: [],
				truncated: false
			});
			const [loading, setLoading] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				const load = () => {
					setLoading(true);
					callOksRpc(rpc, "/oks", "recall-trace", { limit: compact ? 5 : 12 }, controller.signal).then((result) => {
						if (!controller.signal.aborted && result.ok) setData(asTraceList(result.value));
					}).catch(() => void 0).finally(() => {
						if (!controller.signal.aborted) setLoading(false);
					});
				};
				load();
				const timer = window.setInterval(load, 3e4);
				return () => {
					controller.abort();
					window.clearInterval(timer);
				};
			}, [rpc]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"aria-label": "召回轨迹",
				style: {
					border: `1px solid ${T.border}`,
					borderRadius: 10,
					background: T.bgLayer3,
					overflow: "hidden"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						justifyContent: "space-between",
						gap: 8,
						alignItems: "center",
						padding: "11px 12px",
						borderBottom: `1px solid ${T.border}`
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: T.labelPrimary,
							fontSize: 13,
							fontWeight: 600
						},
						children: "召回轨迹"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							color: T.labelSecondary,
							fontSize: 11
						},
						children: loading ? "同步中…" : compact ? "最近 5 条" : "仅显示摘要"
					})]
				}), data.items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						margin: 0,
						padding: 12,
						color: T.labelSecondary,
						fontSize: 12,
						lineHeight: 1.5
					},
					children: "暂无召回记录。下一次自动召回、工具召回或工具后提示会出现在这里。"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [data.items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						padding: "11px 12px",
						borderBottom: `1px solid ${T.border}`
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "space-between",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", {
								style: {
									color: item.status === "error" ? "#b54747" : T.labelPrimary,
									fontSize: 12
								},
								children: [
									item.phase,
									" · ",
									item.status
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
								style: {
									color: T.labelSecondary,
									fontSize: 11
								},
								children: new Date(item.at).toLocaleTimeString()
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								marginTop: 4,
								color: T.labelSecondary,
								fontSize: 11,
								lineHeight: 1.45
							},
							children: [
								"候选 ",
								item.candidateCount,
								" 个",
								typeof item.threshold === "number" ? ` · 阈值 ${item.threshold}` : "",
								typeof item.topRelevance === "number" ? ` · 最高相关度 ${item.topRelevance.toFixed(2)}` : ""
							]
						}),
						item.matches.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								marginTop: 4,
								color: T.labelSecondary,
								fontSize: 11,
								lineHeight: 1.45
							},
							children: ["命中：", item.matches.join("、")]
						}) : null
					]
				}, item.id)), data.truncated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						padding: "8px 12px",
						color: T.labelSecondary,
						fontSize: 11
					},
					children: "仅显示最近的有界记录。"
				}) : null] })]
			});
		}
		function asOverview(value) {
			if (!value || typeof value !== "object") return {
				wikiCount: 0,
				draftCount: 0,
				rawFileCount: 0,
				rawBundleCount: 0
			};
			const data = value;
			return {
				wikiCount: typeof data.wikiCount === "number" ? data.wikiCount : 0,
				draftCount: typeof data.draftCount === "number" ? data.draftCount : 0,
				rawFileCount: typeof data.rawFileCount === "number" ? data.rawFileCount : 0,
				rawBundleCount: typeof data.rawBundleCount === "number" ? data.rawBundleCount : 0,
				truncated: data.truncated === true
			};
		}
		function WorkspaceOverview({ scope, rpc, onOpen, openSidebar }) {
			const [summary, setSummary] = (0, react.useState)({
				wikiCount: 0,
				draftCount: 0,
				rawFileCount: 0,
				rawBundleCount: 0
			});
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				callOksRpc(rpc, "/oks", "overview", {}, controller.signal).then((result) => {
					if (!controller.signal.aborted && result.ok) setSummary(asOverview(result.value));
				}).catch(() => void 0);
				return () => controller.abort();
			}, [rpc]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						marginBottom: 12,
						padding: "14px 16px",
						border: `1px solid ${T.border}`,
						borderRadius: 10,
						background: T.bgLayer3
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								color: T.labelPrimary,
								fontSize: 18,
								fontWeight: 650
							},
							children: "OKS 上下文工作区"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								margin: "6px 0 0",
								color: T.labelSecondary,
								fontSize: 12,
								lineHeight: 1.55
							},
							children: "集中查看知识生命周期、召回活动和设置。工作区只在你需要时展开，不改变 DSH 原有聊天体验。"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexWrap: "wrap",
								gap: 8,
								marginTop: 12
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										if (!openSidebar?.()) openOksSurface("overview");
									},
									style: {
										border: `1px solid ${T.brandBorder}`,
										borderRadius: 7,
										padding: "7px 10px",
										background: T.brandSoft,
										color: T.brand,
										cursor: "pointer",
										fontSize: 12,
										fontWeight: 600
									},
									children: "在侧边栏打开"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => onOpen("knowledge"),
									style: {
										border: `1px solid ${T.border}`,
										borderRadius: 7,
										padding: "7px 10px",
										background: T.bgLayer2,
										color: T.labelPrimary,
										cursor: "pointer",
										fontSize: 12
									},
									children: "浏览知识库"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => onOpen("activity"),
									style: {
										border: `1px solid ${T.border}`,
										borderRadius: 7,
										padding: "7px 10px",
										background: T.bgLayer2,
										color: T.labelPrimary,
										cursor: "pointer",
										fontSize: 12
									},
									children: "查看活动"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => onOpen("settings"),
									style: {
										border: `1px solid ${T.border}`,
										borderRadius: 7,
										padding: "7px 10px",
										background: T.bgLayer2,
										color: T.labelPrimary,
										cursor: "pointer",
										fontSize: 12
									},
									children: "打开设置"
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"aria-label": "知识库摘要",
					style: {
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
						gap: 8,
						marginBottom: 12
					},
					children: [
						["Wiki", summary.wikiCount],
						["草稿", summary.draftCount],
						["Raw 文件", summary.rawFileCount],
						["Raw 包", summary.rawBundleCount]
					].map(([label, count]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: "10px 12px",
							border: `1px solid ${T.border}`,
							borderRadius: 9,
							background: T.bgLayer3
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								color: T.labelSecondary,
								fontSize: 11
							},
							children: label
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: {
								display: "block",
								marginTop: 4,
								color: T.labelPrimary,
								fontSize: 18
							},
							children: count
						})]
					}, String(label)))
				}),
				summary.truncated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						marginBottom: 12,
						color: T.labelSecondary,
						fontSize: 11
					},
					children: "统计已达到扫描上限，进入知识库查看完整列表。"
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiBrowser, {
					rpc,
					onOpenSettings: () => onOpen("settings")
				})
			] });
		}
		function SurfaceTab({ active, children, onClick }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "tab",
				"aria-selected": active,
				onClick,
				style: {
					flex: "1 1 0",
					minWidth: 0,
					border: 0,
					borderBottom: `2px solid ${active ? T.brand : "transparent"}`,
					padding: "10px 6px 9px",
					background: "transparent",
					color: active ? T.labelPrimary : T.labelSecondary,
					cursor: "pointer",
					fontSize: 12,
					fontWeight: active ? 650 : 500,
					whiteSpace: "nowrap"
				},
				children
			});
		}
		function CompactOverview({ scope, rpc, onView }) {
			const snap = (0, react.useSyncExternalStore)((listener) => scope.subscribe(listener), () => scope.getSnapshot(), () => scope.getSnapshot());
			const [summary, setSummary] = (0, react.useState)({
				wikiCount: 0,
				draftCount: 0,
				rawFileCount: 0,
				rawBundleCount: 0
			});
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				callOksRpc(rpc, "/oks", "overview", {}, controller.signal).then((result) => {
					if (!controller.signal.aborted && result.ok) setSummary(asOverview(result.value));
				}).catch(() => void 0);
				return () => controller.abort();
			}, [rpc]);
			const connected = snap.status === "ready";
			const stats = [
				["Wiki", summary.wikiCount],
				["草稿", summary.draftCount],
				["Raw 文件", summary.rawFileCount],
				["Raw 包", summary.rawBundleCount]
			];
			const metricMeta = {
				Wiki: {
					glyph: "W",
					tint: T.brand
				},
				草稿: {
					glyph: "D",
					tint: T.warning
				},
				"Raw 文件": {
					glyph: "R",
					tint: T.success
				},
				"Raw 包": {
					glyph: "B",
					tint: "#8068c7"
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						marginBottom: 14,
						padding: "16px 15px 15px",
						border: `1px solid ${T.brandBorder}`,
						borderRadius: 14,
						background: T.bgLayer1,
						boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								color: T.brand,
								fontSize: 10,
								letterSpacing: "0.12em",
								fontWeight: 700
							},
							children: "OPEN KNOWLEDGE STUDIO"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 8,
								marginTop: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									color: T.labelPrimary,
									fontSize: 18,
									letterSpacing: "-0.02em"
								},
								children: "上下文概览"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									display: "inline-flex",
									alignItems: "center",
									gap: 5,
									border: `1px solid ${connected ? "color-mix(in srgb, #16a36b 30%, transparent)" : T.border}`,
									borderRadius: 999,
									padding: "4px 8px",
									background: connected ? "color-mix(in srgb, #16a36b 8%, transparent)" : T.bgLayer2,
									color: connected ? T.success : T.labelSecondary,
									fontSize: 11,
									fontWeight: 600
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									style: {
										width: 6,
										height: 6,
										borderRadius: "50%",
										background: connected ? T.success : T.warning
									}
								}), connected ? "已连接" : snap.status === "loading" ? "加载中" : "需检查"]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								margin: "7px 0 0",
								color: T.labelSecondary,
								fontSize: 12,
								lineHeight: 1.55
							},
							children: "把知识、召回和活动收拢到当前对话旁边。"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 7,
								marginTop: 13
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => onView("knowledge"),
								style: {
									border: `1px solid ${T.brandBorder}`,
									borderRadius: 7,
									padding: "7px 10px",
									background: T.brandSoft,
									color: T.brand,
									cursor: "pointer",
									fontSize: 12,
									fontWeight: 650
								},
								children: "浏览知识库"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => onView("trace"),
								style: {
									border: `1px solid ${T.borderSoft}`,
									borderRadius: 7,
									padding: "7px 10px",
									background: T.bgLayer2,
									color: T.labelPrimary,
									cursor: "pointer",
									fontSize: 12
								},
								children: "看召回"
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KnowledgeRecallSwitch, { scope }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"aria-label": "知识库摘要",
					style: {
						display: "grid",
						gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
						gap: 8,
						marginBottom: 14
					},
					children: stats.map(([label, count]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							position: "relative",
							minWidth: 0,
							padding: "11px 12px 10px 15px",
							border: `1px solid ${T.borderSoft}`,
							borderRadius: 10,
							background: T.bgLayer2,
							overflow: "hidden"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: {
									position: "absolute",
									left: 0,
									top: 0,
									bottom: 0,
									width: 3,
									background: metricMeta[label].tint
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 7,
									color: T.labelSecondary,
									fontSize: 11
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									style: {
										display: "inline-grid",
										placeItems: "center",
										width: 18,
										height: 18,
										borderRadius: 6,
										background: `color-mix(in srgb, ${metricMeta[label].tint} 12%, transparent)`,
										color: metricMeta[label].tint,
										fontSize: 10,
										fontWeight: 700
									},
									children: metricMeta[label].glyph
								}), label]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									display: "block",
									marginTop: 6,
									color: T.labelPrimary,
									fontSize: 20,
									letterSpacing: "-0.03em"
								},
								children: count
							})
						]
					}, label))
				}),
				summary.truncated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						marginBottom: 12,
						padding: "8px 10px",
						borderRadius: 8,
						background: T.bgLayer2,
						color: T.labelSecondary,
						fontSize: 11
					},
					children: "统计已达到扫描上限，进入知识库查看完整列表。"
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gap: 10
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecallTracePanel, {
						rpc: true,
						compact: true
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityPanel, {
						rpc: true,
						compact: true
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onView("knowledge"),
					style: {
						width: "100%",
						marginTop: 12,
						border: `1px solid ${T.border}`,
						borderRadius: 9,
						padding: "9px 12px",
						background: T.bgLayer2,
						color: T.labelPrimary,
						cursor: "pointer",
						fontSize: 12,
						fontWeight: 600
					},
					children: "进入完整知识库"
				})
			] });
		}
		function SidebarTab({ scope, rpc }) {
			const [view, setView] = (0, react.useState)("overview");
			const connected = (0, react.useSyncExternalStore)((listener) => scope.subscribe(listener), () => scope.getSnapshot(), () => scope.getSnapshot()).status === "ready";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					height: "100%",
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					background: T.bgBase,
					color: T.labelPrimary
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						style: {
							flex: "0 0 auto",
							padding: "18px 16px 14px",
							borderBottom: `1px solid ${T.borderSoft}`,
							background: T.bgLayer1
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 8
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									style: {
										width: 8,
										height: 8,
										borderRadius: "50%",
										background: connected ? T.success : T.warning
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										color: T.brand,
										fontSize: 10,
										letterSpacing: "0.12em",
										fontWeight: 700
									},
									children: "OKS CONTEXT"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
								style: {
									margin: "8px 0 4px",
									color: T.labelPrimary,
									fontSize: 20,
									letterSpacing: "-0.03em"
								},
								children: "知识上下文"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									margin: 0,
									color: T.labelSecondary,
									fontSize: 12,
									lineHeight: 1.5
								},
								children: connected ? "已连接到本地知识库" : "连接状态需要检查"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
						role: "tablist",
						"aria-label": "OKS 侧边栏视图",
						style: {
							flex: "0 0 auto",
							display: "flex",
							gap: 2,
							padding: "0 8px",
							borderBottom: `1px solid ${T.borderSoft}`,
							background: T.bgLayer1
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SurfaceTab, {
								active: view === "overview",
								onClick: () => setView("overview"),
								children: "概览"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SurfaceTab, {
								active: view === "knowledge",
								onClick: () => setView("knowledge"),
								children: "知识库"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SurfaceTab, {
								active: view === "trace",
								onClick: () => setView("trace"),
								children: "召回"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SurfaceTab, {
								active: view === "activity",
								onClick: () => setView("activity"),
								children: "活动"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							minHeight: 0,
							flex: 1,
							overflowY: "auto",
							overflowX: "hidden",
							padding: 12
						},
						children: [
							view === "overview" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompactOverview, {
								scope,
								rpc,
								onView: setView
							}) : null,
							view === "knowledge" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiBrowser, { rpc }) : null,
							view === "trace" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecallTracePanel, { rpc }) : null,
							view === "activity" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityPanel, { rpc }) : null
						]
					})
				]
			});
		}
		function OksSidebarTab({ scope, rpc }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SidebarTab, {
				scope,
				rpc
			});
		}
		function OksGlobalSurface({ scope, rpc, openSidebar }) {
			const surface = (0, react.useSyncExternalStore)(oksSurfaceStore.subscribe, oksSurfaceStore.getSnapshot, oksSurfaceStore.getSnapshot);
			const snap = (0, react.useSyncExternalStore)((listener) => scope.subscribe(listener), () => scope.getSnapshot(), () => scope.getSnapshot());
			const launcherRef = (0, react.useRef)(null);
			const closeRef = (0, react.useRef)(null);
			const [launcherPosition, setLauncherPosition] = (0, react.useState)(readLauncherPosition);
			const [launcherDragging, setLauncherDragging] = (0, react.useState)(false);
			const launcherDragRef = (0, react.useRef)(null);
			const launcherMovedRef = (0, react.useRef)(false);
			const connected = snap.status === "ready";
			const rpcShape = rpc;
			const rpcAvailable = Boolean(rpcShape && typeof rpcShape.call === "function");
			(0, react.useEffect)(() => {
				if (surface.open) closeRef.current?.focus();
				else launcherRef.current?.focus();
			}, [surface.open]);
			(0, react.useEffect)(() => {
				if (!surface.open) return;
				const onKeyDown = (event) => {
					if (event.key === "Escape") closeOksSurface();
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [surface.open]);
			const toggle = () => {
				if (surface.open) return closeOksSurface();
				if (openSidebar?.()) return;
				openOksSurface(surface.view);
			};
			const onLauncherPointerDown = (event) => {
				event.currentTarget.setPointerCapture(event.pointerId);
				launcherMovedRef.current = false;
				launcherDragRef.current = {
					pointerId: event.pointerId,
					startX: event.clientX,
					startY: event.clientY,
					startTop: launcherPosition.top,
					startRight: launcherPosition.right,
					moved: false
				};
				setLauncherDragging(true);
			};
			const onLauncherPointerMove = (event) => {
				const drag = launcherDragRef.current;
				if (!drag) return;
				const dx = event.clientX - drag.startX;
				const dy = event.clientY - drag.startY;
				if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
					drag.moved = true;
					launcherMovedRef.current = true;
				}
				const bounds = event.currentTarget.getBoundingClientRect();
				const next = {
					top: Math.min(Math.max(12, drag.startTop + dy), Math.max(12, window.innerHeight - bounds.height - 12)),
					right: Math.min(Math.max(12, drag.startRight - dx), Math.max(12, window.innerWidth - bounds.width - 12))
				};
				setLauncherPosition(next);
				writeLauncherPosition(next);
			};
			const onLauncherPointerUp = (event) => {
				if (!launcherDragRef.current) return;
				if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
				launcherDragRef.current = null;
				setLauncherDragging(false);
			};
			const onLauncherClick = () => {
				if (launcherMovedRef.current) {
					launcherMovedRef.current = false;
					return;
				}
				toggle();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					position: "absolute",
					inset: 0,
					zIndex: 30,
					pointerEvents: "none"
				},
				children: !surface.open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					ref: launcherRef,
					type: "button",
					"aria-expanded": "false",
					"aria-controls": "oks-context-panel",
					"aria-label": "展开 OKS 上下文面板",
					title: "拖动移动 OKS 入口，点击展开",
					onClick: onLauncherClick,
					onPointerDown: onLauncherPointerDown,
					onPointerMove: onLauncherPointerMove,
					onPointerUp: onLauncherPointerUp,
					onPointerCancel: onLauncherPointerUp,
					style: {
						pointerEvents: "auto",
						position: "absolute",
						top: launcherPosition.top,
						right: launcherPosition.right,
						display: "inline-flex",
						alignItems: "center",
						gap: 8,
						border: `1px solid ${T.brandBorder}`,
						borderRadius: 999,
						padding: "9px 13px",
						background: T.bgLayer1,
						color: T.labelPrimary,
						boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
						cursor: launcherDragging ? "grabbing" : "grab",
						fontSize: 12,
						fontWeight: 650,
						touchAction: "none",
						userSelect: "none"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							style: {
								width: 7,
								height: 7,
								borderRadius: "50%",
								background: connected ? T.success : T.warning
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "OKS" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								color: T.labelSecondary,
								fontWeight: 500
							},
							children: connected ? "上下文" : "检查设置"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							style: {
								color: T.brand,
								fontSize: 14
							},
							children: "›"
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					id: "oks-context-panel",
					role: "dialog",
					"aria-labelledby": "oks-context-title",
					style: {
						pointerEvents: "auto",
						position: "absolute",
						top: 16,
						right: 12,
						bottom: 12,
						width: "min(390px, calc(100vw - 24px))",
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
						border: `1px solid ${T.brandBorder}`,
						borderRadius: 16,
						background: T.bgBase,
						boxShadow: T.shadow
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 12,
								padding: "14px 15px 12px",
								borderBottom: `1px solid ${T.borderSoft}`,
								background: T.bgLayer1
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { minWidth: 0 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										alignItems: "center",
										gap: 8
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										"aria-hidden": "true",
										style: {
											width: 8,
											height: 8,
											borderRadius: "50%",
											background: connected ? T.success : T.warning
										}
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
										id: "oks-context-title",
										style: {
											color: T.labelPrimary,
											fontSize: 15
										},
										children: "OKS 上下文"
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										marginTop: 4,
										color: T.labelSecondary,
										fontSize: 11
									},
									children: connected ? "知识库已连接 · 实时摘要" : "连接状态需要检查"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								ref: closeRef,
								type: "button",
								"aria-expanded": "true",
								"aria-controls": "oks-context-panel",
								"aria-label": "收起 OKS 上下文面板",
								onClick: closeOksSurface,
								style: {
									border: `1px solid ${T.border}`,
									borderRadius: 8,
									padding: "6px 9px",
									background: T.bgLayer2,
									color: T.labelSecondary,
									cursor: "pointer",
									fontSize: 12
								},
								children: "收起"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
							role: "tablist",
							"aria-label": "OKS 上下文视图",
							style: {
								display: "flex",
								gap: 2,
								padding: "0 8px",
								borderBottom: `1px solid ${T.borderSoft}`,
								background: T.bgLayer1
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SurfaceTab, {
									active: surface.view === "overview",
									onClick: () => openOksSurface("overview"),
									children: "概览"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SurfaceTab, {
									active: surface.view === "knowledge",
									onClick: () => openOksSurface("knowledge"),
									children: "知识库"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SurfaceTab, {
									active: surface.view === "trace",
									onClick: () => openOksSurface("trace"),
									children: "召回"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SurfaceTab, {
									active: surface.view === "activity",
									onClick: () => openOksSurface("activity"),
									children: "活动"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								minHeight: 0,
								flex: 1,
								overflowY: "auto",
								padding: 12,
								background: T.bgBase
							},
							children: [
								!rpcAvailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									role: "status",
									style: {
										padding: 14,
										border: `1px solid ${T.border}`,
										borderRadius: 10,
										background: T.bgLayer2,
										color: T.labelSecondary,
										fontSize: 12,
										lineHeight: 1.55
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
										style: {
											display: "block",
											marginBottom: 5,
											color: T.labelPrimary
										},
										children: "OKS 连接接口暂不可用"
									}), "当前 DSH 连接正在初始化，面板已保持安全降级，不会影响原有对话。请刷新页面后重试。"]
								}) : null,
								rpcAvailable && surface.view === "overview" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompactOverview, {
									scope,
									rpc,
									onView: openOksSurface
								}) : null,
								rpcAvailable && surface.view === "knowledge" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiBrowser, {
									rpc,
									onOpenSettings: () => openOksSurface("overview")
								}) : null,
								rpcAvailable && surface.view === "trace" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecallTracePanel, { rpc }) : null,
								rpcAvailable && surface.view === "activity" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityPanel, { rpc }) : null
							]
						})
					]
				})
			});
		}
		function OksPanel({ scope, rpc, openSidebar }) {
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [view, setView] = (0, react.useState)("overview");
			const [narrow, setNarrow] = (0, react.useState)(false);
			const launcherRef = (0, react.useRef)(null);
			const workspaceRef = (0, react.useRef)(null);
			const snap = (0, react.useSyncExternalStore)((listener) => scope.subscribe(listener), () => scope.getSnapshot(), () => scope.getSnapshot());
			(0, react.useEffect)(() => {
				if (!expanded) launcherRef.current?.focus();
			}, [expanded]);
			(0, react.useEffect)(() => {
				if (!expanded) return;
				const onKeyDown = (event) => {
					if (event.key === "Escape") setExpanded(false);
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [expanded]);
			(0, react.useEffect)(() => {
				if (!expanded) {
					setNarrow(false);
					return;
				}
				const element = workspaceRef.current;
				if (!element) return;
				const update = () => setNarrow(element.getBoundingClientRect().width < 900);
				update();
				const observer = new ResizeObserver(update);
				observer.observe(element);
				return () => observer.disconnect();
			}, [expanded]);
			const open = (next) => {
				setView(next);
				setExpanded(true);
			};
			const connected = snap.status === "ready";
			if (!expanded) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				ref: launcherRef,
				type: "button",
				"aria-expanded": "false",
				"aria-controls": "oks-workspace",
				"aria-label": "展开 OKS 工作区",
				onClick: () => setExpanded(true),
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: 8,
					border: `1px solid ${T.border}`,
					borderRadius: 999,
					padding: "7px 11px",
					background: T.bgLayer3,
					color: T.labelPrimary,
					cursor: "pointer",
					fontSize: 12,
					fontWeight: 600
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						style: {
							width: 7,
							height: 7,
							borderRadius: "50%",
							background: connected ? "#16a36b" : "#b9a15a"
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "OKS" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							color: T.labelSecondary,
							fontWeight: 500
						},
						children: connected ? "已连接" : snap.status === "loading" ? "加载中" : "检查设置"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						style: { color: T.labelSecondary },
						children: "展开"
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: workspaceRef,
				id: "oks-workspace",
				role: "region",
				"aria-label": "OKS 上下文工作区",
				style: {
					border: `1px solid ${T.border}`,
					borderRadius: 12,
					background: T.bgLayer2,
					overflow: "hidden"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						justifyContent: "space-between",
						gap: 12,
						alignItems: "center",
						padding: "10px 12px",
						borderBottom: `1px solid ${T.border}`
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							minWidth: 0
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: {
									width: 8,
									height: 8,
									borderRadius: "50%",
									background: connected ? "#16a36b" : "#b9a15a"
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									color: T.labelPrimary,
									fontSize: 14
								},
								children: "OKS 上下文工作区"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									color: T.labelSecondary,
									fontSize: 11
								},
								children: connected ? "已连接" : "需检查设置"
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-expanded": "true",
						"aria-controls": "oks-workspace",
						"aria-label": "收起 OKS 工作区",
						onClick: () => setExpanded(false),
						style: {
							border: `1px solid ${T.border}`,
							borderRadius: 7,
							padding: "5px 8px",
							background: T.bgLayer3,
							color: T.labelSecondary,
							cursor: "pointer",
							fontSize: 12
						},
						children: "收起"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "150px minmax(0, 1fr) minmax(220px, 280px)",
						gap: 12,
						padding: 12,
						alignItems: "start"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
							"aria-label": "OKS 工作区导航",
							style: {
								display: narrow ? "flex" : "grid",
								flexWrap: "wrap",
								gap: 4
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-current": view === "overview" ? "page" : void 0,
									onClick: () => setView("overview"),
									style: {
										...navButton(view === "overview"),
										...narrow ? {
											width: "auto",
											flex: "1 1 110px"
										} : {}
									},
									children: ["◈ ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "概览" })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-current": view === "knowledge" ? "page" : void 0,
									onClick: () => setView("knowledge"),
									style: {
										...navButton(view === "knowledge"),
										...narrow ? {
											width: "auto",
											flex: "1 1 110px"
										} : {}
									},
									children: ["▤ ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "知识库" })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-current": view === "trace" ? "page" : void 0,
									onClick: () => setView("trace"),
									style: {
										...navButton(view === "trace"),
										...narrow ? {
											width: "auto",
											flex: "1 1 110px"
										} : {}
									},
									children: ["⌁ ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "召回轨迹" })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-current": view === "activity" ? "page" : void 0,
									onClick: () => setView("activity"),
									style: {
										...navButton(view === "activity"),
										...narrow ? {
											width: "auto",
											flex: "1 1 110px"
										} : {}
									},
									children: ["⌁ ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "活动" })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-current": view === "settings" ? "page" : void 0,
									onClick: () => setView("settings"),
									style: {
										...navButton(view === "settings"),
										...narrow ? {
											width: "auto",
											flex: "1 1 110px"
										} : {}
									},
									children: ["⚙ ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "系统设置" })]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("main", {
							style: { minWidth: 0 },
							children: [
								view === "overview" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspaceOverview, {
									scope,
									rpc,
									onOpen: open,
									openSidebar
								}) : null,
								view === "knowledge" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KnowledgeRecallSwitch, { scope }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiBrowser, {
									rpc,
									onOpenSettings: () => setView("settings")
								})] }) : null,
								view === "trace" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecallTracePanel, { rpc }) : null,
								view === "activity" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityPanel, { rpc }) : null,
								view === "settings" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecallParamsCard, { scope }) : null
							]
						}),
						view === "activity" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("aside", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityPanel, {
							rpc,
							compact: true
						}) })
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
			"settingsScope",
			"betterSidebar"
		];
		function createHttpRpc() {
			return { async call(channel, endpoint, payload, signal) {
				const rpcId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
				const response = await fetch(`${channel}/${endpoint}`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						type: "client-request",
						rpcId,
						method: endpoint,
						payload
					}),
					signal
				});
				if (!response.ok) throw new Error(`OKS 请求失败：HTTP ${response.status}`);
				const result = await response.json();
				if (result.rpcId !== rpcId) throw new Error("OKS 请求响应标识不匹配");
				return result.result;
			} };
		}
		function getOksRpc(ctx) {
			const candidate = ctx.connection.rpc;
			return candidate && typeof candidate.call === "function" ? candidate : createHttpRpc();
		}
		function apply(ctx) {
			const scope = ctx.settingsScope.bind({ namespace: "oks" });
			const rpc = getOksRpc(ctx);
			const betterSidebar = ctx.betterSidebar;
			const openSidebar = () => {
				if (!betterSidebar || typeof betterSidebar.openTab !== "function") return false;
				betterSidebar.openTab({
					type: "oks:context",
					title: "OKS 上下文",
					path: "oks://context"
				});
				return true;
			};
			ctx.effect(() => {
				if (!betterSidebar || typeof betterSidebar.registerTab !== "function") return void 0;
				return betterSidebar.registerTab({
					id: "oks:context",
					title: "OKS",
					icon: "◌",
					order: 45,
					single: true,
					component: () => OksSidebarTab({
						scope,
						rpc
					})
				});
			}, "dsh-oks: better-sidebar tab");
			const settingsCard = (props) => RecallParamsCard({
				scope,
				...props
			});
			const panel = (props) => OksPanel({
				...props,
				scope,
				rpc,
				openSidebar
			});
			const globalSurface = (props) => OksGlobalSurface({
				...props,
				scope,
				rpc,
				openSidebar
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
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "oks-global",
				order: 40,
				inject: () => ({})
			}, globalSurface));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map