const QYY_TRASH = 'QYY废纸篓';
function qyyTrashRoot(value){
 const p=String(value||QYY_TRASH).trim();
 if(!p||p.startsWith('.')||p.startsWith('/')||p.includes('\\')||p.split('/').some(s=>!s||s==='.'||s==='..'||s.startsWith('.')))throw Error('废纸篓必须是库内普通文件夹路径');
 return p;
}
const QYY_DAY = 86400000;
class SyncedTrash {
  constructor(host) {
    this.host = host; this.app = host.app; this.adapter = this.app.vault.adapter;
    this.queue = Promise.resolve(); this.disposed = false; this.remoteDeletes = new Set();
    this.root=qyyTrashRoot(host.settings.trashRoot);
    this.entriesRoot = `${this.root}/回收项目`; this.receiptsRoot = `${this.root}/处理记录`;
  }
  active() { return !this.disposed && this.host.settings.enabled && this.host.settings.trashEnabled; }
  contains(path) { return path === this.root || path.startsWith(this.root + '/'); }
  safe(path) { return typeof path === 'string' && !!path && !path.startsWith('/') && !path.includes('\\') && !path.split('/').some(x => !x || x === '.' || x === '..'); }
  id() { return `${Date.now().toString(36)}-${Array.from(crypto.getRandomValues(new Uint8Array(8)), n => n.toString(16).padStart(2, '0')).join('')}`; }
  validId(id) { return typeof id === 'string' && /^[a-z0-9]+-[a-f0-9]{16}$/.test(id); }
  dir(id) { if (!this.validId(id)) throw Error('无效的回收记录'); return `${this.entriesRoot}/${id}`; }
  metaPath(id) { return `${this.dir(id)}/记录.json`; }
  receiptPath(id) { this.dir(id); return `${this.receiptsRoot}/${id}.json`; }
  payload(meta) { return `${this.dir(meta.id)}/内容/${meta.originalPath.split('/').pop()}`; }
  enqueue(fn) { const task = this.queue.then(fn); this.queue = task.catch(() => {}); return task; }
  async mkdir(path) {
    let part = '';
    for (const name of path.split('/')) {
      part = part ? part + '/' + name : name;
      if (!await this.adapter.exists(part)) {
        try { await this.app.vault.createFolder(part); }
        catch (e) { if (!await this.adapter.exists(part)) throw e; }
      }
    }
  }
  async write(path, data) {
    const text = JSON.stringify(data, null, 2);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file) await this.app.vault.modify(file, text);
    else if (await this.adapter.exists(path)) await this.adapter.write(path, text);
    else await this.app.vault.create(path, text);
  }
  async read(path) { try { return JSON.parse(await this.adapter.read(path)); } catch (_) { return null; } }
  async prepare() {
    const folderNotes = this.host.native();
    if (folderNotes?.settings) {
      const list = folderNotes.settings.excludeFolders || (folderNotes.settings.excludeFolders = []);
      if (!list.some(x => x.id === 'qyy-synced-trash')) {
        list.push({ id: 'qyy-synced-trash', type: 'folder', path: this.root, subFolders: true,
          disableSync: true, disableAutoCreate: true, disableFolderNote: true, showFolderNote: true,
          excludeFromFolderOverview: true, hideInSettings: false, enableCollapsing: false, position: list.length });
        await folderNotes.saveSettings(true);
      }
    }
    await this.mkdir(this.entriesRoot); await this.mkdir(this.receiptsRoot);
  }
  start() {
    this.ready = this.active() ? this.prepare() : Promise.resolve();
    this.ready.catch(e => { console.error('QYY废纸篓初始化', e); new Notice('同步废纸篓尚未就绪，请检查设置。'); });
    this.refresh();
    this.interval = setInterval(() => { this.attachSync(); }, 5000);
    this.host.registerDomEvent(document, 'visibilitychange', () => { if (document.visibilityState === 'visible') this.attachSync(); });
  }
  refresh() {
    if (this.active()) {
      if (!this.restoreHooks) this.installHooks();
      this.attachSync();
    } else {
      this.restoreHooks?.(); this.restoreHooks = null; this.detachSync();
      clearTimeout(this.syncTimer);
    }
  }
  installHooks() {
    const owner = this;
    const fm = this.app.fileManager, vault = this.app.vault;
    const oldFM = fm.trashFile, oldTrash = vault.trash;
    const intercept = function (file, fallback, context, args) {
      if (!owner.active() || !file?.path || file.path.startsWith('.') || owner.remoteDeletes.has(file.path)) return fallback.apply(context, args);
      return owner.enqueue(() => owner.capture(file));
    };
    const fmHook = function (...args) { return intercept(args[0], oldFM, this, args); };
    const vaultHook = function (...args) { return intercept(args[0], oldTrash, this, args); };
    fm.trashFile = fmHook; vault.trash = vaultHook;
    this.restoreHooks = () => { if (fm.trashFile === fmHook) fm.trashFile = oldFM; if (vault.trash === vaultHook) vault.trash = oldTrash; };
  }
  async hash(path) {
    const bytes = await this.adapter.readBinary(path);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return { size: bytes.byteLength, sha256: Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('') };
  }
  async inventory(path) {
    const files = [], folders = [];
    const walk = async (p, rel) => {
      const stat = await this.adapter.stat(p); if (!stat) throw Error('文件未同步完整');
      if (stat.type === 'file') files.push({ path: rel, ...await this.hash(p) });
      else {
        folders.push(rel); const list = await this.adapter.list(p);
        for (const f of list.files) await walk(f, rel ? rel + '/' + f.split('/').pop() : f.split('/').pop());
        for (const f of list.folders) await walk(f, rel ? rel + '/' + f.split('/').pop() : f.split('/').pop());
      }
    };
    await walk(path, '');
    return { files: files.sort((a,b) => a.path.localeCompare(b.path)), folders: folders.sort() };
  }
  validMeta(m, id) {
    return m?.schema === 'qyy-trash-v1' && m.id === id && this.validId(id) && this.safe(m.originalPath) &&
      !m.originalPath.startsWith('.') && !this.contains(m.originalPath) && !this.root.startsWith(m.originalPath + '/') &&
      Number.isFinite(m.deletedAt) && m.deletedAt > 0 && ['file','folder'].includes(m.kind) &&
      ['preparing','ready','restoring'].includes(m.status) && Array.isArray(m.files) && Array.isArray(m.folders) &&
      m.files.every(f => (f.path === '' || this.safe(f.path)) && Number.isInteger(f.size) && f.size >= 0 && /^[a-f0-9]{64}$/.test(f.sha256)) &&
      m.folders.every(p => p === '' || this.safe(p)) && (m.status === 'preparing' || (m.kind === 'file' ? m.files.length === 1 && m.files[0].path === '' && m.folders.length === 0 : m.folders.includes('')));
  }
  async complete(meta, path = this.payload(meta)) {
    if (meta.status === 'preparing') return false;
    // File-based sync does not transfer empty directories; reconstruct only recorded trash directories.
    if (meta.kind === 'folder' && path === this.payload(meta)) {
      for (const folder of meta.folders) await this.mkdir(path + (folder ? '/' + folder : ''));
    }
    if (!await this.adapter.exists(path)) return false;
    try {
      if (path === this.payload(meta)) {
        const entry = await this.adapter.list(this.dir(meta.id));
        const contents = await this.adapter.list(`${this.dir(meta.id)}/内容`);
        if (entry.files.some(p => p !== this.metaPath(meta.id)) || entry.folders.some(p => p !== `${this.dir(meta.id)}/内容`) || [...contents.files,...contents.folders].some(p => p !== path)) return false;
      }
      return JSON.stringify(await this.inventory(path)) === JSON.stringify({ files: meta.files, folders: meta.folders }); }
    catch (_) { return false; }
  }
  async receipt(id) {
    const r = await this.read(this.receiptPath(id));
    return r?.schema === 'qyy-trash-receipt-v1' && r.id === id && ['purged','restored'].includes(r.action) && Number.isFinite(r.at) && r.at > 0 ? r : null;
  }
  async list() {
    if (!await this.adapter.exists(this.entriesRoot)) return [];
    const list = await this.adapter.list(this.entriesRoot), entries = [];
    for (const path of list.folders) {
      const id = path.split('/').pop(); if (!this.validId(id)) continue;
      const meta = await this.read(this.metaPath(id));
      if (this.validMeta(meta, id)) entries.push(meta);
    }
    return entries.sort((a,b) => b.deletedAt - a.deletedAt);
  }
  async capture(file) {
    await this.ready; await this.prepare();
    const originalPath = file.path;
    if (this.contains(originalPath) || this.root.startsWith(originalPath + '/') || !this.safe(originalPath)) {
      new Notice('请在 QYY 同步废纸篓中恢复或清理到期项目，不要直接删除废纸篓及其上级目录。');
      throw Error('Protected trash directory');
    }
    if (!await this.adapter.exists(originalPath)) return;
    await this.host.sync.saveOpenNotes();
    const id = this.id(), deletedAt = Date.now();
    const stat = await this.adapter.stat(originalPath);
    const meta = { schema: 'qyy-trash-v1', id, originalPath, deletedAt, kind: stat.type, status: 'preparing', files: [], folders: [] };
    const payload = this.payload(meta);
    const filter = this.host.sync.native()?.engine?.filter;
    if (filter && (filter.shouldIgnore(payload) || filter.shouldIgnore(this.metaPath(id)))) throw Error('废纸篓被同步过滤规则排除，请先调整同步设置');
    await this.mkdir(`${this.dir(id)}/内容`); await this.write(this.metaPath(id), meta);
    try {
      await this.app.vault.rename(file, payload);
      Object.assign(meta, await this.inventory(payload), { status: 'ready' });
      if (filter && meta.files.some(f => filter.shouldIgnore(payload + (f.path ? '/' + f.path : '')))) throw Error('内容包含被同步排除的文件，已保留原文件；请先调整同步过滤规则');
      await this.write(this.metaPath(id), meta);
    } catch (e) {
      // The payload stays recoverable even if writing its final record fails.
      const moved = this.app.vault.getAbstractFileByPath(payload);
      if (moved && !await this.adapter.exists(originalPath)) {
        try { await this.app.vault.rename(moved, originalPath); await this.remove(this.dir(id)); } catch (_) {}
      }
      throw e;
    }
    const leaves = [];
    this.app.workspace?.iterateAllLeaves?.(leaf => {
      const path = leaf.view?.file?.path;
      if (path && (path === payload || path.startsWith(payload + '/'))) leaves.push(leaf);
    });
    for (const leaf of leaves) leaf.detach?.();
    this.scheduleSync(); new Notice('已移入同步废纸篓，保留 30 天。');
  }
  async remove(path) {
    if (!this.contains(path) || path === this.root || path === this.entriesRoot || path === this.receiptsRoot) throw Error('删除范围无效');
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file) await this.app.vault.delete(file, true);
    else if (await this.adapter.exists(path)) {
      const stat = await this.adapter.stat(path);
      if (stat.type === 'folder') await this.adapter.rmdir(path, true); else await this.adapter.remove(path);
    }
  }
  async availablePath(original, id) {
    if (!await this.adapter.exists(original)) return original;
    const slash = original.lastIndexOf('/'), name = original.slice(slash+1), dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0,dot) : name, ext = dot > 0 ? name.slice(dot) : '';
    for (let n=1;n<10000;n++) {
      const path = original.slice(0,slash+1) + `${stem}（恢复-${id.slice(-6)}-${n}）${ext}`;
      if (!await this.adapter.exists(path)) return path;
    }
    throw Error('恢复目标名称冲突过多');
  }
  async finishRestore(meta, target) {
    const files = meta.files.map(f => ({ ...f, path: f.path ? `${target}/${f.path}` : target }));
    await this.write(this.receiptPath(meta.id), { schema: 'qyy-trash-receipt-v1', id: meta.id, action: 'restored', at: Date.now(), files });
    await this.remove(this.dir(meta.id)); this.scheduleSync();
  }
  restore(id) { return this.enqueue(async () => {
    await this.ready;
    if (this.host.sync.native()?.engine?.isSyncing()) throw Error('正在同步，请等同步完成后再恢复');
    const meta = await this.read(this.metaPath(id));
    if (!this.validMeta(meta,id) || await this.receipt(id)) throw Error('该回收项目已处理或记录无效');
    if (meta.status === 'restoring' && this.safe(meta.restoreTarget) && !this.contains(meta.restoreTarget) && await this.complete(meta, meta.restoreTarget) && !await this.adapter.exists(this.payload(meta))) {
      await this.finishRestore(meta, meta.restoreTarget); return meta.restoreTarget;
    }
    if (!await this.complete(meta)) throw Error('内容尚未同步完整或已发生变化，暂不恢复；请先同步');
    const target = await this.availablePath(meta.originalPath,id), parent = target.slice(0,target.lastIndexOf('/'));
    if (target.includes('/')) await this.mkdir(parent);
    meta.status = 'restoring'; meta.restoreTarget = target; await this.write(this.metaPath(id),meta);
    const file = this.app.vault.getAbstractFileByPath(this.payload(meta));
    if (!file) throw Error('文件索引尚未就绪，请稍后重试');
    await this.app.vault.rename(file,target); await this.finishRestore(meta,target);
    new Notice(`已恢复：${target}`); return target;
  }); }
  async cleanup() {
    if (!this.active() || !this.host.settings.trashAutoClean) return 0;
    let count=0;
    // A receipt is authoritative for this immutable entry ID, including late partial copies.
    if (await this.adapter.exists(this.receiptsRoot)) {
      const records = await this.adapter.list(this.receiptsRoot);
      for (const file of records.files) {
        const id = file.split('/').pop().replace(/\.json$/, '');
        if (this.validId(id) && await this.receipt(id) && await this.adapter.exists(this.dir(id))) { await this.remove(this.dir(id)); count++; }
      }
    }
    for (const meta of await this.list()) {
      if (!this.active()) break;
      if (await this.receipt(meta.id)) {
        // A stale/offline copy may reappear. Only remove content matching its record.
        if (await this.complete(meta)) { await this.remove(this.dir(meta.id)); count++; }
        continue;
      }
      if (meta.status !== 'ready' || Date.now() - meta.deletedAt < 30 * QYY_DAY) continue;
      if (!await this.complete(meta)) continue;
      await this.write(this.receiptPath(meta.id), { schema: 'qyy-trash-receipt-v1', id: meta.id, action: 'purged', at: Date.now() });
      await this.remove(this.dir(meta.id)); count++;
    }
    if (count) this.scheduleSync();
    return count;
  }
  async uploadRecorded(engine, path) {
    const item = engine.manifest.get(path); if (!item) return false;
    const stat = await this.adapter.stat(path);
    return !stat || (item.mtime === stat.mtime && item.size === stat.size);
  }
  attachSync() {
    if (!this.active()) return;
    const engine = this.host.sync.native()?.engine;
    if (!engine || typeof engine.executePlanItem !== 'function' || typeof engine.startSync !== 'function' || !engine.manifest?.get) return;
    if (this.engine === engine) return;
    this.detachSync(); this.engine = engine;
    const owner=this, execute=engine.executePlanItem, start=engine.startSync;
    const wrappedExecute=async function(item) {
      if (!owner.active()) return execute.call(this,item);
      const path=item.path;
      const prefix=owner.entriesRoot+'/';
      if (path.startsWith(prefix)) {
        const id=path.slice(prefix.length).split('/')[0];
        if (owner.validId(id) && await owner.receipt(id)) {
          if (item.action === 'UPLOAD') {
            if (await owner.adapter.exists(path)) await owner.remove(path);
            this.manifest.delete(path); return;
          }
          if (item.action === 'DOWNLOAD') {
            if (!await owner.uploadRecorded(this,owner.receiptPath(id))) throw Error('等待废纸篓处理记录先完成同步');
            return execute.call(this,{...item,action:'DELETE_REMOTE'});
          }
          if (item.action==='DELETE_REMOTE' && !await owner.uploadRecorded(this,owner.receiptPath(id))) throw Error('等待废纸篓处理记录先完成同步');
        }
      }
      if (item.action==='UPLOAD' && path.startsWith(owner.receiptsRoot+'/')) {
        const id=path.slice(owner.receiptsRoot.length+1).replace(/\.json$/,'');
        if (owner.validId(id)) {
          const receipt=await owner.receipt(id);
          if (receipt?.action==='restored') {
            if (!Array.isArray(receipt.files) || !receipt.files.every(f=>owner.safe(f.path)&&!owner.contains(f.path))) throw Error('恢复记录无效');
            for (const f of receipt.files) if (!await owner.uploadRecorded(this,f.path)) throw Error('等待恢复后的文件先完成同步');
          }
        }
      }
      if (item.action==='DELETE_REMOTE' && !owner.contains(path)) {
        for (const meta of await owner.list()) {
          if (await owner.receipt(meta.id)) continue;
          if (path!==meta.originalPath && !path.startsWith(meta.originalPath+'/')) continue;
          if (meta.status!=='ready' || !await owner.uploadRecorded(this,owner.metaPath(meta.id))) throw Error('等待废纸篓备份先完成同步');
          for (const f of meta.files) {
            const payload=owner.payload(meta)+(f.path?'/'+f.path:'');
            if (!await owner.uploadRecorded(this,payload)) throw Error('等待废纸篓内容先完成同步');
          }
        }
      }
      if (item.action==='DELETE_LOCAL') {
        if (owner.contains(path)) {
          if (await owner.adapter.exists(path)) await owner.remove(path);
          this.manifest.delete(path); return;
        }
        owner.remoteDeletes.add(path);
        try { return await execute.call(this,item); } finally { owner.remoteDeletes.delete(path); }
      }
      return execute.call(this,item);
    };
    const wrappedStart=function(...args) {
      if(args[1]?.reason==='exit'&&this.qyyInit){const q=this.qyyInit();q.deadline=Math.min(q.deadline||Infinity,Date.now()+12000);}
      if (owner.sharedSync) {if(args[1]?.full)return owner.sharedSync.then(()=>this.startSync(...args));return owner.sharedSync;}
      const engine=this;
      const task=Promise.resolve(owner.ready).then(()=>start.apply(engine,args)).then(async result=>{
        if (owner.active() && result?.success && result.fullReconciliation && !(result.stats?.errors>0)) await owner.enqueue(()=>owner.cleanup());
        return result;
      });
      owner.sharedSync=task;
      task.then(()=>{if(owner.sharedSync===task)owner.sharedSync=null;},()=>{if(owner.sharedSync===task)owner.sharedSync=null;});
      return task;
    };
    engine.executePlanItem=wrappedExecute;engine.startSync=wrappedStart;
    this.restoreSync=()=>{if(engine.executePlanItem===wrappedExecute)engine.executePlanItem=execute;if(engine.startSync===wrappedStart)engine.startSync=start;};
  }
  detachSync(){this.restoreSync?.();this.restoreSync=null;this.engine=null;}
  scheduleSync(){
    clearTimeout(this.syncTimer);
    this.syncTimer=setTimeout(()=>{
      const engine=this.host.sync.native()?.engine;
      if(this.active()&&engine&&!engine.isSyncing())void engine.startSync(true,{reason:'dirty'}).catch(e=>console.error('QYY废纸篓同步',e));
    },3000);
  }
  show(){new TrashModal(this.app,this).open();}
  dispose(){this.disposed=true;clearInterval(this.interval);clearTimeout(this.syncTimer);this.restoreHooks?.();this.detachSync();}
}
class TrashModal extends Modal {
  constructor(app,trash){super(app);this.trash=trash;}
  async onOpen(){
    const el=this.contentEl;el.empty();el.createEl('h2',{text:'同步废纸篓'});
    el.createEl('p',{text:'保留 30 天。成功同步后检查到期项目；内容未到齐或被修改的项目不会自动清理。'});
    const controls=new Setting(el).setName('查看最新内容');
    controls.addButton(b=>b.setButtonText('刷新').onClick(()=>this.onOpen()));
    const entries=await this.trash.list();let shown=0;
    for(const meta of entries){
      if(await this.trash.receipt(meta.id))continue;shown++;
      const remaining=Math.max(0,Math.ceil((meta.deletedAt+30*QYY_DAY-Date.now())/QYY_DAY));
      const complete=await this.trash.complete(meta);
      new Setting(el).setName(meta.originalPath.split('/').pop())
        .setDesc(`${meta.originalPath} · 删除于 ${new Date(meta.deletedAt).toLocaleString()} · ${remaining?`剩余 ${remaining} 天`:'已到期'}${complete?'':' · 内容待同步或需检查'}`)
        .addButton(b=>b.setButtonText('恢复').setDisabled(!complete&&meta.status!=='restoring').onClick(async()=>{
          b.setDisabled(true);try{await this.trash.restore(meta.id);await this.onOpen();}catch(e){new Notice(e.message);b.setDisabled(false);}
        }));
    }
    if(!shown)el.createEl('p',{text:'废纸篓是空的。'});
  }
  onClose(){this.contentEl.empty();}
}

module.exports = FolderNotesHelper;




