class SyncAssistant {
  constructor(host) {
    this.host = host; this.app = host.app; this.disposed = false;
    this.attempts = new Map(); this.foregroundTask = null; this.lastForegroundAt = 0;
    this.storageKey = `${host.manifest.id}:sync-attempt`;
    this.lastAttempt = this.app.loadLocalStorage(this.storageKey);
  }
  get settings() { return this.host.settings; }
  active() { return !this.disposed && this.settings.enabled && this.settings.syncEnabled; }
  native() { return this.app.plugins?.plugins?.['qyy-baidu-sync']; }
  record(status, extra = {}) {
    this.lastAttempt = { time: Date.now(), status, success: status === 'complete', ...extra };
    this.app.saveLocalStorage(this.storageKey, this.lastAttempt);
  }
  start() {
    this.refresh();
    if (this.active() && this.lastAttempt && !this.lastAttempt.success) {
      console.warn('QYY Folder Notes：上次同步未确认完成；记录已保留，可手动同步重试。');
    }
    if (Platform.isMobile) {
      this.host.registerDomEvent(document, 'visibilitychange', () => {
        if (document.visibilityState === 'visible') void this.foreground(false);
        else this.cancelForeground('background');
      });
      this.host.registerDomEvent(window, 'focus', () => { void this.foreground(false); });
      this.startupTimer = setTimeout(() => { void this.foreground(false); }, 4500);
    }
  }
  refresh() {
    if (!this.active()) this.cancelForeground('disabled');
    if (!this.settings.foregroundSyncEnabled) this.cancelForeground('disabled');
  }
  async saveOpenNotes() {
    const saves = [];
    this.app.workspace.iterateAllLeaves(leaf => {
      if (leaf.view instanceof TextFileView && leaf.view.file) saves.push(leaf.view.save());
    });
    await Promise.all(saves);
  }
  foreground(manual = false) {
    if (!this.active()) { if (manual) new Notice('请先开启助手和同步辅助。'); return Promise.resolve(); }
    if (!manual && (!this.settings.foregroundSyncEnabled || document.visibilityState === 'hidden')) return Promise.resolve();
    if (this.foregroundTask) return this.foregroundTask;
    // Coalesce lifecycle events only; folder taps are never delayed.
    if (!manual && Date.now() - this.lastForegroundAt < 10000) return Promise.resolve();
    this.lastForegroundAt = Date.now();
    this.foregroundTask = this.runForeground(manual).finally(() => { this.foregroundTask = null; });
    return this.foregroundTask;
  }
  async runForeground(manual) {
    const plugin = this.native();
    if (!plugin?.engine || !plugin.settings.accessToken) {
      if (manual) new Notice('请先在本设备启用并授权百度网盘同步。');
      return;
    }
    const controller = new AbortController(); this.foregroundController = controller;
    let saved = false;
    const timer = setTimeout(() => {
      try { this.record('timeout'); } catch (_) {}
      controller.abort();
      if (manual) new Notice('同步等待已超时，已停止等待；底层传输可能仍在继续，请查看百度同步状态。', 10000);
    }, this.settings.maxWaitSeconds * 1000);
    try {
      this.record('pending');
      await this.abortable(this.saveOpenNotes(), controller.signal); saved = true;
      if (!plugin.engine.qyyInit) await this.waitForIdle(plugin.engine, controller.signal);
      if (controller.signal.aborted || !this.active()) return;
      const result = await this.abortable(plugin.engine.startSync(true, { reason: manual ? 'manual' : 'foreground' }), controller.signal);
      if (!this.active()) return;
      const success = result?.success === true && !(result.stats?.errors > 0);
      this.record(success ? 'complete' : 'failed', { stats: result?.stats });
      if (manual) new Notice(success ? '同步完成。' : '同步未完成，请查看百度网盘同步状态。', 8000);
    } catch (_) {
      if (!controller.signal.aborted && this.active()) {
        try { this.record(saved ? 'failed' : 'local-save-failed'); } catch (_) {}
        if (manual) new Notice(saved ? '同步失败，请稍后重试。' : '本地保存失败，请先检查笔记。', 10000);
      }
    } finally {
      clearTimeout(timer);
      if (this.foregroundController === controller) this.foregroundController = null;
    }
  }
  cancelForeground(reason) {
    if (!this.foregroundController) return;
    try { this.record(reason); } catch (_) {}
    this.foregroundController.abort();
    this.lastForegroundAt = 0;
  }
  abortable(promise, signal) {
    return new Promise((resolve, reject) => {
      const abort = () => reject(new Error('Cancelled'));
      // Attach handlers even if already aborted, so late failures are observed.
      Promise.resolve(promise).then(value => { signal.removeEventListener('abort', abort); resolve(value); }, error => { signal.removeEventListener('abort', abort); reject(error); });
      if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
    });
  }
  waitForIdle(engine, signal) {
    return new Promise((resolve, reject) => {
      let unsubscribe = () => {}, settled = false;
      const finish = error => {
        if (settled) return;
        settled = true; unsubscribe(); signal.removeEventListener('abort', abort);
        if (error) reject(error); else resolve();
      };
      const abort = () => finish(new Error('Cancelled'));
      if (signal.aborted) { abort(); return; }
      signal.addEventListener('abort', abort, { once: true });
      unsubscribe = engine.onStateChange(() => { if (!engine.isSyncing()) finish(); });
      if (settled) unsubscribe(); else if (!engine.isSyncing()) finish();
    });
  }
  dispose() {
    this.disposed = true; clearTimeout(this.startupTimer);
    this.cancelForeground('disabled');
  }
}

