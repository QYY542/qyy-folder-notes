FolderNotesHelper.prototype.startEmbeddedCore=async function(){
 const a=this.app.vault.adapter,manager=this.app.plugins,settings=this.manifest.dir+'/folder-settings.json';
 if(manager.plugins?.['folder-notes']||manager.plugins?.['folder-notes-helper-1109-1602'])throw Error('请先手动关闭 Folder notes 或自用版文件夹助手，再启用公开版，避免重复处理笔记。');
 if(!this.core){
  const core=new QYYEmbeddedFolderCore(this.app,{...this.manifest});this.core=core;
  core.loadData=async()=>await a.exists(settings)?JSON.parse(await a.read(settings)):null;
  core.saveData=async data=>{if(this.corePrefsReady){let changed=false;for(const [source,target]of [['autoCreate','autoCreate'],['autoCreateFocusFiles','openAfterCreate'],['autoCreateForAttachmentFolder','autoAttachments'],['underlineFolder','underline']])if(this.settings[target]!==data[source]){this.settings[target]=data[source];changed=true;}if(changed)await this.persist();}const text=JSON.stringify(data,null,2);if(!await a.exists(settings)||await a.read(settings)!==text)await a.write(settings,text);};
  core.addSettingTab=tab=>{this.coreSettingsTab=tab;};
  await core.load();this.addChild(core);
 }else if(!this.core._loaded)await this.core.load();
};
FolderNotesHelper.prototype.showCoreSettings=function(){
 if(!this.core?._loaded){new Notice('请先开启文件夹功能');return;}
 const owner=this;class CoreSettings extends Modal{onOpen(){this.modalEl.style.width='min(950px,95vw)';this.contentEl.createEl('h2',{text:'文件夹笔记完整设置'});owner.coreSettingsTab.containerEl=this.contentEl.createDiv();owner.coreSettingsTab.display();}onClose(){owner.core.settingsOpened=false;void owner.core.saveSettings(true);}}
 new CoreSettings(this.app).open();
};


FolderNotesHelper.prototype.setTrashRoot=async function(value){
 const root=qyyTrashRoot(value);if(root===this.settings.trashRoot)return;
 if(this.settings.trashEnabled)throw Error('请先关闭同步废纸篓后设置路径');
 if(this.sync.native()?.engine?.isSyncing())throw Error('请等待同步结束后设置路径');
 const a=this.app.vault.adapter;
 if(await a.exists(this.trash.root))throw Error('原废纸篓已建立，请先处理迁移；修改设置不会自动搬动历史记录');
 if(await a.exists(root))throw Error('目标目录已经存在，请选择新的空目录名称');
 this.settings.trashRoot=root;this.trash.root=root;this.trash.entriesRoot=root+'/回收项目';this.trash.receiptsRoot=root+'/处理记录';await this.persist();
};
