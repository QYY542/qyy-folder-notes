const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const source=fs.readFileSync(require('node:path').resolve(__dirname,'../src/synced-trash-1113-1100.js'),'utf8').split('module.exports = FolderNotesHelper;')[0];
const DAY=86400000, ROOT='QYY废纸篓';let checks=0;
async function setup(){
 let now=1800000000000,clock=100;const files=new Map(),dirs=new Set(['']),notices=[],nativeTrashes=[],remote=new Map(),manifest=new Map(),timers=new Set();
 const file=p=>files.has(p)?{path:p,name:p.split('/').pop()}:(dirs.has(p)?{path:p,name:p.split('/').pop(),children:[]}:null);
 const parent=p=>p.includes('/')?p.slice(0,p.lastIndexOf('/')):'';
 const create=async(p,data)=>{assert(dirs.has(parent(p)),`Missing parent ${parent(p)}`);if(file(p))throw Error('exists');files.set(p,{data:Buffer.from(data),mtime:++clock});return file(p)};
 const rm=async p=>{files.delete(p);for(const k of [...files.keys()])if(k.startsWith(p+'/'))files.delete(k);for(const k of [...dirs])if(k===p||k.startsWith(p+'/'))dirs.delete(k)};
 const adapter={exists:async p=>!!file(p),stat:async p=>files.has(p)?{type:'file',size:files.get(p).data.length,mtime:files.get(p).mtime}:dirs.has(p)?{type:'folder',mtime:0,size:0}:null,
 read:async p=>{if(!files.has(p))throw Error('missing');return files.get(p).data.toString()},
 readBinary:async p=>{const b=files.get(p)?.data;if(!b)throw Error('missing');return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)},
 write:async(p,s)=>{files.set(p,{data:Buffer.from(s),mtime:++clock})},
 list:async p=>({files:[...files.keys()].filter(x=>parent(x)===p),folders:[...dirs].filter(x=>x!==p&&x!==''&&parent(x)===p)}),remove:rm,rmdir:rm};
 const cfg={};const vault={adapter,getAbstractFileByPath:file,getConfig:k=>cfg[k],setConfig:(k,v)=>cfg[k]=v,
 createFolder:async p=>{if(file(p))throw Error('exists');assert(dirs.has(parent(p)));dirs.add(p);return file(p)},create,modify:async(f,s)=>adapter.write(f.path,s),
 rename:async(f,dest)=>{const old=f.path;if(file(dest))throw Error('exists');assert(dirs.has(parent(dest)));if(files.has(old)){files.set(dest,files.get(old));files.delete(old)}else{for(const k of [...dirs])if(k===old||k.startsWith(old+'/')){dirs.delete(k);dirs.add(dest+k.slice(old.length))}for(const [k,val]of [...files])if(k.startsWith(old+'/')){files.delete(k);files.set(dest+k.slice(old.length),val)}}f.path=dest},
 delete:async f=>rm(f.path),trash:async f=>{nativeTrashes.push(f.path);await rm(f.path)}};
 const fm={trashFile:async f=>vault.trash(f)};
 const engine={isSyncing:()=>false,filter:{shouldIgnore:()=>false},manifest:{get:p=>manifest.get(p),delete:p=>manifest.delete(p)},plans:[],
 async executePlanItem(item){const p=item.path;if(item.action==='UPLOAD'){const x=files.get(p);remote.set(p,Buffer.from(x.data));manifest.set(p,{...(await adapter.stat(p)),path:p})}else if(item.action==='DELETE_REMOTE'){remote.delete(p);manifest.delete(p)}else if(item.action==='DELETE_LOCAL'){await fm.trashFile(file(p));manifest.delete(p)}else if(item.action==='DOWNLOAD'){await adapter.write(p,remote.get(p));manifest.set(p,{...(await adapter.stat(p)),path:p})}},
 async startSync(){let errors=0;for(const item of this.plans){try{await this.executePlanItem(item)}catch(_){errors++}}this.plans=[];return {success:!errors,fullReconciliation:true,stats:{errors}}}};
 const host={settings:{enabled:true,trashEnabled:true,trashAutoClean:true},app:{vault,fileManager:fm},native:()=>({settings:{excludeFolders:[]},saveSettings:async()=>{}}),sync:{native:()=>({engine,settings:{accessToken:'test'}}),saveOpenNotes:async()=>{}},registerDomEvent(){}};
 const exp={};vm.runInNewContext(source+'\nexports.Trash=SyncedTrash;',{exports:exp,Modal:class{},Notice:class{constructor(s){notices.push(s)}},Setting:class{},crypto:webcrypto,Date:class extends Date{static now(){return now}},Uint8Array,console,document:{},setInterval:()=>0,clearInterval(){},setTimeout:(fn)=>{timers.add(fn);return fn},clearTimeout:fn=>timers.delete(fn)});
 const t=new exp.Trash(host);t.start();await t.ready;
 const put=async(p,s='text')=>{await t.mkdir(parent(p));return create(p,s)};
 const meta=async()=> (await t.list())[0];
 const age=async(m,days)=>{m.deletedAt=now-days*DAY;await t.write(t.metaPath(m.id),m)};
 const ack=async p=>manifest.set(p,{...(await adapter.stat(p)),path:p});
 return {t,host,vault,fm,engine,files,dirs,remote,manifest,nativeTrashes,notices,put,meta,age,ack,file,adapter,get now(){return now},set now(v){now=v}};
}
(async()=>{
 let h=await setup();await h.put('图.png','image');let f=await h.put('笔记/A.md','original');await h.fm.trashFile(f);let m=await h.meta();assert(!h.file('笔记/A.md'));assert.equal(await h.adapter.read(h.t.payload(m)),'original');assert.equal(await h.adapter.read('图.png'),'image');assert.equal(m.deletedAt,h.now);checks++;
 h=await setup();f=await h.put('图.png',Buffer.from([0,1,255]));await h.vault.trash(f);m=await h.meta();assert.equal(m.kind,'file');assert.equal(m.files[0].size,3);checks++;
 h=await setup();await h.put('项目/笔记.md','hello');await h.put('项目/图片.jpg','jpg');await h.t.mkdir('项目/空目录');await h.fm.trashFile(h.file('项目'));m=await h.meta();assert.equal(m.kind,'folder');await h.t.restore(m.id);assert.equal(await h.adapter.read('项目/笔记.md'),'hello');assert(h.dirs.has('项目/空目录'));checks++;
 h=await setup();await h.fm.trashFile(await h.put('a/同名.md','a'));await h.fm.trashFile(await h.put('b/同名.md','b'));assert.equal((await h.t.list()).length,2);checks++;
 h=await setup();await h.fm.trashFile(await h.put('a.md','deleted'));m=await h.meta();await h.put('a.md','new');const target=await h.t.restore(m.id);assert.notEqual(target,'a.md');assert.equal(await h.adapter.read('a.md'),'new');assert.equal(await h.adapter.read(target),'deleted');checks++;
 h=await setup();await h.fm.trashFile(await h.put('a.md'));m=await h.meta();await h.age(m,29.999);await h.engine.startSync();assert(h.file(h.t.payload(m)));await h.age(m,30);await h.engine.startSync();assert(!h.file(h.t.payload(m)));assert.equal((await h.t.receipt(m.id)).action,'purged');checks++;
 h=await setup();await h.fm.trashFile(await h.put('a.md'));m=await h.meta();await h.age(m,31);await h.vault.delete(h.file(h.t.payload(m)));await h.engine.startSync();assert(h.file(h.t.metaPath(m.id)));assert.equal(await h.t.receipt(m.id),null);checks++;
 h=await setup();await h.fm.trashFile(await h.put('a.md','abcd'));m=await h.meta();await h.age(m,31);await h.adapter.write(h.t.payload(m),'wxyz');await h.engine.startSync();assert(h.file(h.t.payload(m)));assert.equal(await h.t.receipt(m.id),null);checks++;
 h=await setup();await h.fm.trashFile(await h.put('a.md'));m=await h.meta();await h.age(m,-10);await h.engine.startSync();assert(h.file(h.t.payload(m)));checks++;
 h=await setup();await h.put('a.md');await h.engine.executePlanItem({path:'a.md',action:'DELETE_LOCAL'});assert.equal((await h.t.list()).length,0);assert.equal(h.nativeTrashes.length,1);checks++;
 h=await setup();await h.fm.trashFile(await h.put('a.md'));m=await h.meta();h.remote.set('a.md',Buffer.from('text'));await assert.rejects(()=>h.engine.executePlanItem({path:'a.md',remotePath:'/a.md',action:'DELETE_REMOTE'}));assert(h.remote.has('a.md'));await h.ack(h.t.metaPath(m.id));await h.ack(h.t.payload(m));await h.engine.executePlanItem({path:'a.md',remotePath:'/a.md',action:'DELETE_REMOTE'});assert(!h.remote.has('a.md'));checks++;
 h=await setup();await h.fm.trashFile(await h.put('a.md'));m=await h.meta();await h.t.restore(m.id);const receipt=h.t.receiptPath(m.id);await assert.rejects(()=>h.engine.executePlanItem({path:receipt,action:'UPLOAD'}));await h.ack('a.md');await h.engine.executePlanItem({path:receipt,action:'UPLOAD'});assert(h.remote.has(receipt));checks++;
 h=await setup();await h.fm.trashFile(await h.put('a.md'));m=await h.meta();await h.age(m,31);await h.engine.startSync();await h.ack(h.t.receiptPath(m.id));const oldpath=h.t.payload(m);h.remote.set(oldpath,Buffer.from('stale'));await h.engine.executePlanItem({path:oldpath,remotePath:'/stale',action:'DOWNLOAD'});assert(!h.remote.has(oldpath));assert(!h.file(oldpath));checks++;
 h=await setup();await h.fm.trashFile(await h.put('a.md'));m=await h.meta();await h.age(m,31);await h.engine.startSync();await h.put(h.t.payload(m),'partial');await h.engine.startSync();assert(!h.file(h.t.payload(m)));checks++;
 h=await setup();await h.fm.trashFile(await h.put('a.md'));m=await h.meta();await h.age(m,31);h.host.settings.trashAutoClean=false;await h.engine.startSync();assert(h.file(h.t.payload(m)));h.host.settings.enabled=false;h.t.refresh();await h.fm.trashFile(await h.put('b.md'));assert.equal(h.nativeTrashes.length,1);checks++;
 h=await setup();await h.fm.trashFile(await h.put('a.md'));m=await h.meta();await h.age(m,31);await h.put(h.t.dir(m.id)+'/意外文件.txt','keep');await h.engine.startSync();assert(h.file(h.t.payload(m)));assert(h.file(h.t.dir(m.id)+'/意外文件.txt'));checks++;
 h=await setup();await h.put('项目/a.md');await h.t.mkdir('项目/空目录');await h.fm.trashFile(h.file('项目'));m=await h.meta();await h.adapter.rmdir(h.t.payload(m)+'/空目录',true);assert(await h.t.complete(m));assert(h.dirs.has(h.t.payload(m)+'/空目录'));checks++;
 h=await setup();await assert.rejects(()=>h.t.remove('笔记/a.md'));await assert.rejects(()=>h.fm.trashFile(h.file(ROOT)));assert(h.dirs.has(ROOT));checks++;
 console.log(`${checks} trash checks passed: file/folder/binary restore, collisions, 30-day boundary, missing/corrupt payload, remote deletion bypass, upload ordering, restored receipts, stale resurrection, partial tombstones, disabled cleanup, unknown files, empty directories and path confinement.`);
})().catch(e=>{console.error(e);process.exitCode=1});
