// dsh-markdown-preview — browser half.
//
// Adds one right-Sidebar page type ("markdown") with a guide card on the
// "开始" page, the panel body that browses the Session workspace, renders
// Markdown and exports a standalone HTML file, plus one extra toolbar action on
// the shipped document preview for `.md` files.
//
// Everything reads through the existing `workspaceFiles` Remote; nothing is
// written back to the workspace. Only `react` is required as a module (the
// platform baseline); controls are the plugin's own, styled with theme tokens.
window.__ModuleLoader__.load({
	id: "dsh-markdown-preview",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const h = react.createElement;

		//#region dsh-markdown-preview: constants
		/** Locale namespace owned by this plugin. */
		const NS = "markdownPreview";
		/** Implementation identity in the tab system; also the body's keyed seat. */
		const TAB_ID = "dsh-markdown-preview";
		/** Page kind the guide card opens. */
		const TAB_KIND = "markdown";
		/** Guide card identity on the start page. */
		const GUIDE_ID = "markdown";
		/** Stylesheet element id. */
		const STYLE_ID = "dsh-markdown-preview-style";
		/** Files this panel opens. */
		const MARKDOWN_SUFFIX = /\.(md|markdown)$/i;
		/** Page cap for one complete text read. */
		const MAX_TEXT_PAGES = 40;
		/** Character cap for one complete text read. */
		const MAX_TEXT_CHARS = 1500000;
		/** Local images resolved per document. */
		const MAX_IMAGES = 8;
		/** Byte cap for one embedded image. */
		const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
		/** Persisted view choice. */
		const VIEW_KEY = "dsh-markdown-preview:view";
		/** Persisted recent-file list prefix, completed with the Session id. */
		const RECENT_PREFIX = "dsh-markdown-preview:recent:";
		/** How many recent files are remembered per Session. */
		const RECENT_LIMIT = 5;
		/** Placeholder delimiters protected from Markdown emphasis. */
		const TOKEN_OPEN = "\u0002";
		const TOKEN_CLOSE = "\u0003";
		/** Image media types the exporter embeds. */
		const IMAGE_MIME = {
			png: "image/png",
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			gif: "image/gif",
			webp: "image/webp",
			bmp: "image/bmp",
			avif: "image/avif",
			svg: "image/svg+xml"
		};
		/** Remote failure codes that get their own sentence. */
		const ERROR_KEYS = {
			"workspace-file/not-text": "error.not-text",
			"workspace-file/too-large": "error.too-large",
			"workspace-file/not-found": "error.not-found",
			"workspace-file/not-regular-file": "error.not-regular-file",
			"workspace-file/outside-workspace": "error.outside-workspace",
			"workspace-file/not-directory": "error.not-directory",
			"workspace-file/unknown-workspace": "error.unavailable",
			"workspace-file/unsupported-address": "error.unavailable",
			"gateway/cancelled": "error.cancelled"
		};
		//#endregion

		//#region dsh-markdown-preview: locale
		const zh = {
			"tab.title": "Markdown 预览",
			"guide.title": "Markdown 预览",
			"guide.desc": "浏览、渲染并导出 Markdown 文件为 HTML",
			"view.preview": "预览",
			"view.source": "源码",
			"view.split": "分栏",
			"action.back": "返回文件列表",
			"action.refresh": "重新读取",
			"action.export": "导出 HTML",
			"action.exporting": "正在导出…",
			"action.open": "打开",
			"picker.root": "工作区",
			"picker.up": "上一级",
			"picker.filter": "筛选 Markdown 文件…",
			"picker.path": "打开路径（相对工作区或绝对路径）",
			"picker.empty": "此目录没有 Markdown 文件",
			"picker.hint": "只列出 .md / .markdown；目录可以继续下钻",
			"picker.loading": "正在读取目录…",
			"picker.recent": "最近打开",
			"picker.truncated": "目录条目过多，只显示了一部分",
			"picker.dirAbsolute": "目录请从上面的列表进入；这里的路径框只接受 Markdown 文件路径（工作区相对或绝对）。",
			"error.remote": "当前连接没有文件读取通道（需要 Web GUI 传输）",
			"error.unavailable": "没有可用的会话上下文",
			"error.list": "读取目录失败",
			"error.read": "读取文件失败",
			"error.not-text": "这不是可解码的 UTF-8 文本文件",
			"error.too-large": "文件超过读取上限",
			"error.not-found": "文件不存在",
			"error.not-regular-file": "目标不是普通文件",
			"error.outside-workspace": "路径不在当前工作区范围内",
			"error.not-directory": "目标不是目录",
			"error.cancelled": "操作已取消",
			"error.generic": "操作失败",
			"hint.truncated": "文件过大，已截断显示",
			"hint.empty": "这是一个空文件",
			"hint.images": "部分本地图片无法读取，已保留原路径",
			"toast.exported": "已导出 HTML",
			"toast.copied": "HTML 已复制",
			"toast.failed": "导出失败"
		};
		const en = {
			"tab.title": "Markdown preview",
			"guide.title": "Markdown preview",
			"guide.desc": "Browse, render and export Markdown as HTML",
			"view.preview": "Preview",
			"view.source": "Source",
			"view.split": "Split",
			"action.back": "Back to files",
			"action.refresh": "Read again",
			"action.export": "Export HTML",
			"action.exporting": "Exporting…",
			"action.open": "Open",
			"picker.root": "Workspace",
			"picker.up": "Up one level",
			"picker.filter": "Filter Markdown files…",
			"picker.path": "Open a path (workspace-relative or absolute)",
			"picker.empty": "No Markdown file in this directory",
			"picker.hint": "Lists .md / .markdown only; directories can be opened",
			"picker.loading": "Reading directory…",
			"picker.recent": "Recent",
			"picker.truncated": "Too many entries; the list is cut",
			"picker.dirAbsolute": "Browse directories from the list above; this field only opens Markdown files (workspace-relative or absolute).",
			"error.remote": "This connection has no file reader (the Web GUI transport is required)",
			"error.unavailable": "No Session is available",
			"error.list": "The directory could not be read",
			"error.read": "The file could not be read",
			"error.not-text": "This is not decodable UTF-8 text",
			"error.too-large": "The file exceeds the read cap",
			"error.not-found": "No such file",
			"error.not-regular-file": "The target is not a regular file",
			"error.outside-workspace": "The path is outside this workspace",
			"error.not-directory": "The target is not a directory",
			"error.cancelled": "Cancelled",
			"error.generic": "The operation failed",
			"hint.truncated": "The file is large; the view is truncated",
			"hint.empty": "This file is empty",
			"hint.images": "Some local images could not be read; their paths are kept",
			"toast.exported": "HTML exported",
			"toast.copied": "HTML copied",
			"toast.failed": "Export failed"
		};
		//#endregion

		//#region dsh-markdown-preview: markdown core
		const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

		/**
		 * Escape text for HTML text and attribute positions.
		 * @param value - untrusted text.
		 * @returns escaped text.
		 */
		function escapeHtml(value) {
			return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
		}

		/**
		 * Reject URL schemes that must never reach href/src.
		 * @param raw - authored URL.
		 * @returns the URL to emit, or null when the scheme is refused.
		 */
		function sanitizeUrl(raw) {
			const value = String(raw == null ? "" : raw).trim();
			if (value === "") return null;
			const lower = value.toLowerCase();
			if (lower.startsWith("javascript:") || lower.startsWith("vbscript:") || lower.startsWith("file:")) return null;
			if (lower.startsWith("data:")) return lower.startsWith("data:image/") ? value : null;
			return value;
		}

		/**
		 * Whether an image reference has to be resolved through the Host.
		 * @param url - sanitized URL.
		 * @returns true for a relative or absolute filesystem path.
		 */
		function isLocalImage(url) {
			const lower = String(url).toLowerCase();
			return !(lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("data:") || lower.startsWith("//"));
		}

		/**
		 * Render inline Markdown (code spans, links, images, emphasis, breaks).
		 * @param text - one inline source fragment.
		 * @param depth - nested link-text depth; stops recursing past 3.
		 * @returns HTML fragment.
		 */
		function renderInline(text, depth) {
			const level = typeof depth === "number" ? depth : 0;
			const store = [];
			/**
			 * Park finished HTML behind a token so later passes cannot touch it.
			 * @param html - finished fragment.
			 * @returns the placeholder token.
			 */
			const put = (html) => {
				store.push(html);
				return TOKEN_OPEN + (store.length - 1) + TOKEN_CLOSE;
			};
			let work = String(text == null ? "" : text);

			work = work.replace(/(`+)([\s\S]*?)\1/g, (_match, _ticks, body) => {
				const trimmed = String(body).replace(/^[ \n]+|[ \n]+$/g, "");
				return put('<code class="dmp-ic">' + escapeHtml(trimmed) + "</code>");
			});

			if (level < 3) {
				work = work.replace(/!\[([^\]]*)\]\(\s*([^\s)]*)(?:\s+["']([^"']*)["'])?\s*\)/g, (_match, alt, url, title) => {
					const href = sanitizeUrl(url);
					if (href === null) return escapeHtml(alt);
					const titleAttr = title === undefined ? "" : ' title="' + escapeHtml(title) + '"';
					const altAttr = ' alt="' + escapeHtml(alt) + '"';
					if (isLocalImage(href)) {
						return put("<img data-local-src=\"" + escapeHtml(href) + "\"" + altAttr + titleAttr + ">");
					}
					return put('<img src="' + escapeHtml(href) + '"' + altAttr + titleAttr + ' loading="lazy">');
				});
				work = work.replace(/(^|[^!])\[([^\]]+)\]\(\s*([^\s)]*)(?:\s+["']([^"']*)["'])?\s*\)/g, (_match, lead, label, url, title) => {
					const href = sanitizeUrl(url);
					if (href === null) return lead + label;
					const titleAttr = title === undefined ? "" : ' title="' + escapeHtml(title) + '"';
					const inner = renderInline(label, level + 1);
					return lead + put('<a href="' + escapeHtml(href) + '"' + titleAttr + ' target="_blank" rel="noreferrer noopener">' + inner + "</a>");
				});
				work = work.replace(/<((?:https?:\/\/|mailto:)[^<>\s]+)>/g, (_match, url) => {
					const href = sanitizeUrl(url);
					if (href === null) return escapeHtml(url);
					return put('<a href="' + escapeHtml(href) + '" target="_blank" rel="noreferrer noopener">' + escapeHtml(url) + "</a>");
				});
			}

			work = escapeHtml(work);
			work = work.replace(/\\([\\`*_{}\[\]()#+\-.!>~|])/g, "$1");
			work = work.replace(/ {2,}\n/g, "<br>\n");
			work = work.replace(/\\\n/g, "<br>\n");
			work = work.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
			work = work.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
			work = work.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
			work = work.replace(/(^|[^\w*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
			work = work.replace(/(^|[^\w_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
			work = work.replace(new RegExp(TOKEN_OPEN + "(\\d+)" + TOKEN_CLOSE, "g"), (_match, index) => {
				const found = store[Number(index)];
				return found === undefined ? "" : found;
			});
			return work;
		}

		/**
		 * Split a table row into trimmed cells.
		 * @param line - one pipe-table row.
		 * @returns cell texts without the edge pipes.
		 */
		function splitRow(line) {
			const trimmed = String(line).replace(/^\s*\|/, "").replace(/\|\s*$/, "");
			return trimmed.split("|").map((cell) => cell.trim());
		}

		/**
		 * Whether a line starts a block that ends the current paragraph.
		 * @param lines - document lines.
		 * @param index - candidate line.
		 * @returns true when the line opens another block.
		 */
		function startsBlock(lines, index) {
			const line = lines[index];
			if (line === undefined) return false;
			if (/^\s*$/.test(line)) return true;
			if (/^\s{0,3}(`{3,}|~{3,})/.test(line)) return true;
			if (/^\s{0,3}#{1,6}\s+/.test(line)) return true;
			if (/^\s{0,3}>/.test(line)) return true;
			if (/^\s{0,3}((\*[\s*]*){3,}|(-[\s-]*){3,}|(_[\s_]*){3,})$/.test(line)) return true;
			if (/^(\s*)([-*+]|\d{1,9}[.)])\s+/.test(line)) return true;
			if (/^ {4}/.test(line)) return true;
			if (line.indexOf("|") !== -1 && index + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[index + 1])) return true;
			return false;
		}

		/**
		 * Render one list item's collected lines.
		 * @param itemLines - the item's own lines, dedented.
		 * @returns `<li>` inner HTML.
		 */
		function renderListItem(itemLines) {
			const lines = itemLines.slice();
			let task = null;
			const marker = /^\[([ xX])\]\s+(.*)$/.exec(lines[0] || "");
			if (marker !== null) {
				task = marker[1].toLowerCase() === "x";
				lines[0] = marker[2];
			}
			let body = lines.length === 1 ? renderInline(lines[0]) : renderBlocks(lines);
			if (lines.length === 1 && body.indexOf("<p>") === 0 && body.lastIndexOf("<p>") === 0 && body.endsWith("</p>")) {
				body = body.slice(3, -4);
			}
			if (task === null) return "<li>" + body + "</li>";
			const box = '<input type="checkbox" disabled' + (task ? " checked" : "") + ">";
			return '<li class="dmp-task">' + box + " " + body + "</li>";
		}

		/**
		 * Render a run of lines as block-level HTML.
		 * @param lines - document lines.
		 * @returns HTML fragment.
		 */
		function renderBlocks(lines) {
			const out = [];
			let index = 0;
			while (index < lines.length) {
				const line = lines[index];
				if (/^\s*$/.test(line)) {
					index += 1;
					continue;
				}

				const fence = /^\s{0,3}(`{3,}|~{3,})\s*([^`~]*)$/.exec(line);
				if (fence !== null) {
					const marker = fence[1][0];
					const size = fence[1].length;
					const lang = fence[2].trim().split(/\s+/)[0];
					const body = [];
					index += 1;
					while (index < lines.length) {
						const candidate = lines[index];
						const closing = new RegExp("^\\s{0,3}" + (marker === "`" ? "`" : "~") + "{" + size + ",}\\s*$");
						if (closing.test(candidate)) {
							index += 1;
							break;
						}
						body.push(candidate);
						index += 1;
					}
					const langAttr = lang === "" ? "" : ' data-lang="' + escapeHtml(lang) + '"';
					out.push('<pre class="dmp-code"' + langAttr + "><code>" + escapeHtml(body.join("\n")) + "</code></pre>");
					continue;
				}

				const atx = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
				if (atx !== null) {
					const level = atx[1].length;
					out.push("<h" + level + ">" + renderInline(atx[2]) + "</h" + level + ">");
					index += 1;
					continue;
				}

				if (index + 1 < lines.length && /^\s{0,3}(=+|-+)\s*$/.test(lines[index + 1]) && !startsBlock(lines, index)) {
					const level = lines[index + 1].trim().startsWith("=") ? 1 : 2;
					out.push("<h" + level + ">" + renderInline(line.trim()) + "</h" + level + ">");
					index += 2;
					continue;
				}

				if (/^\s{0,3}((\*[\s*]*){3,}|(-[\s-]*){3,}|(_[\s_]*){3,})$/.test(line)) {
					out.push("<hr>");
					index += 1;
					continue;
				}

				if (/^\s{0,3}>/.test(line)) {
					const quoted = [];
					while (index < lines.length && /^\s{0,3}>/.test(lines[index])) {
						quoted.push(lines[index].replace(/^\s{0,3}>[ \t]?/, ""));
						index += 1;
					}
					out.push("<blockquote>" + renderBlocks(quoted) + "</blockquote>");
					continue;
				}

				if (line.indexOf("|") !== -1 && index + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[index + 1])) {
					const header = splitRow(line);
					const separator = splitRow(lines[index + 1]);
					if (separator.length === header.length) {
						const align = separator.map((cell) => {
							const left = cell.startsWith(":");
							const right = cell.endsWith(":");
							if (left && right) return "center";
							if (right) return "right";
							if (left) return "left";
							return "";
						});
						const headHtml = header
							.map((cell, cellIndex) => {
								const style = align[cellIndex] === "" ? "" : ' style="text-align:' + align[cellIndex] + '"';
								return "<th" + style + ">" + renderInline(cell) + "</th>";
							})
							.join("");
						let cursor = index + 2;
						const rows = [];
						while (cursor < lines.length && lines[cursor].trim() !== "" && lines[cursor].indexOf("|") !== -1) {
							const cells = splitRow(lines[cursor]);
							const cellsHtml = [];
							for (let column = 0; column < header.length; column += 1) {
								const style = align[column] === "" ? "" : ' style="text-align:' + align[column] + '"';
								cellsHtml.push("<td" + style + ">" + renderInline(cells[column] === undefined ? "" : cells[column]) + "</td>");
							}
							rows.push("<tr>" + cellsHtml.join("") + "</tr>");
							cursor += 1;
						}
						out.push("<table><thead><tr>" + headHtml + "</tr></thead><tbody>" + rows.join("") + "</tbody></table>");
						index = cursor;
						continue;
					}
				}

				const listMarker = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/.exec(line);
				if (listMarker !== null) {
					const indent = listMarker[1].length;
					const ordered = /\d/.test(listMarker[2].charAt(0));
					const items = [];
					let cursor = index;
					while (cursor < lines.length) {
						const item = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/.exec(lines[cursor]);
						if (item === null) break;
						if (item[1].length !== indent) break;
						if (/\d/.test(item[2].charAt(0)) !== ordered) break;
						const content = [item[3]];
						let inner = cursor + 1;
						while (inner < lines.length) {
							const next = lines[inner];
							const sibling = /^(\s*)([-*+]|\d{1,9}[.)])\s+/.exec(next);
							if (next.trim() === "") {
								let lookahead = inner + 1;
								while (lookahead < lines.length && lines[lookahead].trim() === "") lookahead += 1;
								if (lookahead >= lines.length) {
									inner = lookahead;
									break;
								}
								const ahead = /^(\s*)([-*+]|\d{1,9}[.)])\s+/.exec(lines[lookahead]);
								if (ahead !== null && ahead[1].length <= indent) break;
								content.push("");
								inner = lookahead;
								continue;
							}
							if (sibling !== null && sibling[1].length <= indent) break;
							content.push(next.replace(new RegExp("^ {0," + (indent + 4) + "}"), ""));
							inner += 1;
						}
						items.push(renderListItem(content));
						cursor = inner;
					}
					out.push("<" + (ordered ? "ol" : "ul") + ">" + items.join("") + "</" + (ordered ? "ol" : "ul") + ">");
					index = cursor === index ? index + 1 : cursor;
					continue;
				}

				if (/^ {4}/.test(line)) {
					const body = [];
					while (index < lines.length && (/^ {4}/.test(lines[index]) || lines[index].trim() === "")) {
						body.push(lines[index].replace(/^ {4}/, ""));
						index += 1;
					}
					while (body.length > 0 && body[body.length - 1].trim() === "") body.pop();
					out.push('<pre class="dmp-code"><code>' + escapeHtml(body.join("\n")) + "</code></pre>");
					continue;
				}

				const paragraph = [line];
				index += 1;
				while (index < lines.length && !startsBlock(lines, index)) {
					paragraph.push(lines[index]);
					index += 1;
				}
				out.push("<p>" + renderInline(paragraph.join("\n")) + "</p>");
			}
			return out.join("\n");
		}

		/**
		 * Read a leading YAML frontmatter block off the document.
		 * @param text - normalized document text.
		 * @returns the block's lines and the remaining body.
		 */
		function splitFrontmatter(text) {
			const lines = String(text).split("\n");
			if (lines.length < 2 || lines[0].trim() !== "---") return { block: null, body: text };
			for (let index = 1; index < lines.length && index <= 60; index += 1) {
				const trimmed = lines[index].trim();
				if (trimmed === "---" || trimmed === "...") {
					return { block: lines.slice(1, index), body: lines.slice(index + 1).join("\n") };
				}
			}
			return { block: null, body: text };
		}

		/**
		 * Turn frontmatter lines into key/value rows.
		 * @param lines - frontmatter lines without the delimiters.
		 * @returns rows in authored order.
		 */
		function frontmatterEntries(lines) {
			const entries = [];
			for (const line of lines) {
				if (/^\s*$/.test(line)) continue;
				const pair = /^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(line);
				if (pair !== null) {
					entries.push({ key: pair[1], value: pair[2] });
					continue;
				}
				const bullet = /^\s*-\s+(.*)$/.exec(line);
				if (bullet !== null && entries.length > 0) {
					const last = entries[entries.length - 1];
					last.value = last.value === "" ? bullet[1] : last.value + ", " + bullet[1];
					continue;
				}
				if (entries.length > 0) {
					const last = entries[entries.length - 1];
					last.value = (last.value + " " + line.trim()).trim();
					continue;
				}
				entries.push({ key: "", value: line.trim() });
			}
			return entries;
		}

		/**
		 * Render frontmatter rows as the panel's metadata block.
		 * @param entries - parsed rows, or null.
		 * @returns HTML fragment, empty when there is no frontmatter.
		 */
		function renderFrontmatter(entries) {
			if (entries === null || entries.length === 0) return "";
			const rows = entries
				.map((entry) => {
					if (entry.key === "") return '<div class="dmp-fm-row"><span class="dmp-fm-value">' + escapeHtml(entry.value) + "</span></div>";
					return (
						'<div class="dmp-fm-row"><span class="dmp-fm-key">' +
						escapeHtml(entry.key) +
						'</span><span class="dmp-fm-value">' +
						escapeHtml(entry.value) +
						"</span></div>"
					);
				})
				.join("");
			return '<section class="dmp-frontmatter">' + rows + "</section>";
		}

		/**
		 * Convert Markdown source into HTML.
		 * @param source - document text.
		 * @returns parsed frontmatter, body HTML and the combined HTML.
		 */
		function renderMarkdown(source) {
			const text = String(source == null ? "" : source).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
			const split = splitFrontmatter(text);
			const entries = split.block === null ? null : frontmatterEntries(split.block);
			const body = renderBlocks(split.body.split("\n"));
			return { frontmatter: entries, body: body, html: renderFrontmatter(entries) + body };
		}

		const EXPORT_CSS = [
			":root{color-scheme:light dark}",
			"*{box-sizing:border-box}",
			"body{margin:0;padding:48px 20px 80px;background:#ffffff;color:#1f2328;font:16px/1.7 -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif}",
			"main{max-width:46rem;margin:0 auto}",
			"h1,h2,h3,h4,h5,h6{line-height:1.3;margin:2em 0 .7em;font-weight:650}",
			"h1{font-size:2em;margin-top:0;padding-bottom:.3em;border-bottom:1px solid #d8dee4}",
			"h2{font-size:1.5em;padding-bottom:.3em;border-bottom:1px solid #d8dee4}",
			"h3{font-size:1.25em}h4{font-size:1.05em}h5,h6{font-size:1em;color:#57606a}",
			"p,ul,ol,blockquote,table,pre{margin:0 0 1em}",
			"a{color:#0969da;text-decoration:none}a:hover{text-decoration:underline}",
			"code{font-family:ui-monospace,SFMono-Regular,'Cascadia Code',Consolas,monospace;font-size:.88em;background:#f6f8fa;border-radius:6px;padding:.15em .4em}",
			"pre{position:relative;background:#f6f8fa;border:1px solid #e5e9ef;border-radius:10px;padding:36px 16px 14px;overflow:auto}",
			"pre code{background:none;padding:0;font-size:.85em;line-height:1.55}",
			'pre[data-lang]::before{content:attr(data-lang);position:absolute;top:8px;left:12px;font:500 11px/1 ui-monospace,monospace;color:#8b949e;text-transform:lowercase;letter-spacing:.04em}',
			"blockquote{margin-left:0;padding:.2em 0 .2em 1em;color:#57606a;border-left:4px solid #d0d7de}",
			"ul,ol{padding-left:1.6em}li+li{margin-top:.25em}",
			"li.dmp-task{list-style:none;margin-left:-1.4em}li.dmp-task input{margin-right:.5em}",
			"table{border-collapse:collapse;width:100%;font-size:.94em;display:block;overflow:auto}",
			"th,td{border:1px solid #d0d7de;padding:6px 12px}th{background:#f6f8fa;font-weight:600}",
			"hr{height:1px;border:0;background:#d8dee4;margin:2em 0}",
			"img{max-width:100%;height:auto;border-radius:8px}",
			".dmp-frontmatter{border:1px solid #d0d7de;border-radius:10px;background:#f6f8fa;padding:10px 14px;margin:0 0 1.6em;font-size:.9em}",
			".dmp-fm-row{display:flex;gap:12px;padding:2px 0}.dmp-fm-key{flex:0 0 9em;color:#57606a;font-weight:600}",
			".dmp-fm-value{flex:1 1 auto;word-break:break-word}",
			"del{color:#57606a}",
			"@media (prefers-color-scheme:dark){body{background:#0d1117;color:#e6edf3}h1,h2{border-color:#30363d}a{color:#4493f8}code,pre,th{background:#161b22}pre,th,td{border-color:#30363d}th{color:#e6edf3}blockquote{color:#9198a1;border-color:#30363d}hr{background:#30363d}.dmp-frontmatter{background:#161b22;border-color:#30363d}.dmp-fm-key{color:#9198a1}}"
		].join("\n");

		/**
		 * Wrap rendered HTML in a standalone, self-contained document.
		 * @param options - title, body HTML and language tag.
		 * @returns the complete HTML file.
		 */
		function buildHtmlDocument(options) {
			const title = options && options.title ? String(options.title) : "Markdown";
			const bodyHtml = options && options.bodyHtml ? String(options.bodyHtml) : "";
			const lang = options && options.lang ? String(options.lang) : "zh-CN";
			return (
				'<!doctype html>\n<html lang="' +
				escapeHtml(lang) +
				'">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' +
				escapeHtml(title) +
				"</title>\n<style>\n" +
				EXPORT_CSS +
				"\n</style>\n</head>\n<body>\n<main>\n" +
				bodyHtml +
				"\n</main>\n</body>\n</html>\n"
			);
		}
		//#endregion

		//#region dsh-markdown-preview: host access
		/** The plugin's Client context, captured in apply. */
		let host = null;

		/**
		 * Read the generated Remote namespaces.
		 * @returns the Remote face, or null when the transport does not offer it.
		 */
		function remoteOf() {
			if (host === null) return null;
			try {
				const viaGet = typeof host.get === "function" ? host.get("remote") : undefined;
				if (viaGet !== undefined && viaGet !== null) return viaGet;
			} catch {
				// A non-injected service throws here; the second form is tried below.
			}
			try {
				return host.remote === undefined || host.remote === null ? null : host.remote;
			} catch {
				// Cordis guards service properties with `inject`; a profile without the
				// Web transport has no Remote at all.
				return null;
			}
		}

		/**
		 * Read the generated `workspaceFiles` namespace.
		 *
		 * Cordis guards service properties by their inject key, and a Remote
		 * namespace is guarded by its dotted name (`remote.workspaceFiles`), so a
		 * plain property read on `ctx.remote` throws even when the namespace is
		 * mounted. `ctx.get` is the throw-free accessor; the property form is the
		 * fallback for a build that provides the namespace only as a member.
		 * @returns the namespace, or null when this assembly did not mount it.
		 */
		function workspaceFilesOf() {
			if (host === null) return null;
			try {
				const viaGet = typeof host.get === "function" ? host.get("remote.workspaceFiles") : undefined;
				if (viaGet !== undefined && viaGet !== null) return viaGet;
			} catch {
				// Not provided under the dotted key; try the member form below.
			}
			const remote = remoteOf();
			if (remote === null) return null;
			try {
				return remote.workspaceFiles === undefined || remote.workspaceFiles === null ? null : remote.workspaceFiles;
			} catch {
				return null;
			}
		}

		/**
		 * Wait briefly for the `workspaceFiles` namespace.
		 *
		 * The namespace is mounted by `@deepseek-ai/dsh-api-workspace-files`'s own
		 * client half, so a panel that opens before that mount settles would
		 * otherwise see an absent namespace. Six short attempts cover the race
		 * without hiding a namespace that is genuinely not installed.
		 * @param signal - cancels the wait.
		 * @returns the mounted namespace, or null.
		 */
		async function waitForFiles(signal) {
			for (let attempt = 0; attempt < 6; attempt += 1) {
				const files = workspaceFilesOf();
				if (files !== null && typeof files.list === "function") return files;
				if (signal !== undefined && signal.aborted === true) return null;
				await new Promise((resolve) => setTimeout(resolve, 150));
			}
			return workspaceFilesOf();
		}

		/**
		 * Describe the namespace keys a Remote face exposes, for diagnostics.
		 * @param remote - Client Remote face.
		 * @returns a comma-separated key list.
		 */
		function namespaceNames(remote) {
			if (remote === null || remote === undefined || typeof remote !== "object") return "(no remote)";
			try {
				const keys = Object.keys(remote).filter((key) => key.charAt(0) !== "$");
				return keys.length === 0 ? "(empty)" : keys.join(",");
			} catch {
				return "(unreadable)";
			}
		}

		/**
		 * Describe a thrown value for the panel's diagnostic line.
		 * @param error - thrown value.
		 * @returns a short message.
		 */
		function messageOf(error) {
			if (error === null || error === undefined) return "unknown error";
			const text = typeof error.message === "string" && error.message !== "" ? error.message : String(error);
			return text.length > 240 ? text.slice(0, 240) + "…" : text;
		}

		/**
		 * Decode a file resource address into the Session and path it names.
		 * @param address - a `dsh-resource://file/session/<id>/<path>` address.
		 * @returns the Session and path, or null for another address form.
		 */
		function fileFromAddress(address) {
			if (typeof address !== "string") return null;
			const match = /^dsh-resource:\/\/file\/session\/([^/]+)\/(.+)$/.exec(address);
			if (match === null) return null;
			try {
				return { sessionId: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) };
			} catch {
				return { sessionId: match[1], path: match[2] };
			}
		}

		/**
		 * Read the on-screen Session id as a fallback for Session-scoped props.
		 * @returns the id, or undefined.
		 */
		function mountedSession() {
			try {
				return host === null ? undefined : host.sidebarRight.mounted.getSnapshot();
			} catch {
				return undefined;
			}
		}

		/**
		 * Read one Remote failure's code.
		 * @param result - a RemoteResult value or a thrown error.
		 * @returns the failure code.
		 */
		function errorCodeOf(result) {
			const error = result && result.error ? result.error : result;
			return error && typeof error.code === "string" ? error.code : "gateway/internal";
		}

		/**
		 * Localize one failure code.
		 * @param t - namespace translator.
		 * @param code - Remote failure code.
		 * @returns display text.
		 */
		function describeError(t, code) {
			const key = ERROR_KEYS[code];
			return t(key === undefined ? "error.generic" : key);
		}

		/**
		 * Describe a panel failure, which may carry a local key rather than a Remote code.
		 * @param t - namespace translator.
		 * @param code - Remote failure code or a local `error.*` key.
		 * @returns display text.
		 */
		function describePanelError(t, code) {
			if (typeof code === "string" && code.indexOf("error.") === 0) return t(code);
			return describeError(t, code);
		}

		/**
		 * Show a toast when the context-menu service offers one.
		 * @param text - localized message.
		 * @param success - success or failure styling.
		 */
		function toast(text, success) {
			if (host === null) return;
			try {
				const menus = typeof host.get === "function" ? host.get("contextMenus") : undefined;
				if (menus !== undefined && menus !== null && typeof menus.notify === "function") menus.notify(text, success);
			} catch {
				// A missing toast must never break the action.
			}
		}

		/**
		 * Read one whole UTF-8 file page by page.
		 * @param remote - Client Remote face.
		 * @param sessionId - Session whose workspace resolves the path.
		 * @param path - workspace-relative or absolute path.
		 * @param signal - cancels the read.
		 * @returns the text, its truncation state, version and absolute path.
		 */
		async function readWholeText(remote, sessionId, path, signal) {
			if (typeof sessionId !== "string" || sessionId === "") return { ok: false, code: "error.unavailable" };
			const files = await waitForFiles(signal);
			if (files === null) {
				return { ok: false, code: "error.read", detail: "workspaceFiles is not mounted; remote namespaces: " + namespaceNames(remote) };
			}
			const pages = [];
			let offset = 1;
			let chars = 0;
			try {
				for (let page = 0; page < MAX_TEXT_PAGES; page += 1) {
					const result = await files.read(sessionId, path, { offset: offset }, signal);
					if (result === null || result === undefined || result.ok !== true) {
						return { ok: false, code: errorCodeOf(result), detail: "read(" + path + ") failed" };
					}
					const value = result.value || {};
					if (value.text) pages.push(value.text);
					chars += value.text ? value.text.length : 0;
					if (value.eof === true) {
						return { ok: true, text: pages.join("\n"), truncated: false, version: value.version, absolutePath: value.absolutePath };
					}
					if (chars >= MAX_TEXT_CHARS) {
						return { ok: true, text: pages.join("\n"), truncated: true, version: value.version, absolutePath: value.absolutePath };
					}
					const lines = typeof value.lines === "number" && value.lines > 0 ? value.lines : 1;
					offset += lines;
				}
			} catch (error) {
				if (error !== null && typeof error === "object" && error.name === "AbortError") {
					return { ok: false, code: "error.cancelled", aborted: true };
				}
				return { ok: false, code: "error.read", detail: "read(" + path + "): " + messageOf(error) };
			}
			return { ok: true, text: pages.join("\n"), truncated: true, version: undefined, absolutePath: undefined };
		}

		/**
		 * Normalize one directory listing into the panel's row shape.
		 * @param value - the Remote's listing.
		 * @param requested - the directory the panel asked for.
		 * @returns a listing with an array of entries.
		 */
		function normalizeListing(value, requested) {
			const listing = value !== null && typeof value === "object" ? value : {};
			const entries = Array.isArray(listing.entries) ? listing.entries.filter((entry) => entry !== null && typeof entry === "object" && typeof entry.name === "string") : [];
			return {
				path: typeof listing.path === "string" ? listing.path : requested,
				entries: entries,
				truncated: listing.truncated === true
			};
		}

		/**
		 * List one workspace directory.
		 *
		 * The endpoint takes a workspace path and rejects an empty one, so the
		 * workspace root is requested as `.`; it is workspace-scoped, so only a
		 * relative path is ever sent. A thrown call is reported with its message
		 * instead of a bare generic failure, because the panel cannot log.
		 * @param remote - Client Remote face.
		 * @param sessionId - Session whose workspace is listed.
		 * @param path - workspace-relative directory path, empty for the root.
		 * @param signal - cancels the call.
		 * @returns the listing, or a failure code plus its diagnostic text.
		 */
		async function listDirectory(remote, sessionId, path, signal) {
			if (typeof sessionId !== "string" || sessionId === "") return { ok: false, code: "error.unavailable" };
			const files = await waitForFiles(signal);
			if (files === null) {
				return { ok: false, code: "error.list", detail: "workspaceFiles is not mounted; remote namespaces: " + namespaceNames(remote) };
			}
			const requested = path === "" ? "." : path;
			try {
				const result = await files.list(sessionId, requested, signal);
				if (result !== null && result !== undefined && result.ok === true) {
					return { ok: true, value: normalizeListing(result.value, path) };
				}
				return { ok: false, code: errorCodeOf(result), detail: "list(" + requested + ") failed" };
			} catch (error) {
				if (error !== null && typeof error === "object" && error.name === "AbortError") {
					return { ok: false, code: "error.cancelled", aborted: true };
				}
				return { ok: false, code: "error.list", detail: "list(" + requested + "): " + messageOf(error) };
			}
		}

		/**
		 * Read one image through the Host.
		 * @param remote - Client Remote face.
		 * @param sessionId - Session whose workspace resolves the target.
		 * @param target - authored image path.
		 * @param baseFile - document path that relative targets resolve from.
		 * @param signal - cancels the read.
		 * @returns native bytes or a failure code.
		 */
		async function readImageBytes(remote, sessionId, target, baseFile, signal) {
			const files = workspaceFilesOf();
			if (files === null || typeof files.readBytes !== "function") return { ok: false, code: "error.read" };
			try {
				const result = await files.readBytes(sessionId, target, { baseFile: baseFile }, signal);
				if (result === null || result === undefined || result.ok !== true) return { ok: false, code: errorCodeOf(result) };
				const data = result.value ? result.value.data : undefined;
				const bytes = data instanceof Uint8Array ? data : new Uint8Array(data || []);
				return { ok: true, bytes: bytes };
			} catch {
				return { ok: false, code: "error.read" };
			}
		}

		/**
		 * Resolve a file extension to its image media type.
		 * @param path - file path.
		 * @returns the media type.
		 */
		function mimeOf(path) {
			const match = /\.([A-Za-z0-9]+)$/.exec(String(path));
			const ext = match === null ? "" : match[1].toLowerCase();
			return IMAGE_MIME[ext] === undefined ? "application/octet-stream" : IMAGE_MIME[ext];
		}

		/**
		 * Base64-encode bytes without overflowing the call stack.
		 * @param bytes - native bytes.
		 * @returns base64 text.
		 */
		function bytesToBase64(bytes) {
			const chunk = 0x8000;
			let binary = "";
			for (let index = 0; index < bytes.length; index += chunk) {
				binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
			}
			return btoa(binary);
		}

		/**
		 * Replace local image references with blob URLs or data URLs.
		 * @param html - rendered HTML.
		 * @param options - remote, Session, base document path, signal and mode.
		 * @returns rewritten HTML plus the object URLs created and the paths that failed.
		 */
		async function inlineLocalImages(html, options) {
			const pattern = /<img\s+data-local-src="([^"]*)"([^>]*)>/g;
			const found = [];
			let match = pattern.exec(html);
			while (match !== null) {
				found.push({ raw: match[0], src: unescapeAttribute(match[1]), rest: match[2] });
				match = pattern.exec(html);
			}
			if (found.length === 0) return { html: html, created: [], failed: [] };
			const created = [];
			const failed = [];
			let output = html;
			const limited = found.slice(0, MAX_IMAGES);
			for (const item of limited) {
				const result = await readImageBytes(options.remote, options.sessionId, item.src, options.basePath, options.signal);
				if (result.ok !== true || result.bytes.length === 0 || result.bytes.length > MAX_IMAGE_BYTES) {
					failed.push(item.src);
					continue;
				}
				const type = mimeOf(item.src);
				const url = options.mode === "data" ? "data:" + type + ";base64," + bytesToBase64(result.bytes) : URL.createObjectURL(new Blob([result.bytes], { type: type }));
				if (options.mode !== "data") created.push(url);
				output = output.replace(item.raw, '<img src="' + escapeHtml(url) + '"' + item.rest + ">");
			}
			for (const item of found.slice(MAX_IMAGES)) failed.push(item.src);
			return { html: output, created: created, failed: failed };
		}

		/**
		 * Decode the few entities the converter emits inside attributes.
		 * @param value - escaped attribute text.
		 * @returns the authored text.
		 */
		function unescapeAttribute(value) {
			return String(value)
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'")
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/&amp;/g, "&");
		}

		/**
		 * Build the standalone HTML for one document, embedding local images.
		 * @param options - remote, Session, document path and text.
		 * @returns the file contents plus the image paths that failed.
		 */
		async function buildExportHtml(options) {
			const rendered = renderMarkdown(options.text);
			const inlined = await inlineLocalImages(rendered.html, {
				remote: options.remote,
				sessionId: options.sessionId,
				basePath: options.path,
				signal: options.signal,
				mode: "data"
			});
			return {
				html: buildHtmlDocument({ title: baseName(options.path), bodyHtml: inlined.html, lang: htmlLang() }),
				failed: inlined.failed
			};
		}

		/**
		 * Read the current locale as an HTML language tag.
		 * @returns a language tag such as `zh-CN`.
		 */
		function htmlLang() {
			let id = "zh";
			try {
				const snapshot = host.locale.getSnapshot();
				id = String((snapshot && (snapshot.id || snapshot.locale)) || "zh");
			} catch {
				// Keep the default.
			}
			return id.toLowerCase().startsWith("zh") ? "zh-CN" : id.toLowerCase().startsWith("en") ? "en" : id;
		}

		/**
		 * Take the last path segment.
		 * @param path - any path.
		 * @returns its basename.
		 */
		function baseName(path) {
			const parts = String(path).split(/[\\/]/);
			return parts[parts.length - 1] || "markdown";
		}

		/**
		 * Make a basename safe for a download.
		 * @param name - source basename.
		 * @returns a filesystem-safe name without the Markdown suffix.
		 */
		function sanitizeFileName(name) {
			return String(name)
				.replace(MARKDOWN_SUFFIX, "")
				.replace(/[\\/:*?"<>|]+/g, "-")
				.trim()
				.slice(0, 120) || "markdown";
		}

		/**
		 * Save HTML through the browser or desktop shell.
		 * @param html - file contents.
		 * @param name - source basename, without the Markdown suffix.
		 */
		function downloadHtml(html, name) {
			const blob = new Blob([html], { type: "text/html;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = sanitizeFileName(name) + ".html";
			anchor.rel = "noopener";
			document.body.append(anchor);
			anchor.click();
			anchor.remove();
			setTimeout(() => URL.revokeObjectURL(url), 10000);
		}

		/**
		 * Join a directory listing path with a child name.
		 * @param dir - workspace-relative directory path.
		 * @param name - child name.
		 * @returns the child's workspace path.
		 */
		function joinPath(dir, name) {
			if (dir === "") return name;
			return dir.replace(/\/+$/, "") + "/" + name;
		}

		/**
		 * Normalize user-entered paths for the Remote endpoints.
		 * @param value - authored path.
		 * @returns a slash-separated path.
		 */
		function normalizePath(value) {
			return String(value).trim().replace(/\\/g, "/").replace(/^\.\//, "");
		}

		/**
		 * Read the persisted view choice.
		 * @returns preview, source or split.
		 */
		function readView() {
			try {
				const stored = window.localStorage.getItem(VIEW_KEY);
				if (stored === "preview" || stored === "source" || stored === "split") return stored;
			} catch {
				// Storage may be unavailable.
			}
			return "preview";
		}

		/**
		 * Persist the view choice.
		 * @param view - preview, source or split.
		 */
		function writeView(view) {
			try {
				window.localStorage.setItem(VIEW_KEY, view);
			} catch {
				// Storage may be unavailable.
			}
		}

		/**
		 * Read the recent files of one Session.
		 * @param sessionId - Session identity, or undefined.
		 * @returns remembered workspace paths.
		 */
		function readRecent(sessionId) {
			if (typeof sessionId !== "string" || sessionId === "") return [];
			try {
				const raw = window.localStorage.getItem(RECENT_PREFIX + sessionId);
				const parsed = raw === null ? null : JSON.parse(raw);
				return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, RECENT_LIMIT) : [];
			} catch {
				return [];
			}
		}

		/**
		 * Remember one opened file.
		 * @param sessionId - Session identity.
		 * @param path - workspace path.
		 * @returns the updated list.
		 */
		function rememberRecent(sessionId, path) {
			const next = [path].concat(readRecent(sessionId).filter((item) => item !== path)).slice(0, RECENT_LIMIT);
			if (typeof sessionId === "string" && sessionId !== "") {
				try {
					window.localStorage.setItem(RECENT_PREFIX + sessionId, JSON.stringify(next));
				} catch {
					// Storage may be unavailable.
				}
			}
			return next;
		}
		//#endregion

		//#region dsh-markdown-preview: components
		/**
		 * The plugin mark: a page with an M and a down arrow.
		 * @param props - size and optional class name.
		 * @returns an inline SVG.
		 */
		function MarkdownGlyph(props) {
			const size = props && typeof props.size === "number" ? props.size : 16;
			return h(
				"svg",
				{
					width: size,
					height: size,
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 1.7,
					strokeLinecap: "round",
					strokeLinejoin: "round",
					className: props && props.className ? props.className : undefined,
					"aria-hidden": "true"
				},
				h("path", { d: "M6.5 3.5h7L18.5 8.5v12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" }),
				h("path", { d: "M13.5 3.5v5h5" }),
				h("path", { d: "M8 16.5v-4l1.6 2 1.6-2v4" })
			);
		}

		/**
		 * A folder glyph for directory rows.
		 * @param props - size.
		 * @returns an inline SVG.
		 */
		function FolderGlyph(props) {
			const size = props && typeof props.size === "number" ? props.size : 14;
			return h(
				"svg",
				{
					width: size,
					height: size,
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 1.7,
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true"
				},
				h("path", { d: "M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" })
			);
		}

		/**
		 * One toolbar button.
		 * @param props - label, title, handler, busy flag and variant.
		 * @returns a compact button.
		 */
		function ToolbarButton(props) {
			return h(
				"button",
				{
					type: "button",
					className: "dmp-btn" + (props.variant === "primary" ? " dmp-btn-primary" : ""),
					title: props.title === undefined ? undefined : props.title,
					onClick: props.onClick,
					disabled: props.disabled === true
				},
				props.children
			);
		}

		/**
		 * The Markdown workspace body.
		 * @param props - translator, Session scope props and tab hooks.
		 * @returns the panel element tree.
		 */
		function MarkdownPanelBody(rawProps) {
			const props = rawProps === null || rawProps === undefined ? {} : rawProps;
			const t = typeof props.t === "function" ? props.t : (key) => key;
			const sessionId = typeof props.sessionId === "string" && props.sessionId !== "" ? props.sessionId : mountedSession();
			const [view, setView] = react.useState(readView);
			const [dir, setDir] = react.useState("");
			const [listing, setListing] = react.useState(null);
			const [listState, setListState] = react.useState("loading");
			const [listError, setListError] = react.useState(null);
			const [listErrorDetail, setListErrorDetail] = react.useState(null);
			const [filter, setFilter] = react.useState("");
			const [pathInput, setPathInput] = react.useState("");
			const [docPath, setDocPath] = react.useState(null);
			const [doc, setDoc] = react.useState(null);
			const [docHtml, setDocHtml] = react.useState("");
			const [docState, setDocState] = react.useState("idle");
			const [docError, setDocError] = react.useState(null);
			const [docErrorDetail, setDocErrorDetail] = react.useState(null);
			const [notice, setNotice] = react.useState(null);
			const [exporting, setExporting] = react.useState(false);
			const [recent, setRecent] = react.useState(() => readRecent(sessionId));
			const [revision, setRevision] = react.useState(0);

			react.useEffect(() => {
				setRecent(readRecent(sessionId));
			}, [sessionId]);

			react.useEffect(() => {
				if (sessionId === undefined) {
					setListState("error");
					setListError("error.unavailable");
					return undefined;
				}
				const remote = remoteOf();
				if (remote === null) {
					setListState("error");
					setListError("error.remote");
					return undefined;
				}
				const controller = new AbortController();
				let cancelled = false;
				setListState("loading");
				setListError(null);
				listDirectory(remote, sessionId, dir, controller.signal)
					.then((result) => {
						if (cancelled) return;
						if (result.ok === true) {
							setListing(result.value);
							setListState("ready");
							setListErrorDetail(null);
						} else if (result.aborted === true) {
							// A replaced request: the cleanup already moved on.
						} else {
							setListError(result.code);
							setListErrorDetail(result.detail === undefined ? null : result.detail);
							setListState("error");
						}
					})
					.catch((error) => {
						if (!cancelled) {
							setListError("error.list");
							setListErrorDetail(messageOf(error));
							setListState("error");
						}
					});
				return () => {
					cancelled = true;
					controller.abort();
				};
			}, [sessionId, dir, revision]);

			react.useEffect(() => {
				if (docPath === null) {
					setDoc(null);
					setDocHtml("");
					setDocState("idle");
					return undefined;
				}
				if (sessionId === undefined) {
					setDocState("error");
					setDocError("error.unavailable");
					return undefined;
				}
				const remote = remoteOf();
				if (remote === null) {
					setDocState("error");
					setDocError("error.remote");
					return undefined;
				}
				const controller = new AbortController();
				let cancelled = false;
				setDocState("loading");
				setDocError(null);
				setDocErrorDetail(null);
				setDoc(null);
				setDocHtml("");
				readWholeText(remote, sessionId, docPath, controller.signal)
					.then((result) => {
						if (cancelled) return;
						if (result.ok !== true) {
							if (result.aborted === true) return;
							setDocError(result.code);
							setDocErrorDetail(result.detail === undefined ? null : result.detail);
							setDocState("error");
							return;
						}
						const rendered = renderMarkdown(result.text);
						setDoc({ path: docPath, text: result.text, html: rendered.html, truncated: result.truncated, empty: result.text.trim() === "" });
						setDocHtml(rendered.html);
						setDocState("ready");
					})
					.catch(() => {
						if (!cancelled) {
							setDocError("error.read");
							setDocState("error");
						}
					});
				return () => {
					cancelled = true;
					controller.abort();
				};
			}, [sessionId, docPath, revision]);

			react.useEffect(() => {
				if (doc === null || doc.html.indexOf("data-local-src") === -1) return undefined;
				const remote = remoteOf();
				if (remote === null || sessionId === undefined) return undefined;
				const controller = new AbortController();
				let cancelled = false;
				const created = [];
				inlineLocalImages(doc.html, { remote: remote, sessionId: sessionId, basePath: doc.path, signal: controller.signal, mode: "blob" })
					.then((result) => {
						if (cancelled) {
							result.created.forEach((url) => URL.revokeObjectURL(url));
							return;
						}
						result.created.forEach((url) => created.push(url));
						setDocHtml(result.html);
						if (result.failed.length > 0) setNotice(t("hint.images"));
					})
					.catch(() => {});
				return () => {
					cancelled = true;
					controller.abort();
					created.forEach((url) => URL.revokeObjectURL(url));
				};
			}, [doc, sessionId]);

			/**
			 * Open one workspace file in the panel.
			 * @param path - workspace-relative or absolute path.
			 */
			const openFile = (path) => {
				const next = normalizePath(path);
				if (next === "") return;
				setDocPath(next);
				setNotice(null);
				setDocError(null);
				setDocErrorDetail(null);
				if (MARKDOWN_SUFFIX.test(next) && sessionId !== undefined) setRecent(rememberRecent(sessionId, next));
			};

			/**
			 * Return to the directory browser.
			 */
			const goBack = () => {
				setDocPath(null);
				setNotice(null);
			};

			/**
			 * Switch the document view and remember it.
			 * @param next - preview, source or split.
			 */
			const changeView = (next) => {
				setView(next);
				writeView(next);
			};

			/**
			 * Re-read the current content.
			 */
			const refresh = () => setRevision((current) => current + 1);

			/**
			 * Export the open document as a standalone HTML file.
			 */
			const exportDocument = () => {
				const remote = remoteOf();
				if (remote === null) {
					setNotice(t("error.remote"));
					return;
				}
				if (doc === null || sessionId === undefined) return;
				setExporting(true);
				setNotice(null);
				buildExportHtml({ remote: remote, sessionId: sessionId, path: doc.path, text: doc.text })
					.then((built) => {
						downloadHtml(built.html, baseName(doc.path));
						toast(t("toast.exported"), true);
						if (built.failed.length > 0) setNotice(t("hint.images"));
						else if (doc.truncated === true) setNotice(t("hint.truncated"));
					})
					.catch(() => {
						setNotice(t("toast.failed"));
						toast(t("toast.failed"), false);
					})
					.finally(() => setExporting(false));
			};

			/**
			 * Render the top bar for the current state.
			 * @returns the toolbar element.
			 */
			const renderToolbar = () => {
				const documentOpen = docPath !== null;
				const views = ["preview", "source", "split"];
				return h(
					"div",
					{ className: "dmp-toolbar" },
					documentOpen
						? h(
								ToolbarButton,
								{ title: t("action.back"), onClick: goBack },
								h("span", { className: "dmp-back" }, "\u2039")
							)
						: h("span", { className: "dmp-toolbar-mark" }, h(MarkdownGlyph, { size: 15 })),
					h(
						"span",
						{ className: "dmp-title", title: docPath === null ? t("tab.title") : docPath },
						documentOpen ? baseName(docPath) : t("tab.title")
					),
					documentOpen
						? h(
								"div",
								{ className: "dmp-seg", role: "group" },
								views.map((candidate) =>
									h(
										"button",
										{
											key: candidate,
											type: "button",
											"data-active": view === candidate ? "true" : "false",
											title: t("view." + candidate),
											onClick: () => changeView(candidate)
										},
										t("view." + candidate)
									)
								)
							)
						: null,
					h(ToolbarButton, { title: t("action.refresh"), onClick: refresh }, "\u21bb"),
					documentOpen
						? h(
								ToolbarButton,
								{ title: t("action.export"), onClick: exportDocument, disabled: exporting, variant: "primary" },
								exporting ? t("action.exporting") : t("action.export")
							)
						: null
				);
			};

			/**
			 * Render the directory browser.
			 * @returns the picker element.
			 */
			const renderPicker = () => {
				const segments = dir === "" ? [] : dir.split("/").filter(Boolean);
				const entries = listing === null ? [] : listing.entries || [];
				const directories = entries
					.filter((entry) => entry.type === "directory")
					.map((entry) => ({ name: entry.name, type: "directory" }))
					.sort((left, right) => left.name.localeCompare(right.name));
				const files = entries
					.filter((entry) => entry.type === "file" && MARKDOWN_SUFFIX.test(entry.name))
					.map((entry) => ({ name: entry.name, type: "file" }))
					.sort((left, right) => left.name.localeCompare(right.name));
				const needle = filter.trim().toLowerCase();
				const visible = directories
					.concat(files)
					.filter((entry) => (needle === "" ? true : entry.name.toLowerCase().includes(needle)));

				const crumbs = [
					h(
						"button",
						{ key: "root", type: "button", className: "dmp-crumb", onClick: () => setDir("") },
						t("picker.root")
					)
				];
				segments.forEach((segment, position) => {
					const target = segments.slice(0, position + 1).join("/");
					crumbs.push(h("span", { key: "sep-" + target, className: "dmp-crumb-sep" }, "/"));
					crumbs.push(
						h(
							"button",
							{ key: "crumb-" + target, type: "button", className: "dmp-crumb", onClick: () => setDir(target) },
							segment
						)
					);
				});

				const rows = visible.map((entry) =>
					h(
						"button",
						{
							key: entry.type + ":" + entry.name,
							type: "button",
							className: "dmp-row",
							onClick: () => (entry.type === "directory" ? setDir(joinPath(dir, entry.name)) : openFile(joinPath(dir, entry.name)))
						},
						h("span", { className: "dmp-row-icon" }, entry.type === "directory" ? h(FolderGlyph, { size: 14 }) : h(MarkdownGlyph, { size: 14 })),
						h("span", { className: "dmp-row-name" }, entry.name)
					)
				);

				const recentRows =
					recent.length === 0 || dir !== ""
						? null
						: h(
								"div",
								{ className: "dmp-recent" },
								h("div", { className: "dmp-recent-title" }, t("picker.recent")),
								recent.map((path) =>
									h(
										"button",
										{ key: "recent-" + path, type: "button", className: "dmp-row dmp-row-recent", onClick: () => openFile(path) },
										h("span", { className: "dmp-row-icon" }, h(MarkdownGlyph, { size: 14 })),
										h("span", { className: "dmp-row-name", title: path }, path)
									)
								)
							);

				const body =
					listState === "loading" && listing === null
						? h("div", { className: "dmp-state" }, t("picker.loading"))
						: listState === "error"
							? h(
									"div",
									{ className: "dmp-state dmp-state-error" },
									h("div", null, describePanelError(t, listError)),
									listErrorDetail === null ? null : h("div", { className: "dmp-detail" }, listErrorDetail),
									h(ToolbarButton, { onClick: refresh }, t("action.refresh"))
								)
							: rows.length === 0
								? h(
										"div",
										{ className: "dmp-state" },
										h("div", null, t("picker.empty")),
										h("div", { className: "dmp-state-hint" }, t("picker.hint"))
									)
								: rows;

				return h(
					"div",
					{ className: "dmp-picker" },
					h(
						"div",
						{ className: "dmp-picker-bar" },
						dir === ""
							? null
							: h(
									ToolbarButton,
									{ title: t("picker.up"), onClick: () => setDir(dir.split("/").slice(0, -1).join("/")) },
									"\u2191"
								),
						h("div", { className: "dmp-crumbs" }, crumbs),
						h("input", {
							className: "dmp-search",
							type: "search",
							value: filter,
							placeholder: t("picker.filter"),
							onChange: (event) => setFilter(event.target.value)
						})
					),
					h(
						"div",
						{ className: "dmp-scroll" },
						recentRows,
						body,
						listing !== null && listing.truncated === true ? h("div", { className: "dmp-state-hint" }, t("picker.truncated")) : null
					),
					h(
						"form",
						{
							className: "dmp-path-bar",
							onSubmit: (event) => {
								event.preventDefault();
								const value = normalizePath(pathInput);
								if (value === "") return;
								if (MARKDOWN_SUFFIX.test(value)) {
									openFile(value);
									return;
								}
								// Directory listing is workspace-scoped: an absolute path cannot be
								// listed, so only a Markdown file may be opened that way.
								const absolute = /^[A-Za-z]:\//.test(value) || value.charAt(0) === "/";
								if (absolute) {
									setNotice(t("picker.dirAbsolute"));
									return;
								}
								setDir(value);
							}
						},
						h("input", {
							className: "dmp-path-input",
							type: "text",
							value: pathInput,
							placeholder: t("picker.path"),
							onChange: (event) => setPathInput(event.target.value)
						}),
						h("button", { type: "submit", className: "dmp-btn" }, t("action.open"))
					)
				);
			};

			/**
			 * Render the open document.
			 * @returns the document element.
			 */
			const renderDocument = () => {
				if (docState === "loading") return h("div", { className: "dmp-state" }, t("picker.loading"));
				if (docState === "error") {
					return h(
						"div",
						{ className: "dmp-state dmp-state-error" },
						h("div", null, describePanelError(t, docError)),
						docErrorDetail === null ? null : h("div", { className: "dmp-detail" }, docErrorDetail),
						h(
							ToolbarButton,
							{ onClick: refresh },
							t("action.refresh")
						)
					);
				}
				if (doc === null) return h("div", { className: "dmp-state" }, t("hint.empty"));
				const preview = h("div", { className: "dmp-doc", dangerouslySetInnerHTML: { __html: docHtml } });
				const source = h(
					"pre",
					{ className: "dmp-source" },
					h("code", null, doc.text)
				);
				const content =
					view === "source"
						? h("div", { className: "dmp-pane" }, source)
						: view === "split"
							? h("div", { className: "dmp-split" }, h("div", { className: "dmp-pane" }, source), h("div", { className: "dmp-pane" }, preview))
							: h("div", { className: "dmp-pane" }, preview);
				return h(
					"div",
					{ className: "dmp-docwrap" },
					doc.empty === true ? h("div", { className: "dmp-state-hint dmp-inline-hint" }, t("hint.empty")) : null,
					doc.truncated === true ? h("div", { className: "dmp-state-hint dmp-inline-hint" }, t("hint.truncated")) : null,
					content
				);
			};

			return h(
				"div",
				{ className: "dmp-root" },
				renderToolbar(),
				notice === null ? null : h("div", { className: "dmp-notice" }, notice),
				docPath === null ? renderPicker() : renderDocument()
			);
		}

		/**
		 * Render a readable message instead of a blank pane when the panel throws.
		 *
		 * A blank body is indistinguishable from a broken plugin, so the panel owns
		 * its own failure surface: the seat's supervision channel only reports to
		 * the console, which a desktop user never sees.
		 */
		class PanelBoundary extends react.Component {
			/**
			 * @param props - children to protect.
			 */
			constructor(props) {
				super(props);
				this.state = { error: null };
			}

			/**
			 * @param error - the thrown value.
			 * @returns the state that renders the message.
			 */
			static getDerivedStateFromError(error) {
				return { error: error };
			}

			/**
			 * @param error - the thrown value.
			 */
			componentDidCatch(error) {
				try {
					console.error("[dsh-markdown-preview]", error);
				} catch {
					// Logging must never mask the failure.
				}
			}

			/** @returns the panel, or its failure message. */
			render() {
				const error = this.state.error;
				if (error !== null && error !== undefined) {
					return h(
						"div",
						{ className: "dmp-root dmp-crash" },
						h("div", { className: "dmp-crash-title" }, "Markdown 预览渲染失败 / panel render failed"),
						h("pre", { className: "dmp-detail" }, messageOf(error))
					);
				}
				return this.props.children;
			}
		}

		/**
		 * The registered tab body: the panel inside its own failure boundary.
		 * @param props - slot props.
		 * @returns the boundary element.
		 */
		function MarkdownPanel(props) {
			return h(PanelBoundary, null, h(MarkdownPanelBody, props === null || props === undefined ? {} : props));
		}

		/**
		 * "Export HTML" in the shipped document preview's toolbar.
		 * @param props - translator, Session scope props and the previewed file's absolute path.
		 * @returns the action button, or nothing for a non-Markdown file.
		 */
		function DocumentExportAction(props) {
			const [busy, setBusy] = react.useState(false);
			let path =
				typeof props.absolutePath === "string" && props.absolutePath !== ""
					? props.absolutePath
					: typeof props.path === "string" && props.path !== ""
						? props.path
						: "";
			let sessionId = typeof props.sessionId === "string" ? props.sessionId : undefined;
			// The preview hands its file over as the `absolutePath` owner prop. If a
			// future build stops passing it, fall back to the active document tab's
			// resource address rather than losing the action.
			if (path === "") {
				let active;
				try {
					active = host.sidebarRight.active();
				} catch {
					active = undefined;
				}
				const derived = fileFromAddress(active ? active.contentId : undefined);
				if (derived !== null) {
					path = derived.path;
					sessionId = sessionId === undefined ? derived.sessionId : sessionId;
				}
			}
			if (!MARKDOWN_SUFFIX.test(path)) return null;
			const t = props.t;
			if (sessionId === undefined) sessionId = mountedSession();

			/**
			 * Read, convert and download the previewed file.
			 */
			const run = () => {
				const remote = remoteOf();
				if (remote === null) {
					toast(t("error.remote"), false);
					return;
				}
				if (sessionId === undefined) {
					toast(t("error.unavailable"), false);
					return;
				}
				setBusy(true);
				readWholeText(remote, sessionId, path, undefined)
					.then((result) => {
						if (result.ok !== true) {
							toast(describeError(t, result.code), false);
							return undefined;
						}
						return buildExportHtml({ remote: remote, sessionId: sessionId, path: path, text: result.text }).then((built) => {
							downloadHtml(built.html, baseName(path));
							toast(t("toast.exported"), true);
							if (built.failed.length > 0) toast(t("hint.images"), true);
						});
					})
					.catch(() => toast(t("toast.failed"), false))
					.finally(() => setBusy(false));
			};

			return h(
				"button",
				{
					type: "button",
					className: "dmp-btn dmp-btn-inline",
					title: t("action.export"),
					onClick: run,
					disabled: busy
				},
				busy ? t("action.exporting") : t("action.export")
			);
		}
		//#endregion

		//#region dsh-markdown-preview: styles
		/**
		 * Add the plugin stylesheet once per document.
		 * @returns disposer removing it.
		 */
		function installStyles() {
			const existing = document.getElementById(STYLE_ID);
			if (existing !== null) existing.remove();
			const element = document.createElement("style");
			element.id = STYLE_ID;
			element.textContent = [
				".dmp-root{display:flex;flex-direction:column;height:100%;min-height:0;container-type:inline-size;overflow:hidden;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font-size:13px;line-height:1.5}",
				".dmp-toolbar{display:flex;align-items:center;gap:6px;padding:6px 8px;min-height:36px;flex:0 0 auto;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}",
				".dmp-toolbar-mark{display:inline-flex;align-items:center;color:var(--dsw-alias-label-secondary)}",
				".dmp-back{display:inline-block;font-size:18px;line-height:1;transform:translateY(-1px)}",
				".dmp-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}",
				".dmp-btn{flex:0 0 auto;display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;line-height:22px;cursor:pointer;white-space:nowrap}",
				".dmp-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}",
				".dmp-btn:disabled{opacity:.55;cursor:default}",
				".dmp-btn-primary{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}",
				".dmp-btn-inline{height:22px;font-size:12px;padding:0 7px}",
				".dmp-seg{flex:0 0 auto;display:inline-flex;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;overflow:hidden}",
				".dmp-seg button{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;padding:2px 7px;cursor:pointer}",
				".dmp-seg button+button{border-left:1px solid var(--dsw-alias-border-l1)}",
				".dmp-seg button[data-active=true]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}",
				".dmp-notice{flex:0 0 auto;padding:4px 10px;font-size:12px;color:var(--dsw-alias-state-warn-primary);border-bottom:1px solid var(--dsw-alias-border-l1)}",
				".dmp-picker{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}",
				".dmp-picker-bar{display:flex;align-items:center;gap:6px;padding:6px 8px;flex:0 0 auto;border-bottom:1px solid var(--dsw-alias-border-l1)}",
				".dmp-crumbs{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:2px;overflow:hidden;white-space:nowrap}",
				".dmp-crumb{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;padding:2px 4px;border-radius:4px;cursor:pointer;max-width:9em;overflow:hidden;text-overflow:ellipsis}",
				".dmp-crumb:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}",
				".dmp-crumb-sep{color:var(--dsw-alias-state-idle-primary);font-size:11px}",
				".dmp-search{flex:0 1 40%;min-width:80px;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}",
				".dmp-scroll{flex:1 1 auto;min-height:0;overflow:auto;padding:6px}",
				".dmp-row{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}",
				".dmp-row:hover{background:var(--dsw-alias-bg-layer-2)}",
				".dmp-row-icon{display:inline-flex;flex:0 0 auto;color:var(--dsw-alias-label-secondary)}",
				".dmp-row-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
				".dmp-recent{margin:0 0 8px;padding:2px 0 8px;border-bottom:1px solid var(--dsw-alias-border-l1)}",
				".dmp-recent-title{padding:4px 8px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}",
				".dmp-row-recent{color:var(--dsw-alias-label-secondary)}",
				".dmp-state{padding:18px 10px;color:var(--dsw-alias-label-secondary);display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}",
				".dmp-state-error{color:var(--dsw-alias-state-error-primary)}",
				".dmp-crash{padding:18px 12px;gap:8px;overflow:auto}",
				".dmp-crash-title{font-weight:600;color:var(--dsw-alias-state-error-primary)}",
				".dmp-detail{max-width:100%;font:11px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--dsw-alias-label-secondary);word-break:break-word;text-align:left;white-space:pre-wrap}",
				".dmp-state-hint{font-size:11px;color:var(--dsw-alias-state-idle-primary);line-height:1.6}",
				".dmp-inline-hint{padding:2px 10px 6px}",
				".dmp-path-bar{display:flex;gap:6px;padding:6px 8px;flex:0 0 auto;border-top:1px solid var(--dsw-alias-border-l1)}",
				".dmp-path-input{flex:1 1 auto;min-width:0;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}",
				".dmp-docwrap{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}",
				".dmp-pane{flex:1 1 auto;min-height:0;overflow:auto;padding:14px 16px 28px}",
				".dmp-split{display:grid;grid-template-columns:1fr 1fr;gap:1px;flex:1 1 auto;min-height:0;background:var(--dsw-alias-border-l1)}",
				".dmp-split .dmp-pane{background:var(--dsw-alias-bg-base)}",
				"@container (max-width:560px){.dmp-split{grid-template-columns:1fr}.dmp-split .dmp-pane:first-child{display:none}}",
				".dmp-source{margin:0;font-family:ui-monospace,SFMono-Regular,'Cascadia Code',Consolas,monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary)}",
				".dmp-doc{color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.7;word-break:break-word}",
				".dmp-doc h1,.dmp-doc h2,.dmp-doc h3,.dmp-doc h4,.dmp-doc h5,.dmp-doc h6{margin:1.5em 0 .6em;line-height:1.3;font-weight:650}",
				".dmp-doc h1{font-size:1.6em;margin-top:0;padding-bottom:.25em;border-bottom:1px solid var(--dsw-alias-border-l1)}",
				".dmp-doc h2{font-size:1.32em;padding-bottom:.2em;border-bottom:1px solid var(--dsw-alias-border-l1)}",
				".dmp-doc h3{font-size:1.14em}.dmp-doc h4{font-size:1.02em}.dmp-doc h5,.dmp-doc h6{font-size:1em;color:var(--dsw-alias-label-secondary)}",
				".dmp-doc p,.dmp-doc ul,.dmp-doc ol,.dmp-doc blockquote,.dmp-doc table,.dmp-doc pre{margin:0 0 .9em}",
				".dmp-doc a{color:var(--dsw-alias-brand-primary);text-decoration:none}.dmp-doc a:hover{text-decoration:underline}",
				".dmp-doc ul,.dmp-doc ol{padding-left:1.5em}.dmp-doc li+li{margin-top:.2em}",
				".dmp-doc li.dmp-task{list-style:none;margin-left:-1.3em}.dmp-doc li.dmp-task input{margin-right:.45em}",
				".dmp-doc blockquote{margin-left:0;padding:.1em 0 .1em .9em;color:var(--dsw-alias-label-secondary);border-left:3px solid var(--dsw-alias-border-l2)}",
				".dmp-doc hr{height:1px;border:0;background:var(--dsw-alias-border-l1);margin:1.6em 0}",
				".dmp-doc .dmp-ic{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em;background:var(--dsw-alias-bg-layer-2);border-radius:4px;padding:.1em .35em}",
				".dmp-doc .dmp-code{position:relative;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:26px 12px 12px;overflow:auto}",
				".dmp-doc .dmp-code code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;line-height:1.55}",
				".dmp-doc .dmp-code[data-lang]::before{content:attr(data-lang);position:absolute;top:6px;left:10px;font:500 10px/1 ui-monospace,monospace;color:var(--dsw-alias-state-idle-primary);letter-spacing:.04em}",
				".dmp-doc table{border-collapse:collapse;width:100%;font-size:12px;display:block;overflow:auto}",
				".dmp-doc th,.dmp-doc td{border:1px solid var(--dsw-alias-border-l1);padding:5px 9px}",
				".dmp-doc th{background:var(--dsw-alias-bg-layer-1);font-weight:600}",
				".dmp-doc img{max-width:100%;height:auto;border-radius:6px}",
				".dmp-doc .dmp-frontmatter{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);padding:8px 11px;margin:0 0 1.2em;font-size:12px}",
				".dmp-doc .dmp-fm-row{display:flex;gap:10px;padding:1px 0}",
				".dmp-doc .dmp-fm-key{flex:0 0 7.5em;color:var(--dsw-alias-label-secondary);font-weight:600}",
				".dmp-doc .dmp-fm-value{flex:1 1 auto;word-break:break-word}",
				".dmp-doc del{color:var(--dsw-alias-label-secondary)}"
			].join("\n");
			document.head.append(element);
			return () => {
				element.remove();
			};
		}
		//#endregion

		//#region dsh-markdown-preview: plugin
		/** Services this browser half requires: the slot registry, copy, and the workspace Remote namespace. */
		const inject = ["slots", "locale", "sidebarRightTabs", "remote", "remote.workspaceFiles"];

		/**
		 * Register the tab type, its guide card, the panel body and the preview's
		 * export action.
		 * @param ctx - plugin-owned Client context.
		 */
		function apply(ctx) {
			host = ctx;
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-markdown-preview: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.effect(() => installStyles(), "dsh-markdown-preview: styles");

			ctx.effect(
				() =>
					ctx.sidebarRightTabs.register({
						id: TAB_ID,
						kind: TAB_KIND,
						title: () => t("tab.title"),
						guide: [
							{
								id: GUIDE_ID,
								order: 40,
								title: () => t("guide.title"),
								description: () => t("guide.desc"),
								icon: MarkdownGlyph
							}
						]
					}),
				"dsh-markdown-preview: tab type"
			);

			ctx.slots.inject("sidebar.right.pane.tab", () =>
				ctx.slots.register({ name: "sidebar.right.pane.tab", key: TAB_ID, locale: NS }, MarkdownPanel)
			);

			ctx.slots.inject("sidebar.right.tab.document.actions", () =>
				ctx.slots.register({ name: "sidebar.right.tab.document.actions", id: "markdown-preview.export", order: 50, locale: NS }, DocumentExportAction)
			);
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		exports.__markdown = {
			renderMarkdown: renderMarkdown,
			buildHtmlDocument: buildHtmlDocument,
			escapeHtml: escapeHtml,
			sanitizeUrl: sanitizeUrl,
			baseName: baseName,
			sanitizeFileName: sanitizeFileName,
			renderInline: renderInline,
			fileFromAddress: fileFromAddress
		};
		exports.__panel = {
			MarkdownPanel: MarkdownPanel,
			MarkdownPanelBody: MarkdownPanelBody,
			DocumentExportAction: DocumentExportAction,
			remoteOf: remoteOf,
			workspaceFilesOf: workspaceFilesOf
		};
		return module.exports;
	}
});