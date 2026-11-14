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
.iconic-icon-picker .qyy-icon-picker-pagination { display:flex; gap:12px; align-items:center; justify-content:center; padding-block:8px; flex-wrap:wrap; }
.iconic-icon-picker .qyy-icon-picker-pagination[hidden] { display:none; }
.iconic-icon-picker .qyy-icon-picker-pagination button { min-height:32px; }
.is-mobile .iconic-icon-picker .qyy-icon-picker-pagination button { min-height:44px; }
.iconic-icon-picker .qyy-icon-picker-pagination span { color:var(--text-muted); font-size:var(--font-ui-small); }
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
   owner.wrapCallback(this,entry);
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
  const entry={original,wrapper,descriptor,page:0,records:[],bar:null,originalCallback:null,callbackWrapper:null};
  field.dispatchResults=wrapper;this.fields.set(field,entry);
 }

 wrapCallback(field,entry){
  if(typeof field.searchCallback!=='function'||field.searchCallback===entry.callbackWrapper)return;
  entry.originalCallback=field.searchCallback;
  const owner=this;
  entry.callbackWrapper=function(query,records){
   if(!owner.owner.active()){owner.removeBar(entry);return entry.originalCallback.call(this,query,records);}
   entry.query=query;entry.records=Array.isArray(records)?records:[];entry.page=0;
   owner.render(field,entry);
  };
  field.searchCallback=entry.callbackWrapper;
 }
 pageSize(){const limit=Number(this.owner.host.app.plugins?.plugins?.iconic?.settings?.maxSearchResults);return Number.isFinite(limit)&&limit>=10?Math.min(24,Math.floor(limit)):24;}
 render(field,entry){
  const size=this.pageSize(),pages=Math.max(1,Math.ceil(entry.records.length/size));entry.page=Math.max(0,Math.min(entry.page,pages-1));
  entry.originalCallback.call(field,entry.query,entry.records.slice(entry.page*size,(entry.page+1)*size));
  const modal=field.inputEl?.closest('.iconic-icon-picker'),grid=modal?.querySelector('.iconic-search-results');if(!grid)return;
  grid.scrollTop=0;
  if(!entry.bar){
   const doc=grid.ownerDocument,bar=doc.createElement('div'),prev=doc.createElement('button'),next=doc.createElement('button'),status=doc.createElement('span');
   bar.className='qyy-icon-picker-pagination';bar.setAttribute('role','group');bar.setAttribute('aria-label','图标翻页');
   prev.type=next.type='button';prev.textContent='上一页';next.textContent='下一页';status.setAttribute('aria-live','polite');
   prev.addEventListener('click',()=>{if(entry.page>0){entry.page--;this.render(field,entry);}});
   next.addEventListener('click',()=>{if((entry.page+1)*this.pageSize()<entry.records.length){entry.page++;this.render(field,entry);}});
   bar.append(prev,status,next);grid.after(bar);Object.assign(entry,{bar,prev,next,status});
  }
  entry.bar.hidden=entry.records.length===0;entry.prev.disabled=entry.page===0;entry.next.disabled=entry.page>=pages-1;
  entry.status.textContent=(entry.page+1)+' / '+pages+' · 共 '+entry.records.length+' 个';
 }
 removeBar(entry){entry.bar?.remove();entry.bar=entry.prev=entry.next=entry.status=null;}
 refresh(){this.prune();for(const field of this.fields.keys())if(!String(field.getValue()).trim())field.dispatchResults();}
 release(field,entry){this.removeBar(entry);if(field.searchCallback===entry.callbackWrapper)field.searchCallback=entry.originalCallback;if(field.dispatchResults===entry.wrapper){if(entry.descriptor)Object.defineProperty(field,'dispatchResults',entry.descriptor);else delete field.dispatchResults;}this.fields.delete(field);}
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
    const style=doc.createElement('style');style.dataset.qyyIconPicker='1115-0016';style.textContent=css;doc.head.appendChild(style);
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
HelperSettings.prototype.display=function(){display.call(this);new Setting(this.containerEl).setName('常用图标与紧凑选择器').setDesc('空搜索显示常用候选，搜索结果支持上一页／下一页；手机按钮至少 44px。').addToggle(t=>t.setValue(this.plugin.settings.iconPickerCompactEnabled!==false).onChange(v=>this.plugin.change('iconPickerCompactEnabled',v)));};
})();
