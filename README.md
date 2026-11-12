# DSH Markdown Preview

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）右栏加一个 **Markdown 工作台**：从「开始」页一张卡片进入，浏览会话工作区里的 `.md` 文件，预览 / 看源码 / 分栏对照，并**导出为单文件 HTML**。

面向 **dsh `0.2.2-rc.1`**（桌面版与 `dsh web` 均可）。纯 JavaScript，无构建步骤、无 `node_modules`、不 fork 本体。

<!-- 截图待补：欢迎 PR 附上「开始页卡片 / 面板 / 导出结果」三张图 -->

## 功能

- **「开始」页第四张卡片** —— 排在 工作区文件 / 新建终端 / 浏览器 之后、更多工具 之前，点开即在同一面板里打开页签。
- **工作区浏览器** —— 目录可下钻、面包屑可回退、可按名字筛选；只列 `.md` / `.markdown`；底部路径框可直接打开 Markdown 文件（工作区相对或绝对路径）。
- **三种视图** —— 预览（渲染结果）/ 源码 / 分栏；窄面板下分栏自动退化为预览。视图选择与最近打开的文件会记住（按会话隔离）。
- **导出单文件 HTML** —— 转成自包含文档：CSS 内嵌、本地图片转 base64 一并塞进去，双击即看，不依赖网络、不依赖本仓库。
- **内置预览也能导出** —— 用「工作区文件」打开 `.md` 时，文档工具栏会多一个 **导出 HTML**（非 Markdown 文件不显示），与面板共用同一套转换与下载逻辑。
- 中文 / 英文双语文案，深浅色跟随 `--dsw-alias-*` 主题令牌。

## 和已有 Markdown 插件的关系

社区里已经有几款，形态各不相同，可以按需求挑：

| 项目 | 形态 | 与本插件的差别 |
|---|---|---|
| [lunar-tear/dsh-plugins · markdown-preview](https://github.com/lunar-tear/dsh-plugins) | 会话旁的预览抽屉，**复用 shell 自带渲染器**（KaTeX、代码高亮、mermaid、HTML artifact） | 它跟着「会话正在讨论的 `.md`」走；本插件是从「开始」页进入的**工作区浏览器**，并且能**导出 HTML** |
| [poiuyjie/dsh-md-preview](https://github.com/poiuyjie/dsh-md-preview) | 点对话里的 `.md` 引用 → 右侧并排 / 浮动预览，会话内最近文件列表 | 它的入口是对话引用；本插件不接管引用点击，入口是侧栏卡片，多了源码/分栏与导出 |
| [GitHubJiKe/dsh-markdown-preview](https://github.com/GitHubJiKe/dsh-markdown-preview)（npm 同名包） | 对话内直接渲染「产出文件 chip」，服务端 markdown-it | 它面向 dsh `0.1.x`；本插件面向 `0.2.x`，且是独立面板 + 导出 |

一句话：**要「在聊天里顺手看一眼」用前两个；要「把工作区的 md 当文档读、并交出一份能直接发出去的 HTML」用这个。**

## 安装

```bash
# 桌面版 profile 是 desktop，dsh web 是 web；换成你自己的 profile 名
dsh plugin --profile desktop add github:MrMark019/DSH_MarkdownPreviewPulgin
```

装完**刷新一次页面**（浏览器端的 bundle 属于页面的模块图，靠刷新载入）。

> ⚠️ **不要**用 `dsh plugin add dsh-markdown-preview`：npm 上的同名包是另一个插件（而且只兼容 `0.1.x`）。请用上面的 GitHub 地址，或本地路径安装。
>
> 本地开发可直接把 checkout 链进 profile：
>
> ```bash
> dsh plugin --profile desktop add -w /path/to/DSH_MarkdownPreviewPulgin
> ```

## 使用

1. 展开右栏，回到「开始」页 —— 第四张卡片 **Markdown 预览**。
2. 点目录进到目标目录，点任意 `.md`；或直接在底部路径框输入 `D:\path\to\note.md`。
3. 顶部切换 **预览 / 源码 / 分栏**，点 **导出 HTML** 下载 `<文件名>.html`。
4. 想导出通过「工作区文件」打开的 md：在文档工具栏点 **导出 HTML**。

## 导出行为

- 输出一个 `<!doctype html>` 文档：内嵌样式（含 `prefers-color-scheme: dark`）、无外部 CSS/JS。
- 文档里相对路径的本地图片会经 Host 读取并转成 `data:` URL 内嵌（单图上限 4 MiB、最多 8 张）；读不到或超限的保留原相对路径 —— 导出的 HTML 与源文件放在一起时仍然能显示。
- 大文件：读取上限 40 页 / 约 150 万字符，超出会截断并在面板提示。
- 只读，不写回工作区；导出走浏览器/桌面壳的下载。

## 支持的 Markdown

CommonMark 的块级与行内基础 + GFM 里这些文档常用的部分：

标题（ATX / Setext）、段落与硬换行、分割线、粗体/斜体/删除线/行内代码、围栏与缩进代码块（语言标签）、无序/有序/嵌套列表、任务清单、引用（可嵌套）、GFM 表格（含对齐）、链接与图片、自动链接、行首 YAML frontmatter（渲染成元信息块）。

**不支持**：原始 HTML（一律转义显示，不执行）、脚注、数学公式、MDX、自定义容器。

## 给插件作者：两处踩过的坑

1. **Cordis 的服务属性是按 `inject` 键守卫的，Remote 命名空间要用「带点」的键。**
   `ctx.remote` 可用不代表 `ctx.remote.workspaceFiles` 可用 —— 后者会抛
   `cannot get property "remote.workspaceFiles" without inject`。
   正确写法是把命名空间本身放进客户端半边的 `inject`：

   ```js
   export const inject = ['slots', 'locale', 'sidebarRightTabs', 'remote', 'remote.workspaceFiles']
   ```

   读的时候优先用不会抛的 `ctx.get('remote.workspaceFiles')`，属性读取只作兜底并包 `try/catch`。
2. **`workspaceFiles.list` 的空路径是 `gateway/bad-request`。**
   根目录要传 `'.'`，且目录列表是工作区作用域 —— 只接受工作区相对路径（绝对路径用于 `read` / `readBytes`）。

另外：`dsh.client.inject` 只负责**模块加载顺序**，加错包会让整个客户端包冷启动加载失败（表现为页签在、内容空白）。这次调试就是靠页面内的 error boundary + 诊断行定位的，所以面板自带渲染异常兜底。

## 实现概要

| 部分 | 用法 |
|---|---|
| 入口卡片 | `ctx.sidebarRightTabs.register({ id, kind: 'markdown', title, guide: [{ id, order, title, description, icon }] })` |
| 页签主体 | `ctx.slots.register({ name: 'sidebar.right.pane.tab', key: '<definition id>' })` |
| 内置预览的导出按钮 | `ctx.slots.register({ name: 'sidebar.right.tab.document.actions', id, order })`，owner prop 是 `absolutePath` |
| 读文件 | `remote.workspaceFiles.list / read / readBytes`（`read` 分页读完整文本，`readBytes` 取图片） |
| 渲染与导出 | 自带转换器（无第三方依赖），预览与导出共用同一份 HTML，保证所见即所得 |

不接管 `*.md` 的资源打开：从「工作区文件」点 md 仍由官方文档预览处理（它对本地图片、PDF 等保真度更高），本插件只在它的工具栏加一个导出动作。

## 目录结构

```
index.js              Host 半边：只占一个 Loader 行，注册副作用为空
lib/client.js         浏览器半边：转换器 + 面板 + 导出按钮 + 注册（单文件，无构建）
cordis.patch.yml      profile 补丁层：插入 markdown-preview 行
locale/{zh,en}.json   插件列表里的标题与描述
icon.svg              插件图标
test/client.test.mjs  17 条用例：注册形状、渲染兜底、转换器、导出文档
```

## 开发与测试

```bash
node --test test/client.test.mjs
```

用例不需要本体、浏览器或网络：它用桩模块表跑真实的 `__ModuleLoader__.load` 握手，再把组件函数真跑一遍（含“服务属性被守卫时不许抛”的回归）。

## 已知限制

- 面板是会话作用域：没有会话就没有可浏览的工作区。
- 依赖 Web / 桌面窗口的传输层；缺失时面板会说明原因而不是静默失败。
- 只有中文与英文文案；不注册快捷键。
- 不做编辑、重命名、删除，也不做文件监视自动重载（手动「重新读取」）。
- 分栏视图在窄面板下退化为单栏预览（容器查询 < 560px）。

## 许可

[MIT](LICENSE) © 2026 MrMark019

---

## English summary

A Markdown workspace for the DeepSeek Harness right Sidebar (dsh `0.2.2-rc.1`): a card on the **Start** page opens a panel that browses the Session workspace, renders `.md` files with preview / source / split views, and exports a **self-contained HTML file** (embedded CSS, local images inlined as data URLs). The shipped document preview's toolbar also gains an **Export HTML** action for `.md` files. Pure JavaScript, no build step, no dependencies. MIT.

Install: `dsh plugin --profile <profile> add github:MrMark019/DSH_MarkdownPreviewPulgin`, then reload the page.