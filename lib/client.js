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
		* Owns its own chrome (the bundle-purity gate forbids importing the section's
		* PluginCard). Reads through scope.getSnapshot() (status field, not available),
		* subscribes for changes, and writes one field per change via scope.set.
		* oks reads settings/recall.yaml at call time, so the next recall honors the
		* new value without restart.
		*/
		const FALLBACK = {
			recall_floor: .7,
			recall_topn: 3,
			posttool_mode: "signal",
			search_backend: "native"
		};
		function RecallParamsCard(props) {
			const { scope } = props;
			const snap = (0, react.useSyncExternalStore)(scope.subscribe, scope.getSnapshot, scope.getSnapshot);
			const [saved, setSaved] = (0, react.useState)(false);
			if (snap.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: {
					padding: "0.5rem 0",
					color: "#888"
				},
				children: "加载 OKS 配置中…"
			});
			if (snap.status === "unavailable") return null;
			const value = {
				...FALLBACK,
				...snap.value
			};
			const update = (field, v) => {
				scope.set(field, v).then(() => {
					setSaved(true);
					setTimeout(() => setSaved(false), 1500);
				});
			};
			const t = props.t ?? ((k) => k);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					borderBottom: "1px solid var(--dsw-border, #ddd)",
					padding: "0.75rem 0"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					style: { marginBottom: "0.5rem" },
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
						style: { fontSize: "0.95rem" },
						children: t("oksTitle") || "OKS recall 参数"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							color: "var(--dsw-muted, #888)",
							fontSize: "0.8rem"
						},
						children: t("oksDescription") || "settings/recall.yaml 唯一真源 → git 同步 → 走到哪带到哪"
					})]
				}), !snap.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					role: "status",
					style: { color: "var(--dsw-muted, #888)" },
					children: t("readOnly") || "只读"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gap: "0.5rem"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: "0.15rem"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { fontSize: "0.8rem" },
								children: "recall.floor（召回阈值）"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "number",
								step: "0.05",
								min: "0",
								max: "1",
								value: value.recall_floor ?? .7,
								onChange: (e) => update("recall_floor", parseFloat(e.target.value))
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: "0.15rem"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { fontSize: "0.8rem" },
								children: "recall.topn（注入最多 N 条）"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "number",
								step: "1",
								min: "1",
								max: "10",
								value: value.recall_topn ?? 3,
								onChange: (e) => update("recall_topn", parseInt(e.target.value, 10))
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: "0.15rem"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { fontSize: "0.8rem" },
								children: "posttool.mode"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								value: value.posttool_mode ?? "signal",
								onChange: (e) => update("posttool_mode", e.target.value),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "signal",
									children: "signal（只 slug+rel）"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "full",
									children: "full（注入 body）"
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: "0.15rem"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { fontSize: "0.8rem" },
								children: "search_backend"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								value: value.search_backend ?? "native",
								onChange: (e) => update("search_backend", e.target.value),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "native",
										children: "native（6+1 因子）"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "fts5",
										children: "fts5（SQLite FTS5）"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "fusion",
										children: "fusion（native + fts5）"
									})
								]
							})]
						}),
						saved ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								color: "var(--dsw-success, #080)",
								fontSize: "0.75rem"
							},
							children: "✓ 已保存"
						}) : null
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