// Optional Iconic picker presentation. No note, icon assignment or clipboard writes.
(() => {
const css = `
.iconic-icon-picker .iconic-search-results.qyy-icon-picker-grid {
 height: auto;
 max-height: min(40vh, 320px);
 padding-block: 8px;
 overflow-y: auto;
}
.iconic-icon-picker .qyy-icon-picker-grid > .setting-item-control {
 gap: 4px;
 justify-content: flex-start;
 align-content: flex-start;
}
.iconic-icon-picker .qyy-icon-picker-grid .iconic-search-result {
 min-width: 36px;
 min-height: 36px;
 display: inline-flex;
 align-items: center;
 justify-content: center;
}
.is-mobile .iconic-icon-picker .qyy-icon-picker-grid .iconic-search-result {
 min-width: 44px;
 min-height: 44px;
}
.iconic-icon-picker .iconic-search-results.qyy-icon-picker-empty { display: none; }
.iconic-icon-picker .qyy-icon-picker-hint { color: var(--text-muted); font-size: var(--font-ui-small); padding: 12px 0; }
`;

// Adapt only Iconic's empty-query behavior; native search, selection and saving remain in Iconic.
const emojiChoices=[['😀','开心 Smile'],['😎','酷 Cool'],['🧠','大脑 Brain'],['📚','书籍 Books'],['📖','阅读 Reading'],['📝','笔记 Notes'],['🎯','目标 Target'],['⭐','星星 Star'],['✅','完成 Done'],['📌','置顶 Pin'],['📁','文件夹 Folder'],['📂','打开文件夹 Open folder'],['🏠','家 Home'],['🧭','导航 Compass'],['🔧','工具 Tools'],['🔩','工程 Engineering'],['💡','想法 Idea'],['🔬','科研 Research'],['💻','电脑 Computer'],['🎨','艺术 Art'],['🎵','音乐 Music'],['🌍','世界 World'],['🌱','成长 Growth'],['🚀','项目 Rocket']];
const lineChoices=[['lucide-folder','文件夹 Folder'],['lucide-file-text','笔记 Note'],['lucide-book-open','阅读 Reading'],['lucide-brain','思考 Thinking'],['lucide-lightbulb','想法 Idea'],['lucide-code','代码 Code'],['lucide-flask-conical','科研 Research'],['lucide-target','目标 Target'],['lucide-calendar','日历 Calendar'],['lucide-house','家 Home'],['lucide-heart','喜欢 Heart'],['lucide-star','收藏 Star']];
class QYYIconicCandidates {
 constructor(owner){this.owner=owner;this.fields=new Map();this.proto=null;}
 install(){
  if(this.proto)return;
  let api;try{api=require('obsidian');}catch{return;}
  const proto=api.SearchComponent?.prototype;
  if(!proto||typeof proto.onChange!=='function')return;
  this.api=api;this.proto=proto;this.descriptor=Object.getOwnPropertyDescriptor(proto,'onChange');this.original=proto.onChange;
  const owner=this,original=this.original;
  this.wrapper=function(...args){const result=original.apply(this,args);owner.capture(this);return result;};
  proto.onChange=this.wrapper;
 }
 capture(field){
  if(this.fields.has(field)||!field.inputEl?.closest('.iconic-icon-picker')||typeof field.dispatchResults!=='function'||typeof field.setModes!=='function')return;
  const owner=this,original=field.dispatchResults,descriptor=Object.getOwnPropertyDescriptor(field,'dispatchResults');
  const wrapper=function(...args){
   if(owner.owner.active()&&!String(this.getValue()).trim()&&typeof this.searchCallback==='function'){
    const choices=[];
    if(this.emojiMode)choices.push(...emojiChoices);
    if(this.iconMode)choices.push(...lineChoices.filter(([id])=>{try{return !!owner.api.getIcon?.(id);}catch{return false;}}));
    // A truthy query bypasses Iconic's current-icon-only fallback without changing the input.
    this.searchCallback(' ',choices.map(([id,label])=>[id,label,[],0]));
    return Promise.resolve();
   }
   return original.apply(this,args);
  };
  field.dispatchResults=wrapper;this.fields.set(field,{original,wrapper,descriptor});
 }
 refresh(){this.prune();for(const field of this.fields.keys())if(!String(field.getValue()).trim())field.dispatchResults();}
 release(field,entry){if(field.dispatchResults===entry.wrapper){if(entry.descriptor)Object.defineProperty(field,'dispatchResults',entry.descriptor);else delete field.dispatchResults;}this.fields.delete(field);}
 prune(){for(const [field,entry]of this.fields)if(!field.inputEl?.isConnected)this.release(field,entry);}
 dispose(){
  if(this.proto?.onChange===this.wrapper){if(this.descriptor)Object.defineProperty(this.proto,'onChange',this.descriptor);else delete this.proto.onChange;}
  for(const [field,entry]of this.fields){this.release(field,entry);if(field.inputEl?.isConnected&&!String(field.getValue()).trim())field.dispatchResults();}
  this.proto=null;
 }
}

class QYYIconPickerPresentation {
 constructor(host){this.host=host;this.documents=new Map();this.grids=new Map();this.queued=false;this.disposed=false;this.candidates=new QYYIconicCandidates(this);}
 active(){return !this.disposed&&this.host.settings.enabled&&this.host.settings.iconPickerCompactEnabled!==false;}
 update(doc){
  this.candidates.prune();
  if(!this.active())return;
  for(const grid of doc.querySelectorAll('.iconic-icon-picker .iconic-search-results')){
   let hint=this.grids.get(grid);
   if(!hint){hint=doc.createElement('div');hint.className='qyy-icon-picker-hint';hint.setAttribute('role','status');hint.textContent='输入关键词搜索图标或表情；没有匹配时可更换关键词或切换图标/表情模式。';grid.after(hint);this.grids.set(grid,hint);}
   const empty=!grid.querySelector('.iconic-search-result:not(.iconic-invisible)');
   grid.classList.add('qyy-icon-picker-grid');grid.classList.toggle('qyy-icon-picker-empty',empty);hint.hidden=!empty;
  }
  for(const [grid,hint]of this.grids)if(!grid.isConnected){hint.remove();grid.classList.remove('qyy-icon-picker-grid','qyy-icon-picker-empty');this.grids.delete(grid);}
 }
 scan(){
  if(!this.active()){this.stop();return;}
  const docs=new Set([this.host.app.workspace.containerEl.ownerDocument]);
  this.host.app.workspace.iterateAllLeaves(l=>{if(l.view?.containerEl)docs.add(l.view.containerEl.ownerDocument);});
  for(const doc of docs){
   if(!this.documents.has(doc)){
    const style=doc.createElement('style');style.dataset.qyyIconPicker='1115-0010';style.textContent=css;doc.head.appendChild(style);
    const observer=new doc.defaultView.MutationObserver(records=>{
     if(!this.active()||this.queued)return;
     const relevant=records.some(r=>r.target.closest?.('.iconic-icon-picker')||[...r.addedNodes].some(n=>n.matches?.('.iconic-icon-picker')||n.querySelector?.('.iconic-icon-picker'))||[...r.removedNodes].some(n=>n.matches?.('.modal-container,.iconic-icon-picker')));
     if(!relevant)return;this.queued=true;Promise.resolve().then(()=>{this.queued=false;if(this.active())for(const d of this.documents.keys())this.update(d);});
    });
    observer.observe(doc.body,{subtree:true,childList:true});this.documents.set(doc,{style,observer});
   }
   this.update(doc);
  }
  for(const [doc,entry]of this.documents)if(doc.defaultView?.closed){entry.observer.disconnect();entry.style.remove();this.documents.delete(doc);}
 }
 start(){this.candidates.install();this.scan();this.host.registerEvent(this.host.app.workspace.on('layout-change',()=>this.scan()));this.host.registerEvent(this.host.app.workspace.on('window-open',()=>this.scan()));}
 stop(){for(const {style,observer}of this.documents.values()){observer.disconnect();style.remove();}this.documents.clear();for(const [grid,hint]of this.grids){hint.remove();grid.classList.remove('qyy-icon-picker-grid','qyy-icon-picker-empty');}this.grids.clear();}
 dispose(){this.disposed=true;this.candidates.dispose();this.stop();}
}
DEFAULTS.iconPickerCompactEnabled=true;
const load=FolderNotesHelper.prototype.onload,unload=FolderNotesHelper.prototype.onunload,change=FolderNotesHelper.prototype.change,display=HelperSettings.prototype.display;
FolderNotesHelper.prototype.onload=async function(){await load.call(this);this.iconPickerPresentation=new QYYIconPickerPresentation(this);this.iconPickerPresentation.start();};
FolderNotesHelper.prototype.onunload=function(){this.iconPickerPresentation?.dispose();return unload.call(this);};
FolderNotesHelper.prototype.change=async function(k,v){await change.call(this,k,v);if(k==='enabled'||k==='iconPickerCompactEnabled'){this.iconPickerPresentation?.scan();this.iconPickerPresentation?.candidates.refresh();}};
HelperSettings.prototype.display=function(){display.call(this);new Setting(this.containerEl).setName('常用图标与紧凑选择器').setDesc('搜索为空时显示常用表情与图标，结果区按内容收缩；手机点按区域至少 44px。').addToggle(t=>t.setValue(this.plugin.settings.iconPickerCompactEnabled!==false).onChange(v=>this.plugin.change('iconPickerCompactEnabled',v)));};
})();
