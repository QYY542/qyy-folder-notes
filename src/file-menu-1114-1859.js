// File-explorer actions shared by desktop and mobile long-press menus.
class QYYFileMenuActions {
  constructor(host) { this.host=host; this.app=host.app; this.queue=Promise.resolve(); }
  active() { return !this.host.disposed && this.host.settings.enabled && this.host.settings.folderEnabled; }
  refresh() { if(this.host.native())this.host.native().qyySimplifiedMenus=this.active(); for (const win of this.host.windows || []) win.document.body?.classList.toggle('qyy-folder-arrow-cursor',this.active()); }
  start() {
    this.host.registerEvent(this.app.workspace.on('file-menu',(menu,file)=>this.attach(menu,file)));
    this.refresh();
  }
  attach(menu,file) {
    if (!this.active() || !file || !Array.isArray(menu.items) || typeof menu.sort!=='function') return;
    const owner=this, sort=menu.sort;
    // Prepare at display time, after all other providers have added their items.
    menu.sort=function(...args) { if(owner.active())owner.prepare(this,file); return sort.apply(this,args); };
  }
  prepare(menu,file) {
    if (menu.qyyPrepared) return;
    menu.qyyPrepared=true;
    const folder=Array.isArray(file.children), note=file.extension==='md';
    const label=item=>(item.titleEl?.textContent || item.title || '').trim().replace(/[.…]+$/,'');
    const hidden=new Set(['新建数据库','New base','New database','新建文件夹','New folder']);
    if (!folder) { hidden.add('文件夹笔记操作'); hidden.add('Folder note actions'); }
    if(folder || note)for(const name of ['新建笔记','New note','新建白板','New canvas'])hidden.add(name);
    menu.items=menu.items.filter(item=>{if(!hidden.has(label(item)))return true;item.dom?.remove();return false;});
    if(!folder && !note)return;
    const section='qyy-create';
    if(Array.isArray(menu.sections))menu.sections=[section,...menu.sections.filter(s=>s!==section)];
    else menu.addSections?.([section]);
    for(const [title,icon,extension] of [['新建笔记','file-plus','md'],['新建白板','layout-dashboard','canvas']]){
      menu.addItem(item=>item.setTitle(title).setIcon(icon).setSection(section).onClick(()=>this.create(file,extension).catch(error=>new Notice(error.message))));
    }
  }
  create(file,extension) {
    const task=this.queue.then(()=>this.createInside(file,extension));
    this.queue=task.catch(()=>{}); return task;
  }
  expand(folder) {
    for(const leaf of this.app.workspace.getLeavesOfType('file-explorer')){
      const view=leaf.view;
      for(let current=folder;current;current=current.parent){
        const item=view.fileItems?.[current.path];
        if(item?.collapsed && typeof item.toggleCollapsed==='function')item.toggleCollapsed(false);
      }
    }
  }
  async createInside(file,extension) {
    if(!this.active())throw Error('请先开启文件夹笔记助手。');
    if(!['md','canvas'].includes(extension))throw Error('不支持的文件类型。');
    const vault=this.app.vault,core=this.host.native();
    if(vault.getAbstractFileByPath(file.path)!==file)throw Error('原文件已移动或删除，请重新打开右键菜单。');
    await this.host.sync.saveOpenNotes();
    let folder=Array.isArray(file.children)?file:null;
    const oldPath=file.path;
    if(!folder){
      if(file.extension!=='md')throw Error('只有 Markdown 笔记可以转换为文件夹笔记。');
      if(core.settings.storageLocation!=='insideFolder')throw Error('请先将文件夹笔记存储位置设为“文件夹内”。');
      if(file.parent?.name===file.basename)folder=file.parent;
    }
    const path=folder ? folder.path : (file.parent?.path && file.parent.path!=='/' ? file.parent.path+'/' : '')+file.basename;
    if(!folder && vault.getAbstractFileByPath(path))throw Error('同名文件夹或文件已存在，已保留原笔记，未进行转换。');
    core.qyyConflictFolders ||= new Set();
    if(core.qyyConflictFolders.has(path))throw Error('此文件夹正在处理其他操作，请稍后重试。');
    core.qyyConflictFolders.add(path);
    try{
      if(!folder){
        const before=await vault.read(file),target=path+'/'+file.name;
        const relocated=qyyRelocateMarkdown(before,oldPath,target,this.app);
        folder=await vault.createFolder(path);
        await this.app.fileManager.renameFile(file,target);
        // Obsidian may already have updated relative links while moving the note.
        if(relocated!==before)await vault.process(file,current=>current===before?relocated:current);
      }
      const d=new Date(),pad=x=>String(x).padStart(2,'0');
      const name='未命名-'+pad(d.getMonth()+1)+pad(d.getDate())+'-'+pad(d.getHours())+pad(d.getMinutes());
      const base=(folder.path && folder.path!=='/'?folder.path+'/':'')+name;
      const childPath=vault.getAvailablePath(base,extension);
      // The vault root has no nonempty path prefix; guard its child explicitly too.
      core.qyyConflictFolders.add(childPath);
      let child;
      try { child=await vault.create(childPath,extension==='md'?'':JSON.stringify({nodes:[],edges:[]})); }
      finally { core.qyyConflictFolders.delete(childPath); }
      await core.saveSettings(true);
      this.expand(folder);
      const leaf=this.app.workspace.getLeaf(false);
      await leaf.openFile(child,{active:true,state:{mode:'source'},eState:{rename:'all'}});
      this.app.workspace.setActiveLeaf(leaf,{focus:true});
      this.app.nextFrame(()=>{if(this.active())this.expand(folder);});
      return {folder,child};
    }finally{core.qyyConflictFolders.delete(path);}
  }
  dispose(){ if(this.host.native())delete this.host.native().qyySimplifiedMenus; for(const win of this.host.windows || [])win.document.body?.classList.remove('qyy-folder-arrow-cursor'); }
}
