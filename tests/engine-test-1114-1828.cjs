const fs=require('node:fs'),assert=require('node:assert/strict'),{webcrypto,createHash}=require('node:crypto');
const source=fs.readFileSync(require('node:path').resolve(__dirname,'fixtures/sync-main-1114-1828.js'),'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let passed=0;
const ab=b=>{b=Buffer.from(b);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
function load({mobile=false,request=async()=>{throw Error('Unexpected network');},timeoutFn=setTimeout}={}){
 const imports=[],m={exports:{}},stub={Plugin:class{},PluginSettingTab:class{},Modal:class{},TFile:class{},Notice:class{},Platform:{isMobile:mobile,isDesktopApp:!mobile},requestUrl:request};
 new Function('require','module','exports','window','crypto','document','setTimeout',source+'\nmodule.exports={SyncEngine,SyncPlanner,ManifestManager,BaiduClient,BaiduOAuthManager,BaiduSyncPlugin,encryptData,decryptData};')(n=>{imports.push(n);assert.equal(n,'obsidian');return stub;},m,m.exports,{crypto:webcrypto,setTimeout,clearTimeout,setInterval,clearInterval},webcrypto,{visibilityState:'visible'},timeoutFn);
 return {...m.exports,imports,stub};
}
function setup({mobile=false}={}){
 const lib=load({mobile}),files=new Map(),dirs=new Set(['','.obsidian','.obsidian/plugins','.obsidian/plugins/baidu-netdisk-sync']),remote=new Map(),deleted=[],events=[];let clock=1700000000000,id=100,active=0,peak=0;
 const parent=p=>p.includes('/')?p.slice(0,p.lastIndexOf('/')):'';
 const mkdir=p=>{for(let c=p;c;c=parent(c))dirs.add(c);};
 const put=(p,data='hello')=>{mkdir(parent(p));files.set(p,{bytes:Buffer.from(data),mtime:++clock});};
 const adapter={
  exists:async p=>files.has(p)||dirs.has(p),
  stat:async p=>files.has(p)?{type:'file',mtime:files.get(p).mtime,size:files.get(p).bytes.length}:dirs.has(p)?{type:'folder',mtime:0,size:0}:null,
  list:async p=>({files:[...files.keys()].filter(x=>parent(x)===p),folders:[...dirs].filter(x=>x&&x!==p&&parent(x)===p)}),
  read:async p=>files.get(p).bytes.toString(),readBinary:async p=>ab(files.get(p).bytes),
  write:async(p,s)=>put(p,s),writeBinary:async(p,b)=>{put(p,Buffer.from(b));},mkdir:async p=>mkdir(p),trashLocal:async p=>{deleted.push(p);files.delete(p);}
 };
 const settings={accessToken:'synthetic',ignoredPatterns:'',syncObsidianConfig:true,syncPlugins:true,syncThemes:true,remoteBasePath:'/apps/test',enableE2EE:false,qyyParallel:true};
 const meta=(p,r)=>({path:'/apps/test/'+p,fs_id:r.id,isdir:0,size:r.bytes.length,md5:createHash('md5').update(r.bytes).digest('hex'),server_mtime:r.time/1000,mtime:r.time/1000});
 const remotePut=(p,data)=>{remote.set(p,{id:++id,bytes:Buffer.from(data),time:clock+=1000});return meta(p,remote.get(p));};
 const client={listAll:async()=>[...remote].map(([p,r])=>meta(p,r)),getFileMeta:async fid=>{const e=[...remote].find(([p,r])=>r.id===fid);if(!e)throw Error('missing remote');return meta(...e);},deleteFiles:async paths=>{for(const path of paths){events.push('delete:'+path);remote.delete(path.slice('/apps/test/'.length));}}};
 client.qyyListDirectory=async dir=>[...remote].map(([p,r])=>meta(p,r)).filter(x=>x.path.slice(0,x.path.lastIndexOf('/'))===dir);
 const manifest=new lib.ManifestManager(adapter,'.obsidian/plugins/baidu-netdisk-sync/sync_manifest.json');manifest.load=async()=>manifest.manifest;
 const engine=new lib.SyncEngine({vault:{adapter,configDir:'.obsidian',getAbstractFileByPath:()=>null},fileManager:{}},()=>settings,async()=>{},client,manifest);
 engine.uploader={uploadFile:async(p,b)=>{active++;peak=Math.max(peak,active);await sleep(15);events.push('upload:'+p);const r=remotePut(p.slice('/apps/test/'.length),Buffer.from(b));active--;return r;}};
 engine.downloader={downloadByFsId:async fid=>{await sleep(5);const e=[...remote.values()].find(r=>r.id===fid);if(!e)throw Error('missing');return ab(e.bytes);}};
 async function baseline(p,text='old'){put(p,text);const r=remotePut(p,text),s=await adapter.stat(p);manifest.set({path:p,remotePath:r.path,mtime:s.mtime,size:s.size,remoteMtime:r.server_mtime*1000,remoteSize:r.size,md5:r.md5,fsId:r.fs_id,localHash:createHash('sha256').update(text).digest('hex')});}
 return {lib,engine,manifest,settings,adapter,files,dirs,remote,put,remotePut,baseline,deleted,events,client,get peak(){return peak;}};
}
async function test(name,fn){await fn();passed++;console.log('PASS',name);}
module.exports={setup,load};
if(require.main===module)(async()=>{
await test('mobile module uses only Obsidian API',async()=>{const l=load({mobile:true});assert(l.imports.every(x=>x==='obsidian'));});
await test('parallel listing preserves scope and skips excluded directories',async()=>{
 let active=0,peak=0,requests=[];const lib=load({request:async p=>{const u=new URL(p.url),dir=u.searchParams.get('dir');requests.push(dir);active++;peak=Math.max(peak,active);await sleep(10);active--;return {status:200,json:{errno:0,list:dir==='/r'?[{path:'/r/a',isdir:1},{path:'/r/b',isdir:1},{path:'/r/skip',isdir:1}]:[{path:dir+'/x.md',isdir:0,fs_id:1}]}};}});
 const c=new lib.BaiduClient({refreshTokenIfNeeded:async()=>''});const r=await c.listAll('/r',{ignore:p=>p==='skip'});assert.equal(r.length,2);assert.equal(peak,2);assert(!requests.includes('/r/skip'));
});
await test('partial directory failure rejects complete inventory',async()=>{const l=load({request:async()=>({status:200,json:{errno:-9}})});const c=new l.BaiduClient({refreshTokenIfNeeded:async()=>''});await assert.rejects(c.listAll('/r'));assert.deepEqual(await c.listAll('/r',{allowMissingRoot:true}),[]);});
await test('invalid cross-root remote response rejected',async()=>{const l=load({request:async()=>({status:200,json:{errno:0,list:[{path:'/elsewhere/note.md',isdir:0}]}})});await assert.rejects(new l.BaiduClient({refreshTokenIfNeeded:async()=>''}).listAll('/r'));});
await test('duplicate pagination rejected rather than interpreted as deletion',async()=>{const page=Array.from({length:1000},(_,i)=>({path:'/r/f'+i,isdir:0}));const l=load({request:async()=>({status:200,json:{errno:0,list:page}})});await assert.rejects(new l.BaiduClient({refreshTokenIfNeeded:async()=>''}).listAll('/r'),/重复/);});
await test('unchanged round writes success timing with zero transfers',async()=>{const h=setup();await h.baseline('a.md');const r=await h.engine.startSync(false,{full:true});assert(r.success);assert.equal(r.stats.uploaded,0);assert.equal(r.stats.deleted,0);assert(h.settings.lastCheckTime);assert(r.timing.remoteMs>=0);});
await test('desktop queue actually has two simultaneous transfers',async()=>{const h=setup();for(let i=0;i<5;i++)h.put(i+'.md');const r=await h.engine.startSync(false,{full:true});assert(r.success);assert.equal(r.stats.uploaded,5);assert.equal(h.peak,2);});
await test('mobile transfer concurrency stays one',async()=>{const h=setup({mobile:true});h.put('a.md');h.put('b.md');assert((await h.engine.startSync(false,{full:true})).success);assert.equal(h.peak,1);});
await test('parallel optimization can be disabled',async()=>{const h=setup();h.settings.qyyParallel=false;h.put('a.md');h.put('b.md');await h.engine.startSync(false,{full:true});assert.equal(h.peak,1);});
await test('single-flight shares one active job',async()=>{const h=setup();h.put('a.md');const a=h.engine.startSync(false,{full:true}),b=h.engine.startSync(false,{full:true});assert.strictEqual(a,b);await a;assert.equal(h.events.filter(x=>x.startsWith('upload:')&&!x.includes('/.qyy-sync-events/')).length,1);});
await test('explicit full checks are not satisfied by a cached fast result',async()=>{const h=setup();let calls=0;h.client.listAll=async()=>{calls++;return []};await h.engine.startSync(true,{reason:'startup',full:true});await h.engine.startSync(true,{reason:'foreground',full:true});assert.equal(calls,2);await h.engine.startSync(false,{reason:'manual',full:true});assert.equal(calls,3);});
await test('edits during upload cause a merged follow-up',async()=>{const h=setup();h.put('a.md','one');const original=h.engine.uploader.uploadFile;let edited=false;h.engine.uploader.uploadFile=async(...args)=>{const r=await original(...args);if(!edited){edited=true;h.put('a.md','two');h.engine.markDirty();}return r;};assert((await h.engine.startSync(false,{full:true})).success);assert.equal(h.remote.get('a.md').bytes.toString(),'two');assert.equal(h.events.filter(x=>x.startsWith('upload:')&&!x.includes('/.qyy-sync-events/')).length,2);});
await test('scan failure never runs a delete',async()=>{const h=setup();await h.baseline('a.md');h.client.listAll=async()=>{throw Error('incomplete')};const r=await h.engine.startSync(false,{full:true});assert(!r.success);assert(h.files.has('a.md'));assert.equal(h.deleted.length,0);});
await test('same-content rewrites do not upload',async()=>{const h=setup();await h.baseline('a.md');h.put('a.md','old');const r=await h.engine.startSync(false,{full:true});assert(r.success);assert.equal(r.stats.uploaded,0);});
await test('sub-second same-size edits are detected',async()=>{const h=setup();await h.baseline('a.md','aaa');h.put('a.md','bbb');const r=await h.engine.startSync(false,{full:true});assert(r.success);assert.equal(h.remote.get('a.md').bytes.toString(),'bbb');});
await test('edit during download is preserved',async()=>{const h=setup();await h.baseline('a.md');h.remotePut('a.md','remote');const orig=h.engine.downloader.downloadByFsId;h.engine.downloader.downloadByFsId=async id=>{const bytes=await orig(id);h.put('a.md','typing now');return bytes};assert(!(await h.engine.startSync(false,{full:true})).success);assert.equal(h.files.get('a.md').bytes.toString(),'typing now');});
await test('receipt uploads follow backup uploads; deletes run last',async()=>{const h=setup();await h.baseline('gone.md');h.files.delete('gone.md');h.put('QYY废纸篓/回收项目/x/内容/gone.md');h.put('QYY废纸篓/处理记录/x.json');assert((await h.engine.startSync(false,{full:true})).success);assert(h.events[0].includes('回收项目'));assert(h.events[1].includes('处理记录'));assert(h.events[2].startsWith('delete:'));});
await test('failed transfer blocks subsequent deletion phase',async()=>{const h=setup();await h.baseline('gone.md');h.files.delete('gone.md');h.put('backup.md');h.engine.uploader.uploadFile=async()=>{throw Error('upload failed')};assert(!(await h.engine.startSync(false,{full:true})).success);assert(h.remote.has('gone.md'));});
await test('remote changes after scan block overwrite',async()=>{const h=setup();await h.baseline('a.md');h.put('a.md','local');const original=h.client.listAll;h.client.listAll=async()=>{const r=await original();h.remotePut('a.md','new remote');return r};assert(!(await h.engine.startSync(false,{full:true})).success);assert.equal(h.remote.get('a.md').bytes.toString(),'new remote');});
await test('paused mobile engine does not start network work',async()=>{const h=setup({mobile:true});h.engine.qyyInit().paused=true;let calls=0;h.client.listAll=async()=>{calls++;return[]};const r=await h.engine.startSync(false,{full:true});assert(r.paused);assert.equal(calls,0);});
await test('late response after unload cannot write local file',async()=>{const h=setup();h.remotePut('a.md','remote');const orig=h.engine.downloader.downloadByFsId;h.engine.downloader.downloadByFsId=async id=>{const b=await orig(id);h.engine.qyyInit().closed=true;return b;};assert(!(await h.engine.startSync(false,{full:true})).success);assert(!h.files.has('a.md'));});
await test('manifest write failure is not reported as success',async()=>{const h=setup();h.adapter.write=async()=>{throw Error('disk full')};assert(!(await h.engine.startSync(false,{full:true})).success);});
await test('write requests are never blindly retried',async()=>{let calls=0;const l=load({request:async()=>{calls++;throw Error('network gone') }});await assert.rejects(new l.BaiduClient({}).requestWithRetry({url:'https://example.invalid/?method=create',method:'POST'}));assert.equal(calls,1);});
await test('timed-out request blocks overlap until the real request settles',async()=>{
 let finish,calls=0;const l=load({request:()=>{calls++;return new Promise(r=>finish=r);},timeoutFn:(fn,ms)=>{if(ms===15000){queueMicrotask(fn);return 0;}return setTimeout(fn,ms);}});
 const c=new l.BaiduClient({});await assert.rejects(c.requestWithRetry({url:'https://example.invalid/list'}),/超时/);assert.equal(c.qyyTimedOut.size,1);await assert.rejects(c.requestWithRetry({url:'https://example.invalid/list'}),/尚未结束/);assert.equal(calls,1);finish({status:200,json:{errno:0}});await sleep(0);assert.equal(c.qyyTimedOut.size,0);
});
await test('configuration edit without vault event gets a follow-up',async()=>{const h=setup();await h.baseline('.obsidian/app.json','old');const original=h.client.listAll;let once=true;h.client.listAll=async()=>{const r=await original();if(once){once=false;h.put('.obsidian/app.json','new');}return r;};assert((await h.engine.startSync(false,{full:true})).success);assert.equal(h.remote.get('.obsidian/app.json').bytes.toString(),'new');});
await test('encryption roundtrip remains compatible',async()=>{const l=load({mobile:true});const b=ab('中文笔记与图片二进制\0'),enc=await l.encryptData(b,'test-password'),dec=await l.decryptData(enc,'test-password');assert.deepEqual(Buffer.from(dec),Buffer.from(b));});
console.log(`PASS ${passed} engine checks`);process.exit(0);
})().catch(e=>{console.error(e);process.exitCode=1});
