// Shape and converter tests for the browser half.
//
// The bundle is a classic script that only registers a factory, so it loads here
// against a stub module table and a recording plugin context: that proves the two
// registrations the UI depends on (the tab type with its guide card, the panel
// body, the preview's toolbar action). The exported `__markdown` helpers are
// tested directly.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const bundle = path.join(here, '..', 'lib', 'client.js')

/** Load the bundle and return its factory. */
async function loadBundle() {
  const source = await fs.readFile(bundle, 'utf8')
  let entry
  const window = {
    __ModuleLoader__: { load: (captured) => { entry = captured } },
    localStorage: { getItem: () => null, setItem: () => {} },
  }
  const element = () => ({ id: '', textContent: '', remove() {} })
  const document = {
    getElementById: () => null,
    createElement: () => element(),
    head: { append() {} },
    body: { append() {}, remove() {} },
  }
  const fn = new Function('window', 'document', `${source}\nreturn window.__ModuleLoader__;`)
  fn(window, document)
  assert.ok(entry, 'the bundle must register itself')
  return entry
}

/** Stub module table: enough React surface for the factory and the registrations. */
function stubRequire() {
  const createElement = (type, props, ...children) => ({ type, props, children })
  return (id) => {
    if (id === 'react') {
      return {
        createElement,
        Component: class { constructor(props) { this.props = props } },
        useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
        useEffect: () => {},
      }
    }
    throw new Error(`unexpected require: ${id}`)
  }
}

/** Apply the plugin to a recording context. */
async function applyPlugin() {
  const entry = await loadBundle()
  const exports = entry.factory(stubRequire())
  const slots = []
  const types = []
  const disposers = []
  const ctx = {
    effect: (run) => {
      const dispose = run()
      disposers.push(dispose)
      return () => {}
    },
    locale: { register: () => () => {}, bind: () => (key) => key },
    slots: {
      inject: (name, callback) => {
        callback()
        return () => {}
      },
      register: (options, component) => {
        slots.push({ options, component })
        return () => {}
      },
    },
    sidebarRightTabs: {
      register: (definition) => {
        types.push(definition)
        return () => {}
      },
    },
    get: () => undefined,
  }
  exports.apply(ctx)
  return { exports, slots, types, disposers }
}

test('bundle registers the tab type, its guide card, the body and the export action', async () => {
  const { exports, slots, types, disposers } = await applyPlugin()

  assert.equal(typeof exports.apply, 'function')
  assert.deepEqual(exports.inject, ['slots', 'locale', 'sidebarRightTabs', 'remote', 'remote.workspaceFiles'])
  assert.equal(types.length, 1)

  const definition = types[0]
  assert.equal(definition.id, 'dsh-markdown-preview')
  assert.equal(definition.kind, 'markdown')
  assert.equal(definition.patterns, undefined, 'a page type must not claim resource addresses')
  assert.equal(definition.guide.length, 1)
  assert.equal(definition.guide[0].id, 'markdown')
  assert.equal(definition.guide[0].order, 40)
  assert.equal(typeof definition.guide[0].title, 'function')
  assert.equal(typeof definition.guide[0].description, 'function')
  assert.equal(typeof definition.guide[0].icon, 'function')
  assert.equal(typeof definition.title(), 'string')

  const body = slots.find((slot) => slot.options.name === 'sidebar.right.pane.tab')
  assert.ok(body, 'the panel body must register into the tab seat')
  assert.equal(body.options.key, 'dsh-markdown-preview')
  assert.equal(typeof body.component, 'function')

  const action = slots.find((slot) => slot.options.name === 'sidebar.right.tab.document.actions')
  assert.ok(action, 'the preview toolbar action must register')
  assert.equal(action.options.id, 'markdown-preview.export')
  assert.equal(typeof action.component, 'function')

  assert.equal(disposers.length, 3, 'dictionaries, styles and the tab type are effects')
  for (const dispose of disposers) assert.equal(typeof dispose, 'function')
})

test('the export action hides for files that are not Markdown', async () => {
  const { slots } = await applyPlugin()
  const action = slots.find((slot) => slot.options.name === 'sidebar.right.tab.document.actions')
  assert.equal(action.component({ t: (key) => key, absolutePath: 'C:/work/notes.txt', sessionId: 'session-1' }), null)
  assert.equal(action.component({ t: (key) => key, sessionId: 'session-1' }), null)
  assert.notEqual(action.component({ t: (key) => key, absolutePath: 'C:/work/notes.md', sessionId: 'session-1' }), null)
})

/** Render Markdown through the exported helper. */
async function render(source) {
  const { exports } = await applyPlugin()
  return exports.__markdown.renderMarkdown(source)
}

test('headings, emphasis, inline code and paragraphs', async () => {
  const html = (await render('# 标题\n\n**粗** 与 *斜* 与 `code` 与 ~~删~~')).html
  assert.match(html, /<h1>标题<\/h1>/)
  assert.match(html, /<strong>粗<\/strong>/)
  assert.match(html, /<em>斜<\/em>/)
  assert.match(html, /<code class="dmp-ic">code<\/code>/)
  assert.match(html, /<del>删<\/del>/)
})

test('setext headings and thematic breaks', async () => {
  const html = (await render('标题\n===\n\n正文\n\n---\n\n尾')).html
  assert.match(html, /<h1>标题<\/h1>/)
  assert.match(html, /<hr>/)
  assert.match(html, /<p>尾<\/p>/)
})

test('fenced code keeps its language and escapes markup', async () => {
  const html = (await render('```js\nconst a = "<div>"\n```')).html
  assert.match(html, /<pre class="dmp-code" data-lang="js">/)
  assert.match(html, /&lt;div&gt;/)
  assert.doesNotMatch(html, /<div>/)
})

test('lists nest, count and carry task boxes', async () => {
  const html = (await render('- 一\n  - 一之一\n- [x] 完成\n- [ ] 未完成')).html
  assert.match(html, /<ul>/)
  assert.match(html, /一之一/)
  assert.match(html, /<input type="checkbox" disabled checked>/)
  assert.match(html, /<input type="checkbox" disabled>/)
})

test('ordered lists and blockquotes', async () => {
  const html = (await render('1. 甲\n2. 乙\n\n> 引用 **重点**')).html
  assert.match(html, /<ol>/)
  assert.match(html, /<blockquote>/)
  assert.match(html, /<strong>重点<\/strong>/)
})

test('tables keep their alignment', async () => {
  const html = (await render('| 名 | 数 |\n|:--|--:|\n| a | 1 |')).html
  assert.match(html, /<table><thead><tr>/)
  assert.match(html, /text-align:left/)
  assert.match(html, /text-align:right/)
  assert.match(html, /<td[^>]*>a<\/td>/)
})

test('links and images sanitize their targets', async () => {
  const html = (await render('[站](https://example.com) ![图](img/a.png) [坏](javascript:alert(1))')).html
  assert.match(html, /<a href="https:\/\/example.com"[^>]*>站<\/a>/)
  assert.match(html, /<img data-local-src="img\/a.png" alt="图">/)
  assert.doesNotMatch(html, /javascript:/)
})

test('raw HTML is shown as text, never as markup', async () => {
  const html = (await render('<script>alert(1)</script>\n\n<img src=x onerror=y>')).html
  assert.doesNotMatch(html, /<script/)
  assert.doesNotMatch(html, /<img src=x/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /&lt;img src=x onerror=y&gt;/)
})

test('frontmatter renders as a metadata block and leaves the body', async () => {
  const parsed = await render('---\ntitle: 演示\ntags:\n  - a\n  - b\n---\n\n# 正文')
  assert.equal(parsed.frontmatter.length, 2)
  assert.equal(parsed.frontmatter[0].key, 'title')
  assert.equal(parsed.frontmatter[1].value, 'a, b')
  assert.match(parsed.html, /<section class="dmp-frontmatter">/)
  assert.match(parsed.html, /演示/)
  assert.match(parsed.html, /<h1>正文<\/h1>/)
  assert.doesNotMatch(parsed.html, /title: 演示/)
})

test('CRLF input and empty input stay intact', async () => {
  const crlf = await render('# 甲\r\n\r\n乙')
  assert.match(crlf.html, /<h1>甲<\/h1>/)
  const empty = await render('')
  assert.equal(empty.html, '')
  assert.equal(empty.frontmatter, null)
})

test('the panel renders one element tree with the picker state', async () => {
  const { exports } = await applyPlugin()
  const tree = exports.__panel.MarkdownPanelBody({ t: (key) => key, sessionId: 'session-1' })
  assert.ok(tree, 'the panel must return an element')
  assert.equal(tree.type, 'div')
  // The toolbar is the first child; a panel that renders nothing means a blank pane.
  const toolbar = tree.children[0]
  assert.ok(toolbar, 'the toolbar must be rendered')
  assert.equal(toolbar.type, 'div')
  assert.equal(toolbar.props.className, 'dmp-toolbar')
  // The registered body is the same panel behind its own failure boundary.
  const wrapped = exports.__panel.MarkdownPanel({ t: (key) => key, sessionId: 'session-1' })
  assert.equal(wrapped.children[0].type, exports.__panel.MarkdownPanelBody)
})

test('the panel renders without a translator or a Session', async () => {
  const { exports } = await applyPlugin()
  assert.ok(exports.__panel.MarkdownPanelBody({}), 'a missing translator must not blank the pane')
  assert.ok(exports.__panel.MarkdownPanel(), 'a missing props object must not blank the pane')
})

test('a guarded service property never blanks the panel', async () => {
  const entry = await loadBundle()
  const exports = entry.factory(stubRequire())
  const ctx = {
    effect: (run) => {
      run()
      return () => {}
    },
    locale: { register: () => () => {}, bind: () => (key) => key },
    slots: { inject: (name, callback) => { callback(); return () => {} }, register: () => () => {} },
    sidebarRightTabs: { register: () => () => {} },
    get: () => {
      throw new Error('blocked')
    },
  }
  // Cordis throws on a service property the calling context did not inject, and a
  // Remote namespace is guarded by its dotted name.
  Object.defineProperty(ctx, 'remote', {
    get() {
      return {
        get workspaceFiles() {
          throw new Error('cannot get property "remote.workspaceFiles" without inject')
        },
      }
    },
  })
  exports.apply(ctx)
  assert.doesNotThrow(() => exports.__panel.remoteOf(), 'the Remote face itself must stay readable')
  assert.equal(exports.__panel.workspaceFilesOf(), null, 'a guarded namespace must read as absent, not throw')
  assert.ok(exports.__panel.MarkdownPanelBody({ t: (key) => key, sessionId: 'session-1' }))
})

test('a getter that throws for the namespace still yields a readable error', async () => {
  const entry = await loadBundle()
  const exports = entry.factory(stubRequire())
  const ctx = {
    effect: (run) => {
      run()
      return () => {}
    },
    locale: { register: () => () => {}, bind: () => (key) => key },
    slots: { inject: (name, callback) => { callback(); return () => {} }, register: () => () => {} },
    sidebarRightTabs: { register: () => () => {} },
    get: () => undefined,
    remote: {},
  }
  exports.apply(ctx)
  // The panel must still render its picker and report the failure when a listing
  // is attempted, rather than throwing during render.
  const tree = exports.__panel.MarkdownPanelBody({ t: (key) => key, sessionId: 'session-1' })
  assert.equal(tree.type, 'div')
  assert.equal(exports.__panel.workspaceFilesOf(), null)
})

test('the exported document is standalone', async () => {
  const { exports } = await applyPlugin()
  const document = exports.__markdown.buildHtmlDocument({ title: '演示', bodyHtml: '<h1>甲</h1>' })
  assert.match(document, /^<!doctype html>/)
  assert.match(document, /<meta charset="utf-8">/)
  assert.match(document, /<style>/)
  assert.match(document, /<h1>甲<\/h1>/)
  assert.doesNotMatch(document, /https?:\/\/[^\s"']+\.(css|js)/)
  assert.equal(exports.__markdown.sanitizeFileName('a:b /c?.md'), 'a-b -c-')
  assert.equal(exports.__markdown.baseName('doc/子目录/note.md'), 'note.md')
  assert.deepEqual(exports.__markdown.fileFromAddress('dsh-resource://file/session/session-1/docs/note.md'), {
    sessionId: 'session-1',
    path: 'docs/note.md',
  })
  assert.equal(exports.__markdown.fileFromAddress('dsh-resource://file/absolute/C%3A/work/note.md'), null)
})