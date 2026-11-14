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
class QYYIconPickerPresentation {
 constructor(host){this.host=host;this.documents=new Map();this.grids=new Map();this.queued=false;this.disposed=false;}
 active(){return !this.disposed&&this.host.settings.enabled&&this.host.settings.iconPickerCompactEnabled!==false;}
 update(doc){
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
    const style=doc.createElement('style');style.dataset.qyyIconPicker='1114-2356';style.textContent=css;doc.head.appendChild(style);
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
 start(){this.scan();this.host.registerEvent(this.host.app.workspace.on('layout-change',()=>this.scan()));this.host.registerEvent(this.host.app.workspace.on('window-open',()=>this.scan()));}
 stop(){for(const {style,observer}of this.documents.values()){observer.disconnect();style.remove();}this.documents.clear();for(const [grid,hint]of this.grids){hint.remove();grid.classList.remove('qyy-icon-picker-grid','qyy-icon-picker-empty');}this.grids.clear();}
 dispose(){this.disposed=true;this.stop();}
}
DEFAULTS.iconPickerCompactEnabled=true;
const load=FolderNotesHelper.prototype.onload,unload=FolderNotesHelper.prototype.onunload,change=FolderNotesHelper.prototype.change,display=HelperSettings.prototype.display;
FolderNotesHelper.prototype.onload=async function(){await load.call(this);this.iconPickerPresentation=new QYYIconPickerPresentation(this);this.iconPickerPresentation.start();};
FolderNotesHelper.prototype.onunload=function(){this.iconPickerPresentation?.dispose();return unload.call(this);};
FolderNotesHelper.prototype.change=async function(k,v){await change.call(this,k,v);if(k==='enabled'||k==='iconPickerCompactEnabled')this.iconPickerPresentation?.scan();};
HelperSettings.prototype.display=function(){display.call(this);new Setting(this.containerEl).setName('紧凑图标选择器').setDesc('Iconic 的结果区按内容收缩，手机保持足够大的点按区域，无结果时显示提示。').addToggle(t=>t.setValue(this.plugin.settings.iconPickerCompactEnabled!==false).onChange(v=>this.plugin.change('iconPickerCompactEnabled',v)));};
})();
