// Mark only rendered Markdown containers; no vault scan or document-wide observer.
class QYYOverviewPresentation {
  constructor(plugin) {
    this.plugin = plugin;
    this.roots = new Map();
    this.disposed = false;
  }
  active() {
    return !this.disposed && this.plugin.settings.enabled && this.plugin.settings.folderEnabled;
  }
  reconcile(root) {
    const hidden = new Set();
    if (this.active()) {
      for (const marker of root.querySelectorAll('.fv-link-list-item, .fv-link-list-start, .fv-link-list-end')) {
        const item = marker.classList.contains('fv-link-list-item');
        // Match the previous ancestor-hiding behavior without expensive relational CSS.
        for (let parent = marker.parentElement; parent && parent !== root; parent = parent.parentElement) {
          if (parent.matches(item ? '.cm-line, li, .el-ul' : '.cm-line')) hidden.add(parent);
        }
      }
    }
    for (const element of root.querySelectorAll('.qyy-fv-hidden')) {
      if (!hidden.has(element)) element.classList.remove('qyy-fv-hidden');
    }
    for (const element of hidden) element.classList.add('qyy-fv-hidden');
  }
  release(root, observer) {
    observer.disconnect();
    for (const element of root.querySelectorAll('.qyy-fv-hidden')) element.classList.remove('qyy-fv-hidden');
    this.roots.delete(root);
  }
  refresh() {
    if (this.disposed) return;
    const wanted = new Set();
    if (this.active()) {
      for (const leaf of this.plugin.app.workspace.getLeavesOfType('markdown')) {
        const root = leaf.view?.containerEl;
        if (root) wanted.add(root);
      }
    }
    for (const [root, observer] of this.roots) {
      if (!wanted.has(root)) this.release(root, observer);
    }
    for (const root of wanted) {
      if (!this.roots.has(root)) {
        const Observer = root.ownerDocument.defaultView?.MutationObserver;
        if (!Observer) continue;
        const observer = new Observer(records => {
          // Ignore our own class changes, but react when a renderer changes a marker class.
          if (records.some(record => {
            if (record.type === 'childList') return true;
            const strip = value => (value || '').split(/\s+/).filter(c => c && c !== 'qyy-fv-hidden').sort().join(' ');
            return strip(record.oldValue) !== strip(record.target.getAttribute('class'));
          })) this.reconcile(root);
        });
        observer.observe(root, {childList: true, subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true});
        this.roots.set(root, observer);
      }
      this.reconcile(root);
    }
  }
  start() {
    this.plugin.registerEvent(this.plugin.app.workspace.on('layout-change', () => this.refresh()));
    this.plugin.registerEvent(this.plugin.app.workspace.on('file-open', () => this.refresh()));
    this.refresh();
  }
  dispose() {
    this.disposed = true;
    for (const [root, observer] of this.roots) this.release(root, observer);
  }
}
