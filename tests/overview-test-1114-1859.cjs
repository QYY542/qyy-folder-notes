const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {webcrypto} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'main.js'), 'utf8').replace(
  'return module.exports.default;})();', 'return {core: module.exports.default, FolderOverview};})();');
class Base {}
const stub = new Proxy({Platform: {isMobile: false, isDesktopApp: true}}, {get: (o, k) => o[k] || Base});
const mod = {exports: {}};
const {FolderOverview} = new Function('require', 'module', 'exports', 'crypto', source + '\nreturn {FolderOverview: QYYEmbeddedFolderCore.FolderOverview};')(
  name => {assert.equal(name, 'obsidian'); return stub;}, mod, mod.exports, webcrypto);
const plugin = {app: {vault: {getAllLoadedFiles() {throw Error('Root overview must not enumerate the vault');}}}};
const direct = [{path: 'A'}, {path: 'root.md'}];
assert.deepEqual(FolderOverview.prototype.getInitialFiles(plugin, {path: '/', children: direct}), direct);
console.log('PASS root overview reads direct children without full vault enumeration');
const sub = new Base(); sub.path = 'A'; sub.children = [{path: 'A/note.md'}];
assert.equal(FolderOverview.prototype.getInitialFiles(plugin, sub), sub.children);
console.log('PASS nested overview stays scoped to its selected folder');

const chrome = [process.env.CHROME_BIN, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => p && fs.existsSync(p));
assert(chrome, 'Chrome/Chromium is required for CSS and DOM checks; set CHROME_BIN');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qyy-overview-1114-1738-'));
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const code = fs.readFileSync(path.join(root, 'src/overview-presentation-1114-1738.js'), 'utf8');
const fixture = `<!doctype html><html><head><meta charset="utf-8"><title>pending</title>
<style>body{--text-faint:gray}.setting-item .setting-item-info{display:block}.folder-overview-list{margin:1em}.nav-folder-title-content{display:inline-block}</style>
<style id="plugin-css">${css}</style></head><body class="folder-notes-plugin">
<div class="workspace-leaf-content" data-type="file-explorer"><div class="nav-folder-title has-folder-note" id="cursor-row"><span class="nav-folder-title-content pointer-cursor" id="cursor-text">folder</span><span class="nav-folder-collapse-indicator" id="cursor-arrow">arrow</span></div></div>
<main id="root">
 <div class="markdown-preview-view">
  <div class="el-ul" id="hidden-list"><ul><li id="hidden-item">generated link <span id="item-marker" class="fv-link-list-item"></span></li></ul></div>
  <ul><li id="normal-item">normal note</li></ul>
 </div>
 <div class="markdown-source-view"><div class="cm-line" id="source-line"><span id="line-marker" class="fv-link-list-start"></span></div></div>
</main>
<aside><ul><li id="outside-item"><span class="fv-link-list-item"></span>unrelated view</li></ul></aside>
<div class="has-folder-note"><span id="folder-title" class="nav-folder-title-content">Folder</span></div>
<div class="fn-exclude-folder-list"><div class="setting-item-info" id="excluded-info">hidden settings label</div></div>
<div class="only-has-folder-note"><div class="nav-folder-children" id="folder-children">hidden parent page</div></div>
<div class="fn-has-no-files"><span class="collapse-icon" id="empty-arrow">arrow</span><span class="collapse-icon fn-folder-overview-collapse-icon" id="overview-arrow">overview arrow</span></div>
<script>${code}
(async () => {
 const passed=[];
 const check=(ok,name)=>{if(!ok)throw Error(name);passed.push(name);};
 const byId=id=>document.getElementById(id);
 const display=id=>getComputedStyle(byId(id)).display;
 const tick=()=>new Promise(resolve=>setTimeout(resolve,30));
 let leaves=[{view:{containerEl:byId('root')}}];
 const plugin={settings:{enabled:true,folderEnabled:true},registerEvent(){},app:{workspace:{getLeavesOfType(){return leaves;},on(){return {};}}}};
 const presentation=new QYYOverviewPresentation(plugin);presentation.start();
 await tick();
 check(display('hidden-item')==='none' && display('hidden-list')==='none','reading overview hides generated link ancestors');
 check(display('source-line')==='none','live-preview marker line is hidden');
 check(display('normal-item')!=='none' && display('outside-item')!=='none','ordinary notes and unrelated views stay visible');
 byId('line-marker').className='';await tick();
 check(display('source-line')!=='none','changing marker class restores the editor line');
 byId('item-marker').remove();await tick();
 check(display('hidden-list')!=='none' && display('hidden-item')!=='none','removing a marker restores all previously hidden ancestors');
 const span=document.createElement('span');span.className='fv-link-list-item';byId('hidden-item').append(span);await tick();
 check(display('hidden-list')==='none','newly rendered markers are handled by the view observer');
 check(getComputedStyle(byId('folder-title')).boxShadow==='none','folder underline stays off by default');
 document.body.classList.add('folder-note-underline');
 check(getComputedStyle(byId('folder-title')).boxShadow!=='none','folder underline option produces a visible inset line');
 document.body.classList.remove('folder-note-underline');
 check(getComputedStyle(byId('folder-title')).boxShadow==='none','turning off underline restores the original appearance');
 check(display('excluded-info')==='none','scoped settings rule wins without important');
 document.body.classList.add('hide-folder-note');
 check(display('folder-children')==='none','body hide-folder-note setting hides a parent-only directory');
 document.body.classList.remove('hide-folder-note');
 check(display('folder-children')!=='none','disabling parent-page hiding restores the directory children');
 check(display('empty-arrow')==='none' && display('overview-arrow')==='block','overview arrows remain visible while empty-folder arrows hide');
 plugin.settings.enabled=false;presentation.refresh();
 check(display('hidden-list')!=='none' && presentation.roots.size===0,'disabling helper removes marks and disconnects observers');
 plugin.settings.enabled=true;presentation.refresh();await tick();
 check(display('hidden-list')==='none','re-enabling helper reapplies overview hiding');
 leaves=[];presentation.refresh();
 check(display('hidden-list')!=='none' && presentation.roots.size===0,'closing a view cleans its styling and observer');
 leaves=[{view:{containerEl:byId('root')}}];presentation.refresh();presentation.dispose();
 span.className='';span.className='fv-link-list-item';await tick();
 check(display('hidden-list')!=='none' && presentation.roots.size===0,'unload leaves no observer or hidden ancestor classes');
 const rules=sheet=>Array.from(sheet.cssRules).flatMap(rule=>rule.cssRules?Array.from(rule.cssRules):[rule]);
 const parsed=rules(byId('plugin-css').sheet);
 check(parsed.every(rule=>!rule.selectorText?.includes(':has(') && (!rule.style || Array.from(rule.style).every(name=>rule.style.getPropertyPriority(name)!=='important'))),'parsed CSS has no relational selectors or forced priority');
 document.body.classList.add('qyy-folder-arrow-cursor');
 check(['cursor-row','cursor-text','cursor-arrow'].every(id=>getComputedStyle(byId(id)).cursor==='default'),'folder row title and arrow use the normal pointer');
 document.body.classList.add('is-phone');
 check(getComputedStyle(byId('cursor-text')).cursor==='default','phone layout preserves scoped folder cursor styling');
 document.body.classList.remove('qyy-folder-arrow-cursor');
 check(getComputedStyle(byId('cursor-text')).cursor==='pointer','disabling folder menu appearance restores original cursor');
 document.title='QYY_RESULT_'+btoa(JSON.stringify({passed}));
})().catch(error=>{document.title='QYY_RESULT_'+btoa(JSON.stringify({error:String(error)}));});
</script></body></html>`;
try {
  const file = path.join(tmp, 'overview-1114-1738.html'); fs.writeFileSync(file, fixture);
  const run = spawnSync(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--disable-background-networking', '--user-data-dir=' + path.join(tmp, 'profile'), '--dump-dom', '--virtual-time-budget=3000', 'file://' + file], {encoding: 'utf8', timeout: 45000, maxBuffer: 2 * 1024 * 1024});
  assert.equal(run.status, 0, run.error?.message || run.stderr.slice(-1000));
  const match = run.stdout.match(/<title>QYY_RESULT_([A-Za-z0-9+/=]+)<\/title>/);
  assert(match, 'Browser did not finish the DOM checks');
  const result = JSON.parse(Buffer.from(match[1], 'base64').toString());
  assert(!result.error, result.error);
  for (const name of result.passed) console.log('PASS', name);
  console.log('PASS ' + (result.passed.length + 2) + ' overview and browser checks');
} finally {
  fs.rmSync(tmp, {recursive: true, force: true});
}
