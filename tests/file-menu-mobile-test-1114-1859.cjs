const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{webcrypto}=require('crypto');
const source=fs.readFileSync(path.join(__dirname,'../main.js'),'utf8').replace('return module.exports.default;})();','return {core:module.exports.default,Commands};})();');
class Base{}class TFile{}class TFolder{}
const ob=new Proxy({Platform:{isMobile:true,isPhone:true,isDesktop:false,isDesktopApp:false},Plugin:Base,TFile,TFolder,Notice:Base},{get:(o,k)=>o[k]||Base});const m={exports:{}};
const lib=new Function('require','module','exports','crypto',source+';return {QYYFileMenuActions,Commands:QYYEmbeddedFolderCore.Commands,FolderNotesHelper};')(name=>{assert.equal(name,'obsidian');return ob},m,m.exports,webcrypto);
let count=0;function test(name,fn){fn();count++;console.log('PASS',name)}
const callbacks=new Map(),classes=new Set(),core={},host={settings:{enabled:true,folderEnabled:true},native:()=>core,windows:new Set([{document:{body:{classList:{toggle:(k,v)=>v?classes.add(k):classes.delete(k),remove:k=>classes.delete(k)}}}}]),registerEvent:()=>{},app:{workspace:{on:(n,fn)=>{callbacks.set(n,fn);return {n}}}}};
const actions=new lib.QYYFileMenuActions(host);actions.start();
function menu(){return {sections:['title','open'],items:[{title:'New base'},{title:'New folder'},{title:'Folder note actions'}],sort(){},addItem(fn){const item={setTitle(x){this.title=x;return this},setIcon(){return this},setSection(x){this.section=x;return this},onClick(fn){this.callback=fn;return this}};fn(item);this.items.push(item)}}}
test('mobile long-press file-menu event attaches the same two creation actions',()=>{const target={extension:'md'},m=menu();callbacks.get('file-menu')(m,target,'file-explorer-context-menu');m.sort();assert.deepEqual(m.items.map(x=>x.title),['新建笔记','新建白板']);assert.equal(m.sections[0],'qyy-create');});
test('menus queued before disabling retain standard entries',()=>{const m=menu();callbacks.get('file-menu')(m,{extension:'md'});host.settings.enabled=false;m.sort();assert.deepEqual(m.items.map(x=>x.title),['New base','New folder','Folder note actions']);host.settings.enabled=true;});
test('mobile menu callbacks preserve their target and chosen child type',()=>{const m=menu(),f={extension:'md'},seen=[];actions.create=(target,type)=>{seen.push([target,type]);return Promise.resolve()};callbacks.get('file-menu')(m,f);m.sort();m.items[0].callback();m.items[1].callback();assert.deepEqual(seen,[[f,'md'],[f,'canvas']]);});
test('unsupported menu internals fail safely without throwing',()=>{actions.attach({},{});});
test('disable restores pointer and embedded mobile controls',()=>{host.settings.enabled=false;actions.refresh();assert.equal(core.qyySimplifiedMenus,false);assert.equal(classes.size,0);host.settings.enabled=true;actions.refresh();assert.equal(core.qyySimplifiedMenus,true);assert(classes.has('qyy-folder-arrow-cursor'));actions.dispose();assert.equal(core.qyySimplifiedMenus,undefined);assert.equal(classes.size,0)});
test('embedded mobile flat actions are hidden for files without affecting folders',()=>{
 let handle;const plugin={qyySimplifiedMenus:true,settings:{storageLocation:'insideFolder'},registerEvent(){}};
 const commands=Object.create(lib.Commands.prototype);commands.plugin=plugin;commands.app={workspace:{on:(n,fn)=>{handle=fn;return {n}}}};commands.fileCommands();
 const file=Object.assign(new TFile(),{path:'note.md',basename:'note',extension:'md'});let added=0;const m={addItem:fn=>{added++;fn({setTitle(){return this},setIcon(){return this},onClick(){return this}})}};
 handle(m,file);assert.equal(added,0);plugin.qyySimplifiedMenus=false;handle(m,file);assert.equal(added,1);
});
console.log('PASS '+count+' mobile menu and lifecycle checks');
