import { open, readFile, readdir, stat } from "node:fs/promises";
import { appendFileSync, closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join, relative, resolve, sep, win32 } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
//#region src/wiki-browser.ts
/**
* File-backed read-only lifecycle browser helpers.
*
* The DSH browser never sees a filesystem path. The Host half resolves the
* configured knowledge-base root, then exposes safe slugs and display data
* over Connection RPC.
*/
const MAX_QUERY_CHARS$1 = 120;
const MAX_DETAIL_BODY_CHARS$1 = 6e4;
const MAX_MARKDOWN_FILE_BYTES = 524288;
const MAX_TOTAL_READ_BYTES = 8388608;
const MAX_MARKDOWN_FILES = 1e3;
const MAX_SCAN_DIRECTORIES$1 = 2e3;
function text$1(value) {
	return typeof value === "string" ? value.trim() : "";
}
function yamlScalar(value) {
	const trimmed = value.trim();
	if (trimmed.startsWith("'") && trimmed.endsWith("'") || trimmed.startsWith("\"") && trimmed.endsWith("\"")) return trimmed.slice(1, -1);
	return trimmed.replace(/\s+#.*$/, "").trim();
}
function readFrontmatter(source) {
	const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
	if (!normalized.startsWith("---\n")) return {
		meta: {},
		body: normalized
	};
	const closeAt = normalized.indexOf("\n---", 4);
	if (closeAt < 0) return {
		meta: {},
		body: normalized
	};
	const meta = {};
	for (const line of normalized.slice(4, closeAt).split("\n")) {
		const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
		if (match) meta[match[1]] = yamlScalar(match[2]);
	}
	return {
		meta,
		body: normalized.slice(closeAt + 4).replace(/^\n/, "")
	};
}
function displaySummary$1(markdown) {
	const plain = markdown.replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^[#>*\-+\d.\s]+/gm, " ").replace(/[|`*_]/g, " ").replace(/\s+/g, " ").trim();
	return plain.length <= 220 ? plain : plain.slice(0, 217).trimEnd() + "…";
}
function titleFromBody(body) {
	return /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? "";
}
function slugFromPath(root, file) {
	return relative(root, file).split(sep).join("/").replace(/\.md$/i, "");
}
async function markdownFiles(root) {
	const files = [];
	const pending = [root];
	let scannedDirectories = 0;
	let truncated = false;
	while (pending.length > 0 && !truncated) {
		const directory = pending.pop();
		scannedDirectories++;
		if (scannedDirectories > MAX_SCAN_DIRECTORIES$1) {
			truncated = true;
			break;
		}
		let entries;
		try {
			entries = await readdir(directory, { withFileTypes: true });
		} catch (error) {
			if (error.code === "ENOENT") continue;
			throw error;
		}
		for (const entry of entries) {
			if (entry.name === ".gitkeep") continue;
			const file = join(directory, entry.name);
			if (entry.isDirectory()) {
				if (scannedDirectories + pending.length < MAX_SCAN_DIRECTORIES$1) pending.push(file);
				else truncated = true;
				continue;
			}
			if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
			if (files.length >= MAX_MARKDOWN_FILES) {
				truncated = true;
				break;
			}
			files.push(file);
		}
	}
	return {
		files,
		truncated
	};
}
async function readBoundedUtf8(file, maxBytes) {
	const handle = await open(file, "r");
	try {
		const size = (await handle.stat()).size;
		const length = Math.max(0, Math.min(size, maxBytes));
		const buffer = Buffer.alloc(length);
		const { bytesRead } = length > 0 ? await handle.read(buffer, 0, length, 0) : { bytesRead: 0 };
		return {
			text: buffer.subarray(0, bytesRead).toString("utf8"),
			bytesRead,
			truncated: size > maxBytes
		};
	} finally {
		await handle.close();
	}
}
function summaryFromSource(root, file, source) {
	const { meta, body } = readFrontmatter(source);
	const slug = slugFromPath(root, file);
	const page = {
		slug,
		title: meta.title || titleFromBody(body) || slug.split("/").at(-1) || slug,
		area: meta.area || "未分类",
		type: meta.type || "未分类",
		summary: displaySummary$1(body) || "暂无正文摘要。",
		created: meta.created || ""
	};
	return {
		page,
		searchText: `${page.title}\n${page.area}\n${page.type}\n${body}`.toLocaleLowerCase()
	};
}
async function readSearchItem(root, file, maxBytes) {
	const bounded = await readBoundedUtf8(file, maxBytes);
	return {
		item: summaryFromSource(root, file, bounded.text),
		bytesRead: bounded.bytesRead,
		truncated: bounded.truncated
	};
}
function comparePages(a, b) {
	return b.created.localeCompare(a.created) || a.title.localeCompare(b.title, "zh-Hans-CN");
}
function normalizeFilter$1(value) {
	return text$1(value).slice(0, MAX_QUERY_CHARS$1);
}
/** List markdown pages under one lifecycle directory. */
async function listMarkdownPages(knowledgeBasePath, directory, filters = {}) {
	const root = resolve(knowledgeBasePath, directory);
	const scan = await markdownFiles(root);
	const pages = [];
	let totalReadBytes = 0;
	let truncated = scan.truncated;
	for (const file of scan.files) {
		if (totalReadBytes >= MAX_TOTAL_READ_BYTES) {
			truncated = true;
			break;
		}
		const read = await readSearchItem(root, file, Math.min(MAX_MARKDOWN_FILE_BYTES, MAX_TOTAL_READ_BYTES - totalReadBytes));
		totalReadBytes += read.bytesRead;
		truncated ||= read.truncated;
		pages.push(read.item);
	}
	pages.sort((a, b) => comparePages(a.page, b.page));
	const query = normalizeFilter$1(filters.query).toLocaleLowerCase();
	const area = normalizeFilter$1(filters.area);
	const type = normalizeFilter$1(filters.type);
	return {
		total: pages.length,
		items: pages.filter(({ page, searchText }) => (!query || searchText.includes(query)) && (!area || page.area === area) && (!type || page.type === type)).map(({ page }) => page),
		areas: [...new Set(pages.map(({ page }) => page.area))].sort((a, b) => a.localeCompare(b, "zh-Hans-CN")),
		types: [...new Set(pages.map(({ page }) => page.type))].sort((a, b) => a.localeCompare(b, "zh-Hans-CN")),
		...truncated ? { truncated: true } : {}
	};
}
async function getMarkdownPage(knowledgeBasePath, directory, requestedSlug) {
	const slug = normalizeFilter$1(requestedSlug);
	if (!slug) return void 0;
	const root = resolve(knowledgeBasePath, directory);
	const file = (await markdownFiles(root)).files.find((candidate) => slugFromPath(root, candidate) === slug);
	if (!file) return void 0;
	const bounded = await readBoundedUtf8(file, MAX_MARKDOWN_FILE_BYTES);
	const { page } = summaryFromSource(root, file, bounded.text);
	const { body } = readFrontmatter(bounded.text);
	return {
		...page,
		body: body.slice(0, MAX_DETAIL_BODY_CHARS$1),
		bodyTruncated: bounded.truncated || body.length > MAX_DETAIL_BODY_CHARS$1
	};
}
/** Read-only Wiki aliases retained for the existing RPC contract. */
function listWikiPages(knowledgeBasePath, filters = {}) {
	return listMarkdownPages(knowledgeBasePath, "wiki", filters);
}
function getWikiPage(knowledgeBasePath, requestedSlug) {
	return getMarkdownPage(knowledgeBasePath, "wiki", requestedSlug);
}
function listDraftPages(knowledgeBasePath, filters = {}) {
	return listMarkdownPages(knowledgeBasePath, "drafts", filters);
}
function getDraftPage(knowledgeBasePath, requestedSlug) {
	return getMarkdownPage(knowledgeBasePath, "drafts", requestedSlug);
}
//#endregion
//#region src/raw-browser.ts
/** Read-only browser for OKS Raw Bundle v0.2 evidence. */
const MAX_QUERY_CHARS = 120;
const MAX_DETAIL_BODY_CHARS = 6e4;
const MAX_LIST_PREVIEW_BYTES = 16384;
const MAX_DETAIL_BODY_BYTES = 131072;
const MAX_MANIFEST_BYTES = 262144;
const MAX_BUNDLE_DIRECTORIES = 250;
const MAX_RAW_SCAN_DIRECTORIES = 1e4;
const MAX_FILES_PER_BUNDLE = 2e3;
function text(value) {
	return typeof value === "string" ? value.trim() : "";
}
function normalizeFilter(value) {
	return text(value).slice(0, MAX_QUERY_CHARS);
}
function relativeId(root, directory) {
	return relative(root, directory).split(sep).join("/");
}
async function readTextPreview(path, maxBytes) {
	const handle = await open(path, "r");
	try {
		const stat = await handle.stat();
		const bytes = Math.min(stat.size, maxBytes);
		const buffer = Buffer.alloc(bytes);
		if (bytes > 0) await handle.read(buffer, 0, bytes, 0);
		return {
			text: buffer.toString("utf8"),
			truncated: stat.size > maxBytes
		};
	} finally {
		await handle.close();
	}
}
function displaySummary(markdown) {
	const plain = markdown.replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^[#>*\-+\d.\s]+/gm, " ").replace(/[|`*_]/g, " ").replace(/\s+/g, " ").trim();
	return plain.length <= 220 ? plain : `${plain.slice(0, 217).trimEnd()}...`;
}
function dateFromId(id, manifest) {
	const match = /(^|\/)(\d{4})\/(\d{2})\/(\d{2})(\/|$)/.exec(id);
	if (match) return `${match[2]}-${match[3]}-${match[4]}`;
	const provenance = manifest.provenance;
	if (provenance && typeof provenance === "object" && Array.isArray(provenance.activities)) {
		const started = provenance.activities.find((item) => typeof item?.started_at === "string")?.started_at;
		if (started) return String(started).slice(0, 10);
	}
	return "";
}
function sourceTypeFromManifest(manifest) {
	const sources = manifest.sources;
	if (Array.isArray(sources)) {
		const first = sources.find((item) => item && typeof item === "object");
		const mediaType = text(first?.media_type);
		if (mediaType) return mediaType;
		const snapshotKind = text(first?.snapshot_kind);
		if (snapshotKind) return snapshotKind;
	}
	return "unlabeled";
}
async function filesUnder(directory) {
	const out = [];
	const pending = [directory];
	let truncated = false;
	while (pending.length > 0 && !truncated) {
		const current = pending.pop();
		let entries;
		try {
			entries = await readdir(current, { withFileTypes: true });
		} catch (error) {
			if (error.code === "ENOENT") continue;
			throw error;
		}
		for (const entry of entries) {
			if (entry.name === ".gitkeep") continue;
			const file = join(current, entry.name);
			if (entry.isDirectory()) pending.push(file);
			else if (entry.isFile()) {
				out.push(relative(directory, file).split(sep).join("/"));
				if (out.length >= MAX_FILES_PER_BUNDLE) {
					truncated = true;
					break;
				}
			}
		}
	}
	return {
		files: out.sort((a, b) => a.localeCompare(b)),
		truncated
	};
}
async function findBundleDirectories(rawRoot) {
	const directories = [];
	const pending = [resolve(rawRoot)];
	let scannedDirectories = 0;
	let truncated = false;
	while (pending.length > 0 && !truncated) {
		const current = pending.pop();
		scannedDirectories += 1;
		if (scannedDirectories > MAX_RAW_SCAN_DIRECTORIES) {
			truncated = true;
			break;
		}
		let entries;
		try {
			entries = await readdir(current, { withFileTypes: true });
		} catch (error) {
			if (error.code === "ENOENT") continue;
			throw error;
		}
		if (entries.some((entry) => entry.isFile() && entry.name.toLowerCase() === "bundle.json")) {
			directories.push(current);
			if (directories.length >= MAX_BUNDLE_DIRECTORIES) {
				truncated = true;
				break;
			}
			continue;
		}
		for (const entry of entries) if (entry.isDirectory()) pending.push(join(current, entry.name));
	}
	return {
		directories: directories.sort((a, b) => relativeId(rawRoot, a).localeCompare(relativeId(rawRoot, b))),
		truncated
	};
}
function requestedContentPath(directory, manifest, files) {
	const declared = text(manifest.files?.content);
	if (declared && !declared.includes("..") && !declared.includes("\\") && files.includes(declared)) return join(directory, declared);
	if (files.includes("content.md")) return join(directory, "content.md");
	if (files.includes("raw.md")) return join(directory, "raw.md");
}
async function readBundle(rawRoot, directory) {
	try {
		const manifestPreview = await readTextPreview(join(directory, "bundle.json"), MAX_MANIFEST_BYTES);
		if (manifestPreview.truncated) return void 0;
		const manifest = JSON.parse(manifestPreview.text);
		const id = relativeId(rawRoot, directory);
		const bundleId = text(manifest.bundle_id) || id;
		const captureId = text(manifest.capture_id) || bundleId;
		const status = text(manifest.processing_status) || "unknown";
		const fileScan = await filesUnder(directory);
		const bodyPath = requestedContentPath(directory, manifest, fileScan.files);
		const body = bodyPath ? (await readTextPreview(bodyPath, MAX_LIST_PREVIEW_BYTES)).text : "";
		const fileCount = fileScan.truncated ? MAX_FILES_PER_BUNDLE : fileScan.files.length;
		return {
			summary: {
				id,
				bundleId,
				captureId,
				capturedAt: dateFromId(id, manifest),
				status,
				sourceType: sourceTypeFromManifest(manifest),
				fileCount,
				summary: displaySummary(body) || "This Raw Bundle has no previewable text."
			},
			manifest,
			files: fileScan.files,
			directory
		};
	} catch {
		return;
	}
}
async function listRawBundles(knowledgeBasePath, filters = {}) {
	const rawRoot = resolve(knowledgeBasePath, "raw");
	const found = await findBundleDirectories(rawRoot);
	const bundles = [];
	for (const directory of found.directories) {
		const bundle = await readBundle(rawRoot, directory);
		if (bundle) bundles.push(bundle);
	}
	bundles.sort((a, b) => b.summary.capturedAt.localeCompare(a.summary.capturedAt) || a.summary.captureId.localeCompare(b.summary.captureId));
	const query = normalizeFilter(filters.query).toLocaleLowerCase();
	const status = normalizeFilter(filters.status);
	const items = bundles.map((item) => item.summary).filter((item) => (!query || `${item.captureId}\n${item.bundleId}\n${item.sourceType}\n${item.status}\n${item.summary}`.toLocaleLowerCase().includes(query)) && (!status || item.status === status));
	return {
		total: bundles.length,
		items,
		statuses: [...new Set(bundles.map((item) => item.summary.status))].sort((a, b) => a.localeCompare(b)),
		truncated: found.truncated
	};
}
async function getRawBundle(knowledgeBasePath, requestedId) {
	const id = normalizeFilter(requestedId);
	if (!id || id.includes("\\") || id.split("/").some((part) => !part || part === "." || part === "..")) return void 0;
	const rawRoot = resolve(knowledgeBasePath, "raw");
	const directory = (await findBundleDirectories(rawRoot)).directories.find((candidate) => relativeId(rawRoot, candidate) === id);
	if (!directory) return void 0;
	const item = await readBundle(rawRoot, directory);
	if (!item) return void 0;
	const bodyPath = requestedContentPath(directory, item.manifest, item.files);
	const preview = bodyPath ? await readTextPreview(bodyPath, MAX_DETAIL_BODY_BYTES) : {
		text: "",
		truncated: false
	};
	const body = preview.text.slice(0, MAX_DETAIL_BODY_CHARS);
	return {
		...item.summary,
		body,
		bodyTruncated: preview.truncated || preview.text.length > MAX_DETAIL_BODY_CHARS
	};
}
//#endregion
//#region src/oks-overview.ts
/** Read-only, bounded inspection of the configured OKS instance. */
const MAX_SCAN_DIRECTORIES = 2e3;
const MAX_SCANNED_FILES = 1e3;
async function countFiles(root, include) {
	let count = 0;
	let scannedDirectories = 0;
	let scannedFiles = 0;
	let truncated = false;
	const pending = [resolve(root)];
	while (pending.length > 0 && !truncated) {
		const directory = pending.pop();
		scannedDirectories++;
		if (scannedDirectories > MAX_SCAN_DIRECTORIES) {
			truncated = true;
			break;
		}
		let entries;
		try {
			entries = await readdir(directory, { withFileTypes: true });
		} catch (error) {
			if (error.code === "ENOENT") continue;
			throw error;
		}
		for (const entry of entries) {
			if (entry.name === ".gitkeep") continue;
			const file = join(directory, entry.name);
			if (entry.isDirectory()) {
				if (scannedDirectories + pending.length < MAX_SCAN_DIRECTORIES) pending.push(file);
				else truncated = true;
				continue;
			}
			if (!entry.isFile()) continue;
			scannedFiles++;
			if (scannedFiles > MAX_SCANNED_FILES) {
				truncated = true;
				break;
			}
			if (include(entry.name)) count++;
		}
	}
	return {
		count,
		truncated
	};
}
async function isDirectory(path) {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}
/** Count the three lifecycle layers without exposing the local root path. */
async function getOksOverview(knowledgeBasePath) {
	const [wiki, drafts, raw, rawBundles] = await Promise.all([
		countFiles(join(knowledgeBasePath, "wiki"), (name) => name.toLowerCase().endsWith(".md")),
		countFiles(join(knowledgeBasePath, "drafts"), (name) => name.toLowerCase().endsWith(".md")),
		countFiles(join(knowledgeBasePath, "raw"), () => true),
		listRawBundles(knowledgeBasePath)
	]);
	const truncated = wiki.truncated || drafts.truncated || raw.truncated || rawBundles.truncated;
	return {
		connected: true,
		wikiCount: wiki.count,
		draftCount: drafts.count,
		rawFileCount: raw.count,
		rawBundleCount: rawBundles.total,
		...truncated ? { truncated: true } : {}
	};
}
/**
* Classify first-use connectivity without returning the user's local path.
* The CLI availability is supplied by the Host because only the Host can run
* the `oks` executable; this function remains deterministic and easy to test.
*/
async function getOksDiagnostics(knowledgeBasePath, oksCliAvailable) {
	const empty = {
		wikiCount: 0,
		draftCount: 0,
		rawFileCount: 0,
		rawBundleCount: 0,
		wikiDirectory: false,
		draftsDirectory: false,
		rawDirectory: false
	};
	if (!oksCliAvailable) return {
		connected: false,
		status: "oks-not-installed",
		message: "未检测到 OKS 命令。请先安装 OKS CLI，然后重新打开 DSH。",
		oksCliAvailable: false,
		knowledgeBaseConfigured: Boolean(knowledgeBasePath),
		...empty
	};
	if (!knowledgeBasePath) return {
		connected: false,
		status: "not-configured",
		message: "已检测到 OKS，但还没有连接知识库。请在系统设置中配置知识库位置。",
		oksCliAvailable: true,
		knowledgeBaseConfigured: false,
		...empty
	};
	const root = resolve(knowledgeBasePath);
	let rootExists = false;
	try {
		rootExists = (await stat(root)).isDirectory();
	} catch {
		rootExists = false;
	}
	if (!rootExists) return {
		connected: false,
		status: "not-initialized",
		message: "OKS 知识库位置已配置，但目录不存在。请先运行 oks init 创建知识库。",
		oksCliAvailable: true,
		knowledgeBaseConfigured: true,
		...empty
	};
	const [wikiDirectory, draftsDirectory, rawDirectory] = await Promise.all([
		isDirectory(join(root, "wiki")),
		isDirectory(join(root, "drafts")),
		isDirectory(join(root, "raw"))
	]);
	const overview = await getOksOverview(root);
	const complete = wikiDirectory && draftsDirectory && rawDirectory;
	return {
		...overview,
		connected: complete,
		status: complete ? "connected" : "partial",
		message: complete ? "OKS 知识库已连接。" : "已找到 OKS 知识库目录，但目录结构不完整；请运行 oks init --upgrade 修复。",
		oksCliAvailable: true,
		knowledgeBaseConfigured: true,
		wikiDirectory,
		draftsDirectory,
		rawDirectory
	};
}
//#endregion
//#region src/prestep-control.ts
/** Product-level gate for the user-facing automatic knowledge toggle. */
function isPrestepRecallEnabled(config) {
	return config.prestep_enabled !== false;
}
//#endregion
//#region src/oks-runtime.ts
/**
* Resolve the OKS executable for a long-running DSH host process.
*
* Windows GUI/autostart processes do not always inherit the interactive user's
* PATH. Prefer the explicit override, then the standard per-user pipx shim,
* and finally let execFile report PATH-based installations on other systems.
*/
function resolveOksBin(env = process.env, platform = process.platform, home = homedir(), exists = existsSync) {
	const override = env.OKS_BIN?.trim();
	if (override) return override;
	if (platform === "win32") {
		const pathJoin = win32.join;
		const found = [pathJoin(home, ".local", "bin", "oks.exe"), pathJoin(home, ".local", "bin", "oks")].find((candidate) => exists(candidate));
		if (found) return found;
	}
	return "oks";
}
//#endregion
//#region src/oks-config.ts
/** Parse the Knowledge Base path from the box-drawn oks config show table. */
function parseOksKnowledgeBasePath(stdout) {
	const lines = stdout.split(/\r?\n/);
	const heading = lines.findIndex((line) => line.includes("Knowledge Base"));
	if (heading < 0) return "";
	for (const line of lines.slice(heading + 1)) {
		const candidate = line.trim().replace(/^(?:\u2502|\|)\s*/, "").replace(/\s*(?:\u2502|\|).*$/, "").trim();
		if (/^(?:[A-Za-z]:[\\/]|\\\\|\\\\\?\\\\|\/)/.test(candidate)) return candidate;
		if (candidate.startsWith("Strategy")) break;
	}
	return "";
}
/** Return the global config path used by the OKS CLI. */
function oksConfigPath(home = homedir()) {
	return join(home, ".oks", "config.json");
}
/**
* Clear the active knowledge-base pointer without invoking oks config set.
* The CLI treats an empty positional value as the current directory, which is
* unsafe for a settings "disconnect" action. Preserve all other config keys
* and use an atomic replacement so a failed write cannot leave a partial file.
*/
function clearOksKnowledgeBasePath(configPath = oksConfigPath()) {
	let config = {};
	try {
		const parsed = JSON.parse(readFileSync(configPath, "utf8"));
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) config = parsed;
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	config.knowledge_base_path = "";
	const directory = dirname(configPath);
	mkdirSync(directory, { recursive: true });
	const temporary = join(directory, ".config." + process.pid + "." + randomUUID() + ".tmp");
	let fd;
	try {
		fd = openSync(temporary, "wx");
		writeFileSync(fd, JSON.stringify(config, null, 2) + "\n", "utf8");
		fsyncSync(fd);
		closeSync(fd);
		fd = void 0;
		renameSync(temporary, configPath);
	} finally {
		if (fd !== void 0) closeSync(fd);
		try {
			unlinkSync(temporary);
		} catch {}
	}
}
let sharedWriteTail = Promise.resolve();
/** Keep the settings source live as dsh-settings replaces its resolved scope. */
function createDynamicSettingsHooks(entry, sync) {
	let source = () => entry;
	let previous;
	let suppressNextChange = true;
	let pending = sharedWriteTail;
	const snapshot = (value) => {
		const out = {};
		for (const key of Object.keys(value)) out[key] = value[key];
		return out;
	};
	return {
		setSource(next) {
			source = next;
			suppressNextChange = true;
		},
		getCurrent() {
			return source();
		},
		onChange() {
			const value = source();
			const current = snapshot(value);
			if (previous === void 0 || suppressNextChange) {
				previous = current;
				suppressNextChange = false;
				return pending;
			}
			const changed = /* @__PURE__ */ new Set();
			const keys = /* @__PURE__ */ new Set([...Object.keys(previous), ...Object.keys(current)]);
			for (const key of keys) if (!Object.is(previous[key], current[key])) changed.add(key);
			previous = current;
			if (changed.size === 0) return pending;
			sharedWriteTail = sharedWriteTail.catch(() => void 0).then(() => sync(value, changed)).then(() => void 0).catch(() => void 0);
			pending = sharedWriteTail;
			return pending;
		},
		whenIdle() {
			return pending;
		}
	};
}
const managedValues = {
	recall: {
		floor: (cfg) => cfg.recall_floor ?? .7,
		topn: (cfg) => cfg.recall_topn ?? 3,
		minlen: (cfg) => cfg.recall_minlen ?? 6,
		cooldown: (cfg) => cfg.recall_cooldown ?? 10
	},
	posttool: {
		floor: (cfg) => cfg.posttool_floor ?? .9,
		topn: (cfg) => cfg.posttool_topn ?? 2,
		mode: (cfg) => cfg.posttool_mode ?? "signal",
		signal_rel_floor: (cfg) => cfg.posttool_signal_rel_floor ?? 2.5
	},
	prestep: { enabled: (cfg) => cfg.prestep_enabled ?? true },
	userprompt: {
		floor: (cfg) => cfg.recall_floor ?? .7,
		topn: (cfg) => cfg.recall_topn ?? 3,
		cooldown: (cfg) => cfg.recall_cooldown ?? 10
	}
};
const managedByKey = {
	recall_floor: {
		section: "recall",
		key: "floor"
	},
	recall_topn: {
		section: "recall",
		key: "topn"
	},
	recall_minlen: {
		section: "recall",
		key: "minlen"
	},
	recall_cooldown: {
		section: "recall",
		key: "cooldown"
	},
	posttool_floor: {
		section: "posttool",
		key: "floor"
	},
	posttool_topn: {
		section: "posttool",
		key: "topn"
	},
	posttool_mode: {
		section: "posttool",
		key: "mode"
	},
	posttool_signal_rel_floor: {
		section: "posttool",
		key: "signal_rel_floor"
	},
	prestep_enabled: {
		section: "prestep",
		key: "enabled"
	},
	search_backend: {
		section: "__root__",
		key: "search_backend"
	}
};
function yamlValue(value) {
	if (typeof value === "string") return /^[A-Za-z0-9_.-]+$/.test(value) ? value : JSON.stringify(value);
	return String(value);
}
function defaultRecallYaml(cfg) {
	return [
		"# OKS recall parameters - managed by dsh-oks plugin",
		"recall:",
		"  floor: " + managedValues.recall.floor(cfg),
		"  topn: " + managedValues.recall.topn(cfg),
		"  minlen: " + managedValues.recall.minlen(cfg),
		"  cooldown: " + managedValues.recall.cooldown(cfg),
		"inject:",
		"  budget_chars: 4000",
		"  per_page_chars: 200",
		"  title_only_floor: 0.5",
		"prestep:",
		"  enabled: " + managedValues.prestep.enabled(cfg),
		"posttool:",
		"  floor: " + managedValues.posttool.floor(cfg),
		"  topn: " + managedValues.posttool.topn(cfg),
		"  mode: " + managedValues.posttool.mode(cfg),
		"  recall: 1",
		"  signal_rel_floor: " + managedValues.posttool.signal_rel_floor(cfg),
		"userprompt:",
		"  floor: " + managedValues.userprompt.floor(cfg),
		"  topn: " + managedValues.userprompt.topn(cfg),
		"  cooldown: " + managedValues.userprompt.cooldown(cfg),
		"conflict:",
		"  window: 300",
		"search_backend: " + yamlValue(cfg.search_backend ?? "native"),
		"mail_topn: 3",
		""
	].join("\n");
}
function patchRecallYaml(existing, cfg, changed) {
	const lines = existing.replace(/\r\n/g, "\n").split("\n");
	if (lines.length && lines[lines.length - 1] === "") lines.pop();
	const sectionStarts = /* @__PURE__ */ new Map();
	for (let i = 0; i < lines.length; i++) {
		const match = /^(?<indent>\s*)(?<section>[A-Za-z_][\w-]*):\s*(?:#.*)?$/.exec(lines[i]);
		if (match?.groups?.indent === "" && match.groups.section) sectionStarts.set(match.groups.section, i);
	}
	const sectionEnd = (start) => {
		for (let i = start + 1; i < lines.length; i++) if (/^[A-Za-z_][\w-]*:\s*(?:#.*)?$/.test(lines[i])) return i;
		return lines.length;
	};
	const patchSectionKey = (section, key, value) => {
		const start = sectionStarts.get(section);
		if (start === void 0) {
			lines.push(section + ":", "  " + key + ": " + yamlValue(value));
			sectionStarts.set(section, lines.length - 2);
			return;
		}
		const end = sectionEnd(start);
		const keyPattern = new RegExp("^(\\s{2}" + key + ":\\s*)(.*?)(\\s+#.*)?$");
		for (let i = start + 1; i < end; i++) {
			const match = keyPattern.exec(lines[i]);
			if (match) {
				lines[i] = match[1] + yamlValue(value) + (match[3] ?? "");
				return;
			}
		}
		lines.splice(end, 0, "  " + key + ": " + yamlValue(value));
		for (const [name, index] of sectionStarts) if (index >= end) sectionStarts.set(name, index + 1);
	};
	for (const [key, mapped] of Object.entries(managedByKey)) {
		if (!changed.has(key)) continue;
		if (mapped.section === "__root__") {
			const pattern = /^(search_backend:\s*)(.*?)(\s+#.*)?$/;
			const index = lines.findIndex((line) => pattern.test(line));
			if (index >= 0) {
				const match = pattern.exec(lines[index]);
				lines[index] = match[1] + yamlValue(cfg.search_backend ?? "native") + (match[3] ?? "");
			} else lines.push("search_backend: " + yamlValue(cfg.search_backend ?? "native"));
		} else patchSectionKey(mapped.section, mapped.key, managedValues[mapped.section][mapped.key](cfg));
	}
	return lines.join("\n") + "\n";
}
/** Atomically patch settings/recall.yaml while preserving unknown sections,
* keys, comments, and user-owned values. Missing files get the full template. */
function writeRecallYaml(kbPath, cfg, changed) {
	const dir = join(kbPath, "settings");
	const target = join(dir, "recall.yaml");
	mkdirSync(dir, { recursive: true });
	let yaml;
	try {
		const existing = readFileSync(target, "utf8");
		yaml = changed && changed.size > 0 ? patchRecallYaml(existing, cfg, changed) : existing;
	} catch {
		yaml = defaultRecallYaml(cfg);
	}
	if (changed && changed.size === 0) return;
	const temporary = join(dir, ".recall.yaml." + process.pid + "." + Date.now() + "." + randomUUID() + ".tmp");
	let fd;
	try {
		fd = openSync(temporary, "wx");
		writeFileSync(fd, yaml, "utf8");
		fsyncSync(fd);
		closeSync(fd);
		fd = void 0;
		renameSync(temporary, target);
	} finally {
		if (fd !== void 0) closeSync(fd);
		try {
			unlinkSync(temporary);
		} catch {}
	}
}
//#endregion
//#region src/index.ts
/**
* dsh-oks -- DeepSeek Harness plugin for the OKS knowledge base.
*
* Host half: registers model-facing tools (oks_recall/status/wiki_use/metrics),
* a settings namespace for the browser card (RecallParamsCard), and a runtime
* skill that tells the model when to recall.
*
* Integration: calls the `oks` CLI via subprocess; dsh (Node) and oks (Python)
* stay decoupled, each upgrades independently.
*/
const execAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
/** Settings namespace shared by the Host half and the browser card. */
const OKS_NS = settingsNamespace("oks");
/** Schema for the settings card. knowledge_base_path writes ~/.oks/config.json
* (via `oks config set`); the rest write settings/recall.yaml. */
const OksConfigSchema = z.object({
	knowledge_base_path: z.string().default(""),
	recall_floor: z.number().min(0).max(1).step(.05).default(.7),
	recall_topn: z.number().step(1).min(1).max(10).default(3),
	recall_minlen: z.number().step(1).min(1).max(50).default(6),
	recall_cooldown: z.number().step(1).min(0).max(100).default(10),
	prestep_enabled: z.boolean().default(true),
	prestep_floor: z.number().min(0).max(1).step(.05).default(.85),
	prestep_knowledge_only: z.boolean().default(true),
	posttool_mode: z.union(["signal", "full"]).default("signal"),
	posttool_floor: z.number().min(0).max(1).step(.05).default(.9),
	posttool_topn: z.number().step(1).min(1).max(10).default(2),
	posttool_signal_rel_floor: z.number().min(0).max(10).step(.1).default(2.5),
	search_backend: z.union([
		"native",
		"fts5",
		"fusion"
	]).default("native")
});
/** Resolve the OKS binary even when DSH was launched without the user's PATH. */
function oksBin() {
	return resolveOksBin();
}
/** Log sync failures without making the settings UI fail silently. */
function warnSync(stage, error) {
	console.warn(`[dsh-oks] ${stage} failed`, error);
}
/** Sync namespace values to OKS-owned stores: knowledge_base_path uses `oks config set`
* (~/.oks/config.json); recall/posttool/search values use settings/recall.yaml.
*/
async function syncOksConfig(cfg, changed) {
	if (changed.has("knowledge_base_path")) {
		const knowledgeBasePath = cfg.knowledge_base_path?.trim() ?? "";
		try {
			if (knowledgeBasePath) await execAsync(oksBin(), [
				"config",
				"set",
				"knowledge_base_path",
				knowledgeBasePath
			]);
			else clearOksKnowledgeBasePath();
		} catch (error) {
			warnSync("knowledge_base_path update", error);
		}
	}
	const recallChanged = new Set([...changed].filter((key) => key !== "knowledge_base_path"));
	if (recallChanged.size === 0) return;
	const pathChanged = changed.has("knowledge_base_path");
	const kbPath = cfg.knowledge_base_path?.trim() || (!pathChanged ? await readOksKnowledgeBasePath() : "");
	if (!kbPath) {
		console.warn("[dsh-oks] recall.yaml write skipped: knowledge base path is empty");
		return;
	}
	try {
		writeRecallYaml(kbPath, cfg, recallChanged);
	} catch (error) {
		warnSync("recall.yaml write", error);
	}
}
/** Read the current knowledge_base_path from `oks config show` output. */
async function readOksKnowledgeBasePath() {
	try {
		const { stdout } = await execAsync(oksBin(), ["config", "show"], {
			encoding: "utf-8",
			timeout: 5e3
		});
		return parseOksKnowledgeBasePath(stdout);
	} catch (error) {
		warnSync("knowledge_base_path read", error);
		return "";
	}
}
/** Run `oks <args>` and return stdout. Uses execFile (no shell) so args like
* `;rm -rf /` are passed literally to oks, never parsed by a shell. */
async function runOks(args) {
	const { stdout } = await execAsync(oksBin(), args, {
		maxBuffer: 10485760,
		env: { ...process.env }
	});
	return stdout;
}
const name = "dsh-oks";
/** Browser Wiki panel depends on the DSH Connection RPC host seam. */
const inject = [
	"settings",
	"tools",
	"connection"
];
/** Source label for hook-injected messages; lets downstream see who spoke. */
const PLUGIN_SOURCE = {
	kind: "plugin",
	plugin: "dsh-oks"
};
/** Tools whose results are worth a post-tool memory signal. */
const SIGNAL_TOOLS = /* @__PURE__ */ new Set([
	"read",
	"write",
	"edit",
	"bash",
	"grep",
	"glob"
]);
/** Pull the plain-text query out of the last user message's content blocks. */
function extractQuery(messages) {
	const last = messages[messages.length - 1];
	if (!last?.content) return "";
	return last.content.filter((b) => b.type === "text" && "text" in b).map((b) => b.text).join(" ").trim();
}
/** Parse `oks recall --format json` into context text, cited slugs, and inject_id, or null.
* Mirrors pi's user-prompt-recall.py template: <recalled-memory source="oks">
* The wrapper includes a concise body preview and guidance for stronger evidence. */
function parseRecall(stdout) {
	try {
		const data = JSON.parse(stdout);
		const items = [...data.knowledge ?? [], ...data.episodic ?? []];
		if (items.length === 0) return null;
		const lines = ["## Relevant OKS memory", "Use this evidence as context. If it conflicts with current facts, verify before relying on it."];
		for (const item of items) if ("slug" in item) {
			lines.push(`- [${item.type ?? ""}] ${item.title ?? item.slug ?? ""} (${item.slug ?? ""}) rel=${(item.relevance ?? 0).toFixed(2)}`);
			const preview = String(item.body_preview ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
			if (preview) lines.push(`    ${preview}`);
		} else {
			lines.push(`- [episodic] ${item.source_path ?? ""} rel=${(item.relevance ?? 0).toFixed(2)}`);
			const snippet = String(item.snippet ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
			if (snippet) lines.push(`    ${snippet}`);
		}
		const slugs = items.map((item) => "slug" in item ? item.slug ?? "" : item.source_path ?? "").filter(Boolean);
		const injectId = randomUUID().slice(0, 8);
		return {
			text: [
				"<recalled-memory source=\"oks\">",
				lines.join("\n"),
				"",
				"If the task needs stronger evidence, call oks_recall or oks recall before making a claim.",
				`<!-- inject_id:${injectId} slugs:${slugs.join(",")} -->`,
				"</recalled-memory>"
			].join("\n"),
			injectId,
			slugs
		};
	} catch {
		return null;
	}
}
/** A short post-tool signal: mirrors pi's post-tool-edit.py signal mode.
* The signal contains slugs and relevance only; the model can call oks_recall for details. */
function parseSignal(stdout, query, floor, signalRelFloor = 0) {
	try {
		const data = JSON.parse(stdout);
		const items = [...data.knowledge ?? [], ...data.episodic ?? []];
		if (items.length === 0) return null;
		const topRelevance = items[0]?.relevance;
		if (typeof topRelevance === "number" && topRelevance < signalRelFloor) return null;
		const lines = [`<!-- query="${query}" floor=${floor} signal_rel_floor=${signalRelFloor} (signal: slugs only, no body) -->`];
		for (const m of items) if ("slug" in m) lines.push(`- [${m.type ?? ""}] ${m.title ?? m.slug ?? ""} (slug: ${m.slug ?? ""}, rel: ${(m.relevance ?? 0).toFixed(2)})`);
		else lines.push(`- [episodic] ${m.source_path ?? ""} (rel: ${(m.relevance ?? 0).toFixed(2)})`);
		lines.push(`  如需更强证据，请调用 oks_recall 或执行 oks recall "${query}" --explain`);
		const slugs = items.map((m) => "slug" in m ? m.slug ?? "" : m.source_path ?? "").filter(Boolean);
		const injectId = randomUUID().slice(0, 8);
		lines.push(`<!-- inject_id:${injectId} slugs:${slugs.join(",")} -->`);
		return {
			text: [
				"<oks-memory-signal source=\"oks-posttool\">",
				...lines,
				"</oks-memory-signal>"
			].join("\n"),
			injectId,
			slugs
		};
	} catch {
		return null;
	}
}
/** Build a UserMessage carrying context text, tagged with our plugin source. */
function contextMessage(text) {
	return createUserMessage({
		content: [{
			type: "text",
			text
		}],
		source: PLUGIN_SOURCE
	});
}
/** Path to the inject-feedback JSONL log (under ~/.oks/, the global config dir). */
function feedbackLogPath() {
	return join(process.env.HOME ?? "/tmp", ".oks", "inject_feedback.log");
}
/** Append a feedback record as one JSONL line. Best-effort; never throws. */
function appendFeedback(record) {
	try {
		const line = JSON.stringify({
			...record,
			ts: (/* @__PURE__ */ new Date()).toISOString()
		});
		const dir = dirname(feedbackLogPath());
		mkdirSync(dir, { recursive: true });
		appendFileSync(feedbackLogPath(), line + "\n", "utf-8");
	} catch {}
}
/** Parse oks recall JSON to a plain {knowledge, episodic} object (no prompt text).
* Used by the multi-query fan-out in oks_recall. */
function parseRecallJson(stdout) {
	try {
		const d = JSON.parse(stdout);
		return {
			knowledge: d.knowledge ?? [],
			episodic: d.episodic ?? []
		};
	} catch {
		return {
			knowledge: [],
			episodic: []
		};
	}
}
/** Read ~/.oks/inject_feedback.log and tally ratings. Best-effort; never throws. */
function readInjectStats() {
	const empty = {
		total: 0,
		useful: 0,
		noise: 0,
		irrelevant: 0,
		bySlug: {}
	};
	try {
		const raw = readFileSync(feedbackLogPath(), "utf-8").trim();
		if (!raw) return empty;
		for (const line of raw.split("\n")) try {
			const r = JSON.parse(line);
			const rating = r.rating;
			if (!rating || !(rating in empty)) continue;
			empty[rating]++;
			empty.total++;
			const slugs = String(r.slugs ?? "").split(",").map((s) => s.trim()).filter(Boolean);
			for (const s of slugs) {
				empty.bySlug[s] ??= {
					useful: 0,
					noise: 0,
					irrelevant: 0
				};
				empty.bySlug[s][rating]++;
			}
		} catch {}
	} catch {}
	return empty;
}
/** Derive a recall query from a tool execution: its name + stringified args. */
function deriveQuery(exec) {
	const args = Object.entries(exec.args ?? {}).map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`).join(" ");
	return `${exec.name} ${args}`.slice(0, 200);
}
function apply(ctx, config = {}) {
	const settingsHooks = createDynamicSettingsHooks(config, syncOksConfig);
	installSettingsSection(ctx, OKS_NS, OksConfigSchema, config, settingsHooks);
	ctx.connection.rpc.handle("/oks", async (endpoint, payload) => {
		const body = payload && typeof payload === "object" ? payload : {};
		const configuredPath = settingsHooks.getCurrent().knowledge_base_path || await readOksKnowledgeBasePath();
		if (endpoint === "diagnostics") {
			let oksCliAvailable = true;
			try {
				await execAsync(oksBin(), ["--version"], { timeout: 5e3 });
			} catch {
				oksCliAvailable = false;
			}
			try {
				return {
					ok: true,
					value: await getOksDiagnostics(configuredPath, oksCliAvailable)
				};
			} catch (error) {
				warnSync("OKS diagnostics", error);
				return {
					ok: true,
					value: {
						connected: false,
						status: "read-error",
						message: "Unable to read OKS knowledge-base data.",
						oksCliAvailable,
						knowledgeBaseConfigured: Boolean(configuredPath),
						wikiDirectory: false,
						draftsDirectory: false,
						rawDirectory: false,
						wikiCount: 0,
						draftCount: 0,
						rawFileCount: 0,
						rawBundleCount: 0
					}
				};
			}
		}
		if (!configuredPath) return {
			ok: false,
			error: {
				code: "internal",
				message: "OKS knowledge_base_path is not configured.",
				details: {}
			}
		};
		try {
			if (endpoint === "overview") return {
				ok: true,
				value: await getOksOverview(configuredPath)
			};
			if (endpoint === "raw-list") return {
				ok: true,
				value: await listRawBundles(configuredPath, {
					query: typeof body.query === "string" ? body.query : void 0,
					status: typeof body.status === "string" ? body.status : void 0
				})
			};
			if (endpoint === "raw-get") {
				const value = await getRawBundle(configuredPath, body.id);
				if (!value) return {
					ok: false,
					error: {
						code: "internal",
						message: "The requested Raw Bundle was not found.",
						details: {}
					}
				};
				return {
					ok: true,
					value
				};
			}
			if (endpoint === "draft-list") return {
				ok: true,
				value: await listDraftPages(configuredPath, {
					query: typeof body.query === "string" ? body.query : void 0,
					area: typeof body.area === "string" ? body.area : void 0,
					type: typeof body.type === "string" ? body.type : void 0
				})
			};
			if (endpoint === "draft-get") {
				const value = await getDraftPage(configuredPath, body.slug);
				if (!value) return {
					ok: false,
					error: {
						code: "internal",
						message: "The requested Draft was not found.",
						details: {}
					}
				};
				return {
					ok: true,
					value
				};
			}
			if (endpoint === "wiki-list") return {
				ok: true,
				value: await listWikiPages(configuredPath, {
					query: typeof body.query === "string" ? body.query : void 0,
					area: typeof body.area === "string" ? body.area : void 0,
					type: typeof body.type === "string" ? body.type : void 0
				})
			};
			if (endpoint === "wiki-get") {
				const value = await getWikiPage(configuredPath, body.slug);
				if (!value) return {
					ok: false,
					error: {
						code: "internal",
						message: "The requested Wiki page was not found.",
						details: {}
					}
				};
				return {
					ok: true,
					value
				};
			}
			return {
				ok: false,
				error: {
					code: "internal",
					message: "Unknown dsh-oks browser endpoint.",
					details: {}
				}
			};
		} catch (error) {
			warnSync(`OKS lifecycle browser ${endpoint}`, error);
			return {
				ok: false,
				error: {
					code: "internal",
					message: "Unable to read the requested OKS lifecycle data.",
					details: {}
				}
			};
		}
	}, { authority: "trusted-host" });
	ctx.tools.register(defineTool({
		name: "oks_recall",
		description: "Recall relevant memories from the OKS knowledge base. Use when the task involves uncertain concepts, historical decisions, or competitor comparison. Query with task intent, not tool operations. Pass `queries` (5-6 guesses) to fan out: each is recalled in parallel and results merged + deduped by slug for richer coverage for ambiguous tasks.",
		parameters: {
			query: {
				type: "string",
				required: true,
				description: "Task-intent query. E.g. \"OKS memory system vs ai-book chapter 3\""
			},
			queries: {
				type: "array",
				description: "Optional 5-6 alternative phrasings; fanned out in parallel and deduped. E.g. [\"git branch naming\", \"branch strategy\", \"trunk-based development\"]."
			},
			limit: {
				type: "number",
				description: "Max results per query (default: recall.topn from settings, or 3)"
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute(args) {
			const limit = args.limit ?? 3;
			const all = [args.query, ...args.queries ?? []].filter(Boolean);
			if (all.length <= 1) return runOks([
				"recall",
				args.query,
				"--format",
				"json",
				"--limit",
				String(limit)
			]);
			const outs = await Promise.all(all.map((q) => runOks([
				"recall",
				q,
				"--format",
				"json",
				"--limit",
				String(limit)
			]).then(parseRecallJson).catch(() => ({
				knowledge: [],
				episodic: []
			}))));
			const seen = /* @__PURE__ */ new Set();
			const knowledge = [];
			const episodic = [];
			for (const o of outs) {
				for (const h of o.knowledge ?? []) {
					const slug = String(h.slug ?? "");
					if (slug && !seen.has(slug)) {
						seen.add(slug);
						knowledge.push(h);
					}
				}
				for (const h of o.episodic ?? []) {
					const p = String(h.source_path ?? "");
					if (p && !seen.has(p)) {
						seen.add(p);
						episodic.push(h);
					}
				}
			}
			return JSON.stringify({
				schema_version: "recall-response/v1-multi",
				query: args.query,
				knowledge,
				episodic
			});
		}
	}));
	ctx.tools.register(defineTool({
		name: "oks_status",
		description: "Show OKS knowledge base status: wiki count, tier distribution, drafts.",
		parameters: {},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute() {
			return runOks(["status"]);
		}
	}));
	ctx.tools.register(defineTool({
		name: "oks_wiki_use",
		description: "Mark a wiki page as used (access_count++). Call this when you actually cited or applied a recalled memory; it is the self-evaluation signal.",
		parameters: { slug: {
			type: "string",
			required: true,
			description: "Wiki page slug"
		} },
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute(args) {
			return runOks([
				"wiki",
				"use",
				args.slug
			]);
		}
	}));
	ctx.tools.register(defineTool({
		name: "oks_metrics",
		description: "Show OKS 4-dimension knowledge metrics (scale, vitality, value, credibility) plus injection stats and current recall params.",
		parameters: {},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute() {
			const base = await runOks(["metrics"]);
			const s = readInjectStats();
			const rate = s.total > 0 ? Math.round(s.useful / s.total * 100) : 0;
			const injectBlock = `\n--- OKS injection feedback ---\nTotal: ${s.total} | useful ${s.useful} (${s.total ? Math.round(s.useful / s.total * 100) : 0}%) | noise ${s.noise} | irrelevant ${s.irrelevant} | useful rate ${rate}%`;
			const topSlugs = Object.entries(s.bySlug).sort((a, b) => b[1].useful + b[1].noise - (a[1].useful + a[1].noise)).slice(0, 5);
			const slugLines = topSlugs.length ? topSlugs.map(([slug, c]) => `  ${slug}: useful ${c.useful} / noise ${c.noise}`).join("\n") : "  No per-slug feedback yet.";
			return base + injectBlock + "\nTop slugs:\n" + slugLines;
		}
	}));
	ctx.tools.register(defineTool({
		name: "oks_inject_stats",
		description: "Show OKS injection-quality stats: total feedback count, useful/noise/irrelevant breakdown, and per-slug ratings. Use to decide whether to raise prestep_floor (more noise) or lower it (missed useful).",
		parameters: {},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute() {
			const s = readInjectStats();
			if (s.total === 0) return "No OKS injection feedback recorded yet.";
			return JSON.stringify(s, null, 2);
		}
	}));
	ctx.tools.register(defineTool({
		name: "oks_inject_feedback",
		description: "Rate a prior OKS memory injection by its inject_id. Call this after answering when an injected <recalled-memory> or <oks-memory-signal> block carried a <!-- inject_id:xxx slugs:a,b --> tag. useful = cited/applied the memory; noise = irrelevant clutter; irrelevant = on-topic but not needed this turn. This feeds the injection-quality metric used to tune recall floors.",
		parameters: {
			inject_id: {
				type: "string",
				required: true,
				description: "inject_id from the injection tag"
			},
			rating: {
				type: "string",
				required: true,
				description: "one of: useful | noise | irrelevant"
			},
			slugs: {
				type: "string",
				description: "comma-list of slugs that were in the injection (optional)"
			},
			reason: {
				type: "string",
				description: "one-line why (optional)"
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute(args) {
			const rating = String(args.rating);
			if (![
				"useful",
				"noise",
				"irrelevant"
			].includes(rating)) return `error: rating must be useful|noise|irrelevant, got '${rating}'`;
			appendFeedback({
				inject_id: args.inject_id,
				rating,
				slugs: args.slugs ?? "",
				reason: args.reason ?? ""
			});
			return `recorded: inject_id=${args.inject_id} rating=${rating}`;
		}
	}));
	ctx.on("agent/pre-step", async ({ messages }, next) => {
		const activeConfig = settingsHooks.getCurrent();
		if (!isPrestepRecallEnabled(activeConfig)) return next();
		const query = extractQuery(messages);
		if (query.length < 10) return next();
		const args = [
			"recall",
			query,
			"--format",
			"json",
			"--limit",
			"2",
			"--floor",
			String(activeConfig.prestep_floor ?? .85)
		];
		if (activeConfig.prestep_knowledge_only ?? true) args.push("--knowledge-only");
		let out = "";
		try {
			out = await runOks(args);
		} catch {
			return next();
		}
		const recalled = parseRecall(out);
		if (!recalled) return next();
		const downstream = await next();
		if (downstream.kind !== "enter") return downstream;
		return {
			kind: "enter",
			messages: [...downstream.messages, contextMessage(recalled.text)]
		};
	});
	ctx.on("tools/post-execute", async (exec, _result, next) => {
		if (!SIGNAL_TOOLS.has(exec.name)) return next();
		const query = deriveQuery(exec);
		if (query.length < 6) return next();
		const activeConfig = settingsHooks.getCurrent();
		const floor = activeConfig.posttool_floor ?? .9;
		const topn = activeConfig.posttool_topn ?? 2;
		let out = "";
		try {
			out = await runOks([
				"recall",
				query,
				"--format",
				"json",
				"--limit",
				String(topn),
				"--floor",
				String(floor)
			]);
		} catch {
			return next();
		}
		const signal = (activeConfig.posttool_mode === "full" ? "full" : "signal") === "full" ? parseRecall(out) : parseSignal(out, query, floor, activeConfig.posttool_signal_rel_floor ?? 2.5);
		if (!signal) return next();
		const downstream = await next();
		return {
			...downstream,
			additionalContexts: [contextMessage(signal.text), ...downstream.additionalContexts ?? []]
		};
	});
	const skills = ctx.get("skills");
	if (skills) readFile(join(__dirname, "..", "skills", "SKILL.md"), "utf8").then((content) => {
		skills.register({
			name: "oks-recall",
			description: "Recall OKS memories when facing uncertain concepts or historical decisions",
			content,
			source: "runtime",
			provider: "dsh-oks"
		});
	}).catch(() => {});
}
//#endregion
export { OKS_NS, OksConfigSchema, apply, inject, name, parseSignal };
