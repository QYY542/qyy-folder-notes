// Paste-only normalization and optional editor presentation. Portable Obsidian/browser APIs.
(() => {
// Local, paste-only conversion. No clipboard polling, network or vault reads.
function codeContext(editor) {
  const from = editor.getCursor('from');
  const before = editor.getRange({line: 0, ch: 0}, from);
  let fence = null;
  for (const line of before.split('\n')) {
    const m = line.match(/^\s*(?:>\s*)*(`{3,}|~{3,})/);
    if (!m) continue;
    if (!fence) fence = m[1];
    else if (m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
  }
  if (fence) return true;
  const line = editor.getLine(from.line), left = line.slice(0, from.ch);
  if (/^(?: {4}|\t)/.test(line)) return true;
  let ticks = null;
  for (const m of left.matchAll(/(?<!\\)`+/g)) {
    if (ticks === m[0]) ticks = null; else if (!ticks) ticks = m[0];
  }
  return !!ticks;
}

function protect(text) {
  const saved = [], prefix = 'QYYSAFE' + Math.random().toString(36).slice(2) + 'X';
  const put = value => { const id = prefix + saved.length + 'Z'; saved.push(value); return id; };
  // Preserve fenced and indented code before touching any delimiters.
  let fence = null, block = '';
  const lines = text.split(/(?<=\n)/), result = [];
  for (const line of lines) {
    const m = line.match(/^\s*(?:>\s*)*(`{3,}|~{3,})/);
    if (fence) {
      block += line;
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) { result.push(put(block)); block = ''; fence = null; }
    } else if (m) { fence = m[1]; block = line; }
    else result.push(/^(?: {4}|\t)/.test(line) ? put(line) : line);
  }
  if (block) result.push(put(block));
  let value = result.join('');
  value = value.replace(/(`+)[\s\S]*?\1/g, put);
  value = value.replace(/(?<!\\)\$\$[\s\S]*?\$\$|(?<![\\$])\$(?!\$)[^\n$]+?(?<!\\)\$(?!\$)/g, put);
  value = value.replace(/!?(?:\[\[[^\n]*?\]\]|\[[^\n\]]*\]\([^\n]*?\))|<https?:[^>]+>/g, put);
  return {value, put, restore: s => {
    for (let i = 0; i < 5 && s.includes(prefix); i++) s = s.replace(new RegExp(prefix + '(\\d+)Z', 'g'), (_, n) => saved[Number(n)]);
    return s;
  }};
}

function blockMath(tex, source, offset, length) {
  const line = source.slice(source.lastIndexOf('\n', offset - 1) + 1, offset);
  // Tables cannot contain a multiline cell. Use inline math there.
  if (/^\s*\|/.test(line)) return '$' + tex.trim().replace(/\n/g, ' ') + '$';
  const quote = line.match(/^(\s*(?:>\s*)+)$/)?.[1];
  const list = line.match(/^(\s*(?:>\s*)*)([-+*]|\d+[.)])([ \t]+)$/);
  if (/^\s*>/.test(line) && !quote && !list) return '$' + tex.trim().replace(/\n/g, ' ') + '$';
  const prefix = quote || (list ? list[1] + ' '.repeat(list[2].length + list[3].length) : '');
  const following = source.slice(offset + length).split('\n')[0];
  return (line.trim() && !prefix ? '\n\n' : '') + '$$\n' + prefix + tex.trim() + '\n' + prefix + '$$' + (following.trim() ? '\n\n' + prefix : '');
}

function normalizeMarkdown(input) {
  if (typeof input !== 'string' || input.length > 2_000_000) return input;
  const p = protect(input.replace(/\r\n?/g, '\n'));
  let s = p.value;
  s = s.replace(/(?<!\\)(\\{1,2})\[([\s\S]*?)\1\]/g, (all, slash, tex, offset, source) => {
    if (!tex.trim() || !/[=^_\\+\-]/.test(tex)) return all;
    return p.put(blockMath(tex, source, offset, all.length));
  });
  s = s.replace(/(?<!\\)(\\{1,2})\(([^\n]*?)\1\)/g, (all, slash, tex) => tex.trim() ? p.put('$' + tex.trim() + '$') : all);
  // Strong/emphasis delimiters cannot contain leading/trailing spaces.
  s = s.replace(/(?<![\\*])(\*{2,3})([^\n*]+?)\1(?!\*)/g, (all, marks, body, offset, source) => {
    if (!body.trim()) return all;
    const left = body.match(/^[ \t\u00a0]+/)?.[0] || '', right = body.match(/[ \t\u00a0]+$/)?.[0] || '';
    const boundary = !right && /[\p{P}\p{S}]$/u.test(body.trim()) && /^[\p{L}\p{N}]/u.test(source.slice(offset + all.length)) ? ' ' : '';
    return left + marks + body.trim() + marks + right + boundary;
  });
  return p.restore(s);
}

function hasMarkdown(text) {
  return /^(?: {0,3}#{1,6}\s| {0,3}>\s|\s*`{3,}|\s*~{3,}|\s*\|.+\|)/m.test(text) ||
    /(?<!\\)\*\*[^*\n]+\*\*|(?<!\\)\[[^\n\]]+\]\([^\n)]+\)/.test(text) ||
    /\\{1,2}[\[(][\s\S]*?\\{1,2}[\])]/.test(text);
}

function mathHtml(html, Parser) {
  if (!html || html.length > 2_000_000 || !Parser) return {html, restore: x => x, count: 0, rich:false};
  const doc = new Parser().parseFromString('<body>' + html + '</body>', 'text/html');
  const rich = !!doc.body.querySelector('a[href],img,table,pre,code,blockquote,h1,h2,h3,h4,h5,h6,strong,b,em,i,ul,ol,del,s');
  const entries = [], prefix = 'QYYMATH' + Math.random().toString(36).slice(2) + 'X';
  const nodes = [...doc.querySelectorAll('annotation[encoding="application/x-tex"], script[type^="math/tex"], [data-math], [data-tex], img[alt]')];
  for (const node of nodes) {
    if (!doc.body.contains(node) || node.closest('pre,code')) continue;
    let tex, root, display = false;
    if (node.matches('annotation')) {
      tex = node.textContent;
      root = node.closest('.katex-display') || node.closest('.katex') || node.closest('mjx-container') || node.closest('math') || node;
      display = root.matches('.katex-display,[display="block"],[display="true"]') || !!node.closest('math[display="block"]');
    } else if (node.matches('script')) {
      tex = node.textContent; root = node; display = /mode\s*=\s*display/.test(node.type);
      // MathJax v2's visual sibling represents this exact script, not another formula.
      if (node.id) doc.getElementById(node.id + '-Frame')?.remove();
      if (node.previousElementSibling?.matches('.MathJax_Preview')) node.previousElementSibling.remove();
    } else if (node.matches('img')) {
      if (!node.matches('.equation,.math,[data-equation]')) continue;
      tex = node.getAttribute('alt'); root = node;
    } else {
      tex = node.getAttribute('data-math') || node.getAttribute('data-tex'); root = node;
      display = node.matches('[data-display="block"],[data-display="true"],.katex-display,div');
    }
    if (!tex?.trim()) continue;
    const token = prefix + entries.length + 'Z';
    if (root.closest('td,th')) display = false;
    entries.push({token, tex: tex.trim(), display});
    root.replaceWith(doc.createTextNode(token));
  }
  // Preserve explicit LaTeX delimiters embedded in ordinary rich-text nodes too.
  const walker=doc.createTreeWalker(doc.body,4), texts=[];
  for(let node; (node=walker.nextNode());) if(!node.parentElement.closest('pre,code,script,style,math,textarea'))texts.push(node);
  for(const node of texts) {
    node.nodeValue=node.nodeValue.replace(/(?<!\\)(\\{1,2})(\[|\()([\s\S]*?)\1(\]|\))/g,(all,slash,open,tex,close)=>{
      if((open==='['&&close!==']')||(open==='('&&close!==')')||!tex.trim()||(open==='['&&!/[=^_\\+\-]/.test(tex)))return all;
      const token=prefix+entries.length+'Z';entries.push({token,tex:tex.trim(),display:open==='['&&!node.parentElement.closest('td,th')});return token;
    });
  }
  return {html: entries.length ? doc.body.innerHTML : html, count: entries.length, rich,
    restore(md) {
      for (const {token, tex, display} of entries) {
        md = md.replaceAll(token, (_, offset) => display ? blockMath(tex, md, offset, token.length) : '$' + tex.replace(/\n/g, ' ') + '$');
      }
      return md;
    }};
}

function convertPaste(html, plain, converter, Parser) {
  const text = plain ?? '';
  const math = mathHtml(html, Parser);
  if (math.count) {
    const md = converter(math.html, '');
    return md == null ? normalizeMarkdown(text) : normalizeMarkdown(math.restore(md));
  }
  // A Markdown clipboard must not be fed through HTML-to-Markdown a second time.
  if (hasMarkdown(text) && !math.rich) return normalizeMarkdown(text);
  const md = converter(html, plain);
  return md == null ? (normalizeMarkdown(text) !== text ? normalizeMarkdown(text) : null) : normalizeMarkdown(md);
}


const css = `
/* Table editing must inherit the cell's typography, not Power Editor's body spacing. */
body.qyy-stable-editing .markdown-source-view.mod-cm6 .cm-table-widget .cm-editor,
body.qyy-stable-editing .markdown-source-view.mod-cm6 .cm-table-widget .cm-editor .cm-scroller,
body.qyy-stable-editing .markdown-source-view.mod-cm6 .cm-table-widget .cm-editor .cm-content,
body.qyy-stable-editing .markdown-source-view.mod-cm6 .cm-table-widget .cm-editor .cm-line {
  line-height: var(--table-line-height, 1.3);
}
/* Only in the requested WYSIWYG mode; source mode remains available for literal syntax. */
body.qyy-stable-editing.ped-wys .markdown-source-view.mod-cm6.is-live-preview .cm-formatting-quote {
  display: none;
}
/* CodeMirror writes hanging indents inline; these two scoped overrides prevent
   the hidden marker from changing the first line or wrapping on activation. */
body.qyy-stable-editing.ped-wys .markdown-source-view.mod-cm6.is-live-preview .HyperMD-quote {
  text-indent: 0 !important;
  padding-inline-start: calc(var(--qyy-quote-depth, 1) * 1em) !important;
}
body.qyy-stable-editing .HyperMD-quote-2 { --qyy-quote-depth: 2; }
body.qyy-stable-editing .HyperMD-quote-3 { --qyy-quote-depth: 3; }
body.qyy-stable-editing .HyperMD-quote-4 { --qyy-quote-depth: 4; }
body.qyy-stable-editing .HyperMD-quote-5 { --qyy-quote-depth: 5; }
body.qyy-stable-editing .HyperMD-quote-6 { --qyy-quote-depth: 6; }
`;

class PasteAssistant {
  constructor(host) { this.host = host; this.documents = new Map(); this.wrapped = null; this.pending = new Map(); }
  active() { return !!this.host.settings.enabled && this.host.settings.pasteRepairEnabled !== false; }
  start() {
    const h = this.host;
    this.refresh();
    h.registerEvent(h.app.workspace.on('layout-change', () => this.refresh()));
    h.registerEvent(h.app.workspace.on('window-open', () => this.refresh()));
    h.registerEvent(h.app.workspace.on('editor-paste', (event, editor) => {
      if (!this.active() || event.defaultPrevented || event.clipboardData?.files?.length || codeContext(editor)) return;
      const plain = event.clipboardData?.getData('text/plain') || '', html = event.clipboardData?.getData('text/html') || '';
      const md = convertPaste(html, plain, h.qyyPasteHtmlConverter, h.app.workspace.containerEl.ownerDocument.defaultView.DOMParser);
      if (md != null && (md !== plain || html)) { event.preventDefault(); editor.replaceSelection(md); }
    }));
    // Detect enable/disable of Power Editor without changing its source or settings.
    this.timer = setInterval(() => this.refresh(), 2000);
  }
  refresh() {
    const h = this.host, docs = new Set([h.app.workspace.containerEl.ownerDocument]);
    h.app.workspace.iterateAllLeaves(l => {if (l.view?.containerEl) docs.add(l.view.containerEl.ownerDocument);});
    for (const [d, style] of this.documents) if (!docs.has(d)) {style.remove();d.body.classList.remove('qyy-stable-editing');this.documents.delete(d);}
    for (const d of docs) {
      if (!this.documents.has(d)) {const style = d.createElement('style');style.dataset.qyyPaste = '1114-2331';style.textContent = css;d.head.appendChild(style);this.documents.set(d, style);}
      d.body.classList.toggle('qyy-stable-editing', !!h.settings.enabled && h.settings.stableEditingEnabled !== false);
    }
    const p = h.app.plugins.plugins.powereditor;
    if (p === this.wrapped?.plugin) return;
    this.unpatch();
    if (!p || typeof p.pastedMarkdown !== 'function' || typeof p.plannedPaste !== 'function') return;
    const assistant = this, originalConvert = p.pastedMarkdown, originalPlan = p.plannedPaste;
    const convert = function(html, plain) {
      if (!assistant.active()) return originalConvert.call(this, html, plain);
      const result = convertPaste(html, plain, (a, b) => originalConvert.call(this, a, b), h.app.workspace.containerEl.ownerDocument.defaultView.DOMParser);
      if (result != null) {
        if (assistant.pending.size >= 8) assistant.pending.clear();
        assistant.pending.set(result, {plain: plain ?? '', time: Date.now()});
      }
      return result;
    };
    const plan = function(editor, md) {
      if (!assistant.active()) return originalPlan.call(this, editor, md);
      const saved = assistant.pending.get(md); assistant.pending.delete(md);
      if (codeContext(editor)) return saved && Date.now() - saved.time < 5000 ? saved.plain : md;
      return originalPlan.call(this, editor, normalizeMarkdown(md));
    };
    p.pastedMarkdown = convert; p.plannedPaste = plan;
    this.wrapped = {plugin:p, originalConvert, originalPlan, convert, plan};
  }
  unpatch() {
    const w = this.wrapped;
    if (w) {if (w.plugin.pastedMarkdown === w.convert) w.plugin.pastedMarkdown = w.originalConvert;if (w.plugin.plannedPaste === w.plan) w.plugin.plannedPaste = w.originalPlan;}
    this.wrapped = null; this.pending.clear();
  }
  stop() {
    clearInterval(this.timer); this.unpatch();
    for (const [doc, style] of this.documents) {style.remove();doc.body.classList.remove('qyy-stable-editing');}
    this.documents.clear();
  }
}

DEFAULTS.pasteRepairEnabled = true;
DEFAULTS.stableEditingEnabled = true;
const load = FolderNotesHelper.prototype.onload, unload = FolderNotesHelper.prototype.onunload;
const change = FolderNotesHelper.prototype.change, display = HelperSettings.prototype.display;
FolderNotesHelper.prototype.onload = async function() {
  await load.call(this);
  this.qyyPasteHtmlConverter = (html, plain) => html ? require('obsidian').htmlToMarkdown(html) : null;
  this.pasteAssistant = new PasteAssistant(this); this.pasteAssistant.start();
};
FolderNotesHelper.prototype.onunload = function() {this.pasteAssistant?.stop();return unload.call(this);};
FolderNotesHelper.prototype.change = async function(k, v) {await change.call(this, k, v);this.pasteAssistant?.refresh();};
HelperSettings.prototype.display = function() {
  display.call(this);
  new Setting(this.containerEl).setName('粘贴时修复公式与 Markdown').setDesc('仅处理这次粘贴：保留公式源码，统一数学分隔符，修复加粗空格，避免重复转义。代码不转换；不扫描已有笔记。').addToggle(t => t.setValue(this.plugin.settings.pasteRepairEnabled !== false).onChange(v => this.plugin.change('pasteRepairEnabled', v)));
  new Setting(this.containerEl).setName('稳定表格与引用的编辑显示').setDesc('表格编辑区沿用单元格行距；Power Editor 所见即所得模式下隐藏引用符号。源代码模式保留符号。').addToggle(t => t.setValue(this.plugin.settings.stableEditingEnabled !== false).onChange(v => this.plugin.change('stableEditingEnabled', v)));
};

})();
