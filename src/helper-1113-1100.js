const { Plugin, PluginSettingTab, Setting, Notice, TextFileView, Platform, Modal } = require('obsidian');

const DEFAULTS = {
  enabled: true, clickMode: 'single', underline: false,
  autoCreate: true, openAfterCreate: true, autoAttachments: false, folderEnabled: true,
  syncEnabled: true, foregroundSyncEnabled: true, maxWaitSeconds: 15, trashEnabled: false, trashAutoClean: false, trashRoot: 'QYY废纸篓', conflictFolders: true
};
const KEYS = ['enableCollapsing', 'underlineFolder', 'underlineFolderInPath',
  'autoCreate', 'autoCreateFocusFiles', 'autoCreateForAttachmentFolder'];

class FolderNotesHelper extends Plugin {
  async onload() {
    this.state = Object.assign({ baseline: null, applied: null }, await this.loadData());
    this.settings = Object.assign({}, DEFAULTS, this.state.preferences);
    this.settings.trashRoot=qyyTrashRoot(this.settings.trashRoot);
    if (![5, 10, 15].includes(this.settings.maxWaitSeconds)) this.settings.maxWaitSeconds = 15;
    await this.startEmbeddedCore();
    if(!this.settings.enabled||!this.settings.folderEnabled)this.core.unload();
    this.sync = new SyncAssistant(this);
    this.conflicts = new ConflictFolders(this);
    this.trash = new SyncedTrash(this);
    this.queue = Promise.resolve();
    this.disposed = false;
    this.windows = new Set();
    this.revision = 0;
    this.addSettingTab(new HelperSettings(this.app, this));
    this.addCommand({ id: 'toggle-helper', name: '开启或关闭文件夹笔记助手_QYY',
      callback: () => this.change('enabled', !this.settings.enabled) });
    this.addCommand({ id: 'sync-now', name: '保存并同步百度网盘', callback: () => this.sync.foreground(true) });
    this.addCommand({ id: 'pending-conflicts', name: '处理待确认的同步冲突', callback: () => this.conflicts.show() });
    this.addCommand({ id: 'open-folder-settings', name: '打开文件夹笔记完整设置', callback: () => this.showCoreSettings() });
    this.addCommand({ id: 'open-synced-trash', name: '打开同步废纸篓', callback: () => this.trash.show() });
    this.addRibbonIcon('trash-2', '同步废纸篓', () => this.trash.show());
    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      if (this.trash.active() && file?.path && !this.trash.contains(file.path)) menu.addItem(item => item.setTitle('移入同步废纸篓').setIcon('trash-2').onClick(async () => {
        try { await this.trash.enqueue(() => this.trash.capture(file)); } catch (e) { new Notice(e.message); }
      }));
    }));
    this.app.workspace.onLayoutReady(() => {
      if (this.disposed) return;
      this.sync.start();
      this.trash.start();
      this.conflicts.start();
      this.attachWindow(window);
      this.app.workspace.iterateAllLeaves(leaf => this.attachWindow(leaf.view.containerEl.ownerDocument.defaultView));
      this.scheduleApply().then(()=>{this.corePrefsReady=true;});
    });
    if (Platform.isDesktopApp) {
    this.registerEvent(this.app.workspace.on('window-open', (_workspaceWindow, win) => this.attachWindow(win)));
    this.registerEvent(this.app.workspace.on('window-close', (_workspaceWindow, win) => this.windows.delete(win)));
    }
  }
  native() {
    return this.core;
  }
  async persist() {
    const next = { preferences: this.settings, baseline: this.state.baseline, applied: this.state.applied };
    if (JSON.stringify(await this.loadData()) !== JSON.stringify(next)) await this.saveData(next);
  }
  desired() {
    return {
      enableCollapsing: this.settings.clickMode === 'single',
      underlineFolder: this.settings.underline,
      underlineFolderInPath: this.settings.underline,
      autoCreate: this.settings.autoCreate,
      autoCreateFocusFiles: this.settings.openAfterCreate,
      autoCreateForAttachmentFolder: this.settings.autoAttachments
    };
  }
  syncAppearance(settings) {
    for (const win of this.windows) {
      if (win.closed) { this.windows.delete(win); continue; }
      win.document.body?.classList.toggle('folder-note-underline', !!settings.underlineFolder);
      win.document.body?.classList.toggle('folder-note-underline-path', !!settings.underlineFolderInPath);
    }
  }
  async apply() {
    const native = this.native();
    if (!native?.settings || native._loaded===false || typeof native.saveSettings !== 'function') return;
    if (this.disposed || !this.settings.enabled || !this.settings.folderEnabled) {
      if (!this.state.baseline) return;
      // Keep changes made directly in Folder notes after our last application.
      for (const key of KEYS) {
        if (native.settings[key] === this.state.applied?.[key]) native.settings[key] = this.state.baseline[key];
      }
      this.syncAppearance(native.settings);
      await native.saveSettings(true);
      this.state.baseline = null;
      this.state.applied = null;
      await this.persist();
      return;
    }
    if (!this.state.baseline) {
      this.state.baseline = Object.fromEntries(KEYS.map(key => [key, native.settings[key]]));
      await this.persist();
    }
    const desired = this.desired();
    const changed = KEYS.some(key => native.settings[key] !== desired[key]);
    Object.assign(native.settings, desired);
    this.state.applied = desired;
    this.syncAppearance(native.settings);
    if (changed) await native.saveSettings(true);
    await this.persist();
  }
  scheduleApply() {
    this.queue = this.queue.then(() => this.apply()).catch(error => {
      console.error('文件夹笔记助手', error);
      if (!this.disposed) new Notice('文件夹笔记助手设置未能应用，请检查内置文件夹组件。');
    });
    return this.queue;
  }
  async change(key, value) {
    this.settings[key] = value;
    this.revision++;
    await this.persist();
    if(this.settings.enabled&&this.settings.folderEnabled){if(!this.core?._loaded)await this.startEmbeddedCore();}else this.core?.unload();
    await this.scheduleApply();
    this.sync.refresh();
    if(key==='trashEnabled'&&value)this.trash.ready=this.trash.prepare();
    this.trash.refresh();
  }
  attachWindow(win) {
    if (!win || this.windows.has(win)) return;
    this.windows.add(win);
    if (this.native()?.settings) this.syncAppearance(this.native().settings);
    let pending = null, handledPair = null, revision = this.revision;
    const active = () => {
      if (revision !== this.revision) { pending = null; handledPair = null; revision = this.revision; }
      return !this.disposed && this.settings.enabled && this.settings.folderEnabled && this.settings.clickMode === 'double' && !!this.native();
    };
    const getTitle = event => {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return null;
      if (target.closest('.collapse-icon, input, textarea, [contenteditable=true]')) return null;
      const title = target.closest('.nav-folder-title.has-folder-note');
      return title?.closest('.workspace-leaf-content[data-type="file-explorer"]') ? title : null;
    };
    const modified = event => event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;
    const toggle = (event, title) => {
      const arrow = title.querySelector('.collapse-icon');
      if (!arrow) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      arrow.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win, detail: 0 }));
    };
    this.registerDomEvent(win, 'click', event => {
      if (!active() || event.detail === 0) return;
      if (modified(event)) { pending = null; handledPair = null; return; }
      const title = getTitle(event), path = title?.getAttribute('data-path');
      if (!path) { pending = null; handledPair = null; return; }
      handledPair = null;
      const elapsed = pending ? event.timeStamp - pending.time : Infinity;
      const samePlace = pending && Math.hypot(event.clientX - pending.x, event.clientY - pending.y) <= (Platform.isMobile ? 24 : 8);
      const nativePair = event.detail > 1 && event.detail % 2 === 0;
      // Only identify the pair; do not defer single clicks or schedule a timer.
      const pair = pending && pending.path === path && samePlace && elapsed >= 0 && (nativePair || elapsed <= 500);
      if (!pair) { pending = { path, time: event.timeStamp, x: event.clientX, y: event.clientY }; return; }
      pending = null;
      handledPair = { path, time: event.timeStamp };
      toggle(event, title);
    }, true);
    this.registerDomEvent(win, 'dblclick', event => {
      if (!active() || modified(event)) return;
      const title = getTitle(event);
      if (!title) return;
      const alreadyHandled = handledPair && handledPair.path === title.getAttribute('data-path') &&
        event.timeStamp >= handledPair.time && event.timeStamp - handledPair.time <= 100;
      pending = null; handledPair = null;
      if (alreadyHandled) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      toggle(event, title);
    }, true);
    this.registerDomEvent(win, 'blur', () => { pending = null; handledPair = null; });
  }
  onunload() {
    this.disposed = true;
    this.sync?.dispose();
    this.trash?.dispose();
    this.conflicts?.dispose();
    this.revision++;
    // Embedded component unloads with its owner; keep saved preferences intact.
  }
}

class HelperSettings extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const el = this.containerEl, p = this.plugin; el.empty();
    el.createEl('h2', { text: '文件夹笔记助手_QYY' });
    const toggle = (name, desc, key, disabled = false) => new Setting(el).setName(name).setDesc(desc)
      .addToggle(t => t.setValue(p.settings[key]).setDisabled(disabled).onChange(async value => { await p.change(key, value); this.display(); }));
    toggle('启用助手', '统一开启或关闭文件夹操作与同步辅助；不会删除笔记。', 'enabled');
    el.createEl('h3', { text: '文件夹操作' });
    toggle('启用文件夹操作', '文件夹笔记功能已内置，不再需要另一个插件。', 'folderEnabled', !p.settings.enabled);
    if (!p.native()) el.createEl('p', { text: '文件夹组件尚未加载，请重新开启插件。' });
    const folderDisabled = !p.settings.enabled || !p.settings.folderEnabled || !p.native();
    new Setting(el).setName('展开目录的方式').setDesc('点击名称打开父页，箭头始终可展开或收起。双击或双点不延迟第一次点击。')
      .addDropdown(d => d.addOptions(Platform.isMobile ? { single: '点按展开或收起', double: '连续双点展开或收起', arrow: '只用箭头展开' } : { single: '单击展开或收起', double: '双击展开或收起', arrow: '只用箭头展开' })
        .setValue(p.settings.clickMode).setDisabled(folderDisabled).onChange(v => p.change('clickMode', v)));
    toggle('显示文件夹下划线', '同时控制文件列表和笔记路径中的下划线。', 'underline', folderDisabled);
    toggle('新建文件夹时创建父页', '使用同名文件夹笔记，并保留空白模板设置。', 'autoCreate', folderDisabled);
    toggle('创建后自动打开父页', '关闭后仍创建父页，但保持当前页面。', 'openAfterCreate', folderDisabled || !p.settings.autoCreate);
    toggle('附件文件夹也创建父页', '默认关闭，避免在图片等附件目录生成笔记。', 'autoAttachments', folderDisabled || !p.settings.autoCreate);
    new Setting(el).setName('文件夹笔记完整设置').setDesc('命名、存放位置、文件列表、路径、概览与排除规则；均已集成到此插件。').addButton(b=>b.setButtonText(this.showAdvanced?'收起完整设置':'展开完整设置').onClick(()=>{this.showAdvanced=!this.showAdvanced;this.display();}));
    if(this.showAdvanced&&p.coreSettingsTab){p.coreSettingsTab.containerEl=el.createDiv({cls:'qyy-embedded-folder-settings'});p.coreSettingsTab.display();}
    el.createEl('h3', { text: '同步冲突' });
    toggle('冲突笔记整理为文件夹', '较新的版本作为同名文件夹的主笔记，较旧的版本保留为子笔记。时间不可靠时由你选择。', 'conflictFolders', !p.settings.enabled);
    new Setting(el).setName('待确认冲突').setDesc('不会仅凭百度网盘上传时间判断新旧，也不会覆盖尚未备份的版本。').addButton(b=>b.setButtonText('处理待确认冲突').onClick(()=>p.conflicts.show()));
    el.createEl('h3', { text: '同步废纸篓' });
    let trashPath=p.settings.trashRoot;
    new Setting(el).setName('废纸篓路径').setDesc('仅在首次启用前设置；各设备须使用同一路径。已有回收记录时禁止直接改名。')
      .addText(t=>t.setValue(p.settings.trashRoot).onChange(v=>trashPath=v))
      .addButton(b=>b.setButtonText('保存路径').onClick(async()=>{try{await p.setTrashRoot(trashPath);this.display();}catch(e){new Notice(e.message);}}));
    toggle('启用同步废纸篓', '删除笔记、附件和文件夹时移入库内废纸篓，随百度网盘同步。', 'trashEnabled', !p.settings.enabled);
    toggle('30 天后自动清理', '从删除时间计算。成功同步后清理完整的到期项目；关闭应用时不执行后台任务。', 'trashAutoClean', !p.settings.enabled || !p.settings.trashEnabled);
    new Setting(el).setName('查看与恢复').setDesc(p.trash.root+'。恢复保留原位置，同名文件不覆盖。')
      .addButton(b => b.setButtonText('打开废纸篓').onClick(() => p.trash.show()));
    el.createEl('h3', { text: '同步辅助' });
    toggle('启用同步辅助', '需要在每台设备上启用并授权百度网盘同步。', 'syncEnabled', !p.settings.enabled);
    const syncDisabled = !p.settings.enabled || !p.settings.syncEnabled;
    toggle('手机启动与回前台时同步', '手机打开或回到前台时补同步；不依赖系统关闭通知。', 'foregroundSyncEnabled', syncDisabled);
    new Setting(el).setName('同步最长等待').setDesc('保存并同步最多等待该时长；超时保留待同步记录，底层请求可能仍在继续。')
      .addDropdown(d => d.addOptions({ 5: '5 秒', 10: '10 秒', 15: '15 秒（推荐）' })
        .setValue(String(p.settings.maxWaitSeconds)).setDisabled(syncDisabled).onChange(v => p.change('maxWaitSeconds', Number(v))));
    const syncPlugin=p.sync.native();
    new Setting(el).setName('并行传输').setDesc('增量处理有改动的文件；电脑最多两个传输，手机默认一个。关闭只降低并发。')
      .addToggle(t=>t.setValue(syncPlugin?.settings.qyyParallel!==false).setDisabled(!syncPlugin?.engine?.qyyInit).onChange(async value=>{syncPlugin.settings.qyyParallel=value;await syncPlugin.saveSettings();}));
    new Setting(el).setName('百度云同步_QYY').setDesc('同步功能需另行安装 qyy-baidu-sync；通过社区插件管理器更新，本助手不会安装或更新其他插件。');
    new Setting(el).setName('立即同步').setDesc('先保存本地笔记，再尝试同步。')
      .addButton(b => b.setButtonText('保存并同步').setDisabled(syncDisabled).onClick(() => p.sync.foreground(true)));
    el.createEl('p', { text: '公开版不拦截系统退出。关闭应用或切换设备前，请先保存并同步，确认同步完成。' });
  }
}

