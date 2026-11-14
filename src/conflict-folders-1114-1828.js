// Chinese, portable conflict-folder workflow owned by 文件夹笔记助手_QYY.
const qyyHash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
const qyyBytes=s=>new TextEncoder().encode(s).buffer;
const qyyText=b=>new TextDecoder('utf-8',{fatal:true}).decode(b);
const qyySafe=p=>typeof p==='string'&&p&&!p.startsWith('/')&&!p.includes('\\')&&!p.split('/').some(x=>!x||x==='.'||x==='..');
const qyyParent=p=>p.includes('/')?p.slice(0,p.lastIndexOf('/')):'';
const qyyJoin=(a,b)=>a?a+'/'+b:b;
const qyyNorm=p=>{const result=[];for(const part of p.split('/')){if(!part||part==='.')continue;if(part==='..'){if(!result.length)return null;result.pop();}else result.push(part);}return result.join('/');};
const qyyRelative=(from,to)=>{const a=from.split('/').filter(Boolean),b=to.split('/').filter(Boolean);while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift();}return [...a.map(()=>'..'),...b].join('/');};
const qyyStamp=t=>{const d=new Date(t+8*3600000);return String(d.getUTCMonth()+1).padStart(2,'0')+String(d.getUTCDate()).padStart(2,'0')+'-'+String(d.getUTCHours()).padStart(2,'0')+String(d.getUTCMinutes()).padStart(2,'0');};
function qyyRelocateMarkdown(text,from,to,app){
 if(qyyParent(from)===qyyParent(to))return text;
 const protectedParts=[];let s=text.replace(/(^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\2[^\n]*(?:\n|$))|(`+)([^\n]*?)\3/gm,m=>{const key='\u0000QYY'+protectedParts.length+'\u0000';protectedParts.push(m);return key;});
 const convert=(raw,wiki=false)=>{
  const angle=raw.startsWith('<')&&raw.endsWith('>');let p=angle?raw.slice(1,-1):raw;
  if(!p||/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(p))return raw;
  const index=p.search(/[?#]/),suffix=index<0?'':p.slice(index);p=index<0?p:p.slice(0,index);
  let decoded;try{decoded=decodeURIComponent(p.replace(/\\([ ()])/g,'$1'));}catch{return raw;}
  let target;
  if(wiki){target=app.metadataCache?.getFirstLinkpathDest?.(decoded,from)?.path;if(!target){if(!decoded.includes('/'))return raw;target=qyyNorm(qyyJoin(qyyParent(from),decoded));}if(!target)return raw;if(!/\.md$/i.test(decoded))target=target.replace(/\.md$/i,'');return target+suffix;}
  target=qyyNorm(qyyJoin(qyyParent(from),decoded));if(!target)return raw;
  let result=qyyRelative(qyyParent(to),target)+suffix;if(/%[0-9a-f]{2}/i.test(p))result=result.split('/').map(x=>encodeURI(x)).join('/');
  return angle?'<'+result+'>':result.replace(/ /g,'%20');
 };
 s=s.replace(/(!?\[\[)([^\]\n]+)(\]\])/g,(m,open,body,close)=>{const i=body.indexOf('|'),link=i<0?body:body.slice(0,i),alias=i<0?'':body.slice(i);return open+convert(link,true)+alias+close;});
 s=s.replace(/(!?\[[^\]\n]*\]\()(<[^>\n]+>|(?:\\.|[^\s()]|\([^()]*\))+)(\s+(?:"[^"\n]*"|'[^'\n]*'))?(\))/g,(m,a,p,title,b)=>a+convert(p)+(title||'')+b);
 s=s.replace(/(^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*)(<[^>\n]+>|\S+)/gm,(m,a,p)=>a+convert(p));
 s=s.replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi,(m,a,p,b)=>a+convert(p)+b);
 return s.replace(/\u0000QYY(\d+)\u0000/g,(_,i)=>protectedParts[+i]);
}
class ConflictFolders {
 constructor(host){this.host=host;this.app=host.app;this.a=this.app.vault.adapter;this.records=new Map();this.serial=Promise.resolve();this.root=this.app.vault.configDir+'/qyy-private-backups/冲突事务';this.disposed=false;}
 block(folder){const core=this.host.native();if(!core)return;core.qyyConflictFolders||=new Set();core.qyyConflictFolders.add(folder);setTimeout(()=>core.qyyConflictFolders?.delete(folder),2000);}
 active(){return !this.disposed&&this.host.settings.enabled&&this.host.settings.conflictFolders;}
 enqueue(fn){const task=this.serial.then(fn);this.serial=task.catch(()=>{});return task;}
 async mkdir(p){let part='';for(const name of p.split('/')){part=qyyJoin(part,name);if(!await this.a.exists(part))try{await this.a.mkdir(part)}catch(e){if(!await this.a.exists(part))throw e;}}}
 async save(r){await this.mkdir(this.root);await this.a.write(this.root+'/'+r.id+'.json',JSON.stringify(r,null,2));this.records.set(r.id,r);}
 async load(){if(!await this.a.exists(this.root))return;for(const p of (await this.a.list(this.root)).files.filter(x=>x.endsWith('.json'))){const r=JSON.parse(await this.a.read(p));if(r.schema!==1||!/^冲突-[a-f0-9]{24}$/.test(r.id)||!qyySafe(r.path))throw Error('冲突处理记录异常，已停止自动处理');this.records.set(r.id,r);}}
 start(){this.ready=this.load().then(()=>this.attach());this.ready.catch(()=>console.error('QYY Folder Notes：冲突处理初始化失败，已停止自动处理，请检查同步状态。'));this.timer=setInterval(()=>this.attach(),3000);}
 attach(){const e=this.host.sync.native()?.engine;if(!e||this.engine===e)return;this.detach();this.engine=e;
  const resolve=(...args)=>this.enqueue(async()=>{await this.ready;return this.resolve(e,...args)});
  const before=item=>this.beforeDelete(e,item),phase=item=>item.action==='UPLOAD'&&[...this.records.values()].some(r=>r.oldPath===item.path&&r.status!=='pending');
  const moves=(local,remote)=>this.enqueue(async()=>{await this.ready;return this.applyMoves(e,local,remote)});
  const guard=path=>{let part='';for(const name of qyyParent(path).split('/').filter(Boolean)){part=qyyJoin(part,name);this.block(part);}};
  e.qyyResolveConflict=resolve;e.qyyBeforeConflictDelete=before;e.qyyConflictBackup=phase;e.qyyApplyRemoteMoves=moves;e.qyyGuardFolderCreation=guard;
  this.restore=()=>{for(const [key,value]of [['qyyResolveConflict',resolve],['qyyBeforeConflictDelete',before],['qyyConflictBackup',phase],['qyyApplyRemoteMoves',moves],['qyyGuardFolderCreation',guard]])if(e[key]===value)delete e[key];};
 }
 detach(){this.restore?.();this.restore=null;this.engine=null;}
 async resolve(e,item,localBytes,remoteBytes){
  if(!this.active())throw Error('笔记发生冲突；请开启“冲突笔记整理为文件夹”后继续');
  const localHash=await qyyHash(localBytes),remoteHash=await qyyHash(remoteBytes),id='冲突-'+(await qyyHash(qyyBytes(item.path+'\n'+[localHash,remoteHash].sort().join('\n')))).slice(0,24);
  let r=this.records.get(id);const stat=await this.a.stat(item.path);
  if(!stat||stat.mtime!==item.local.mtime||stat.size!==item.local.size)throw Error('笔记正在变化，稍后重新处理冲突');
  const local=await e.qyyVersion(item.path,stat,localBytes),remote=e.qyyRemoteVersion(item.path,item.remote);
  const trusted=local.trusted&&remote?.trusted&&remote.sha256===remoteHash&&Number.isFinite(remote.modifiedAt)&&Number.isFinite(remote.uncertainty);
  let winner=r?.choice;
  if(!winner&&trusted&&Math.abs(local.modifiedAt-remote.modifiedAt)>Math.max(2000,local.uncertainty+remote.uncertainty))winner=local.modifiedAt>remote.modifiedAt?'local':'remote';
  if(!r){r={schema:1,id,path:item.path,createdAt:Date.now(),status:'pending',local,remote:remote||null,localHash,remoteHash};await this.mkdir(this.root);await this.a.writeBinary(this.root+'/'+id+'-本地.bin',localBytes);await this.a.writeBinary(this.root+'/'+id+'-云端.bin',remoteBytes);await this.save(r);}
  if(!winner){e.qyyInit().waitingConflicts||={};e.qyyInit().waitingConflicts[item.path]=true;delete e.qyyInit().outbox[item.path];await e.qyyPersist();if(e.qyyInit().notifySync===true&&!this.notified?.has(id)){this.notified||=new Set();this.notified.add(id);new Notice('有一篇笔记的修改时间无法可靠比较。请在文件夹笔记助手中“处理待确认冲突”，选择主版本。',10000);}throw Error('冲突已保留双方原文，等待选择主版本：'+item.path);}
  if(e.qyyInit().waitingConflicts)delete e.qyyInit().waitingConflicts[item.path];
  const latestBytes=winner==='local'?localBytes:remoteBytes,olderBytes=winner==='local'?remoteBytes:localBytes,latestVersion=winner==='local'?local:remote,olderVersion=winner==='local'?remote:local;
  const name=item.path.split('/').pop().replace(/\.md$/i,''),parent=qyyParent(item.path),alreadyFolderNote=parent.split('/').pop()===name;
  let folder=alreadyFolderNote?parent:qyyJoin(parent,name);
  if(!r.mainPath&&!alreadyFolderNote&&await this.a.exists(folder))folder=qyyJoin(parent,name+'（冲突-'+id.slice(-8)+'）');
  folder=r.folder||folder;const mainPath=r.mainPath||qyyJoin(folder,folder.split('/').pop()+'.md');
  const oldPath=r.oldPath||qyyJoin(folder,'旧版-'+qyyStamp(olderVersion?.modifiedAt||r.createdAt)+'-'+(winner==='local'?remoteHash:localHash).slice(0,8)+'.md');
  const localMoved=qyyRelocateMarkdown(qyyText(localBytes),item.path,mainPath,this.app),latest=qyyRelocateMarkdown(qyyText(latestBytes),item.path,mainPath,this.app),older=qyyRelocateMarkdown(qyyText(olderBytes),item.path,oldPath,this.app);
  Object.assign(r,{choice:winner,status:'prepared',folder,mainPath,oldPath,latestHash:await qyyHash(qyyBytes(latest)),olderHash:await qyyHash(qyyBytes(older)),remoteBaseline:item.remote});await this.save(r);
  this.block(folder);
  await this.mkdir(folder);e.qyyCheck();
  if(await this.a.exists(oldPath)){if(await qyyHash(await this.a.readBinary(oldPath))!==r.olderHash)throw Error('旧版文件已被编辑，已停止覆盖：'+oldPath);}else await this.app.vault.create(oldPath,older);
  if(item.path!==mainPath){
   if(await this.a.exists(mainPath))throw Error('主笔记目标位置已有文件，已保留双方并停止移动');
   const file=this.app.vault.getAbstractFileByPath(item.path);if(!file)throw Error('笔记尚未载入，请稍后重试');
   await this.app.fileManager.renameFile(file,mainPath);
  }
  const current=this.app.vault.getAbstractFileByPath(mainPath);if(!current)throw Error('移动后的笔记尚未载入，请稍后重试');
  e.qyyCheck();await this.app.vault.process(current,text=>{if(text!==qyyText(localBytes)&&text!==localMoved&&text!==latest)throw Error('移动期间笔记发生变化，已保留当前内容');return latest;});
  await e.qyyRecordOrigins([[mainPath,{...(latestVersion||{}),sha256:r.latestHash}],[oldPath,{...(olderVersion||{}),sha256:r.olderHash}]]);
  e.manifest.set({...(item.manifest||{}),path:item.path,remotePath:item.remotePath,mtime:-1,size:localBytes.byteLength,remoteMtime:item.remote.mtime,remoteSize:item.remote.size,md5:item.remote.md5,fsId:item.remote.fsId,localHash:remoteHash});
  if(item.path!==mainPath)e.qyyInit().moves[item.path]={to:mainPath,sequence:e.qyyInit().sequence+1};
  for(const p of [mainPath,oldPath,item.path])e.markDirty(p);await e.manifest.save();await e.qyyPersist();r.status='created';await this.save(r);item.qyyFolderHandled=true;
  if(e.qyyInit().notifySync===true)new Notice('已将最新版本设为文件夹笔记，旧版本保存在文件夹内：'+folder);return true;
 }
 async recoverPrepared(e){
  let changed=false;
  for(const r of this.records.values()){
   if(r.status!=='prepared'||await this.a.exists(r.path)||!r.mainPath)continue;
   const local=await this.a.readBinary(this.root+'/'+r.id+'-本地.bin'),cloud=await this.a.readBinary(this.root+'/'+r.id+'-云端.bin');
   const latest=qyyRelocateMarkdown(qyyText(r.choice==='local'?local:cloud),r.path,r.mainPath,this.app),older=qyyRelocateMarkdown(qyyText(r.choice==='local'?cloud:local),r.path,r.oldPath,this.app),moved=qyyRelocateMarkdown(qyyText(local),r.path,r.mainPath,this.app);
   await this.mkdir(r.folder);
   if(!await this.a.exists(r.oldPath))await this.app.vault.create(r.oldPath,older);
   else if(await qyyHash(await this.a.readBinary(r.oldPath))!==r.olderHash)throw Error('中断恢复发现旧版副本已被编辑，已保留并停止');
   if(!await this.a.exists(r.mainPath))await this.app.vault.create(r.mainPath,latest);
   else{const f=this.app.vault.getAbstractFileByPath(r.mainPath);if(!f)throw Error('等待文件夹笔记载入后恢复');await this.app.vault.process(f,text=>{if(![latest,moved,qyyText(local)].includes(text))throw Error('中断恢复发现主笔记已被编辑，已保留并停止');return latest;});}
   const remote=r.remoteBaseline;e.manifest.set({path:r.path,remotePath:remote.remotePath,mtime:-1,size:local.byteLength,remoteMtime:remote.mtime,remoteSize:remote.size,md5:remote.md5,fsId:remote.fsId,localHash:r.remoteHash});
   await e.qyyRecordOrigins([[r.mainPath,{...(r.choice==='local'?r.local:r.remote),sha256:r.latestHash}],[r.oldPath,{...(r.choice==='local'?r.remote:r.local),sha256:r.olderHash}]]);
   e.qyyInit().moves[r.path]={to:r.mainPath,sequence:e.qyyInit().sequence+1};for(const p of [r.path,r.mainPath,r.oldPath]){e.markDirty(p);e.qyyInit().scope?.add(p);}
   r.status='created';await this.save(r);await e.manifest.save();await e.qyyPersist();changed=true;
  }return changed;
 }
 async beforeDelete(e,item){
  for(const r of this.records.values())if(r.path===item.path&&r.mainPath&&r.mainPath!==r.path){
   for(const p of [r.oldPath,r.mainPath]){const st=await this.a.stat(p),m=e.manifest.get(p);if(!st||!m||st.mtime!==m.mtime||st.size!==m.size||await qyyHash(await this.a.readBinary(p))!==m.localHash)throw Error('等待主笔记和旧版副本上传成功后再删除原路径');}
  }
 }
 async applyMoves(e,local,remote){
  if(!this.active())return false;let changed=await this.recoverPrepared(e);const q=e.qyyInit();
  for(const [from,movement]of Object.entries(q.remoteMoves)){
   const to=movement.to;if(remote.has(from)||!remote.has(to))continue;
   const baseline=e.manifest.get(from)||q.pendingMoves[from]?.baseline;if(!baseline)continue;
   if(!local.has(from)){if(q.pendingMoves[from]&&local.has(to)){const pending=q.pendingMoves[from],st=await this.a.stat(to),h=await qyyHash(await this.a.readBinary(to));e.manifest.set({...baseline,path:to,remotePath:remote.get(to).remotePath,...(!pending.wasChanged?{mtime:st.mtime,size:st.size,localHash:h}:{})});q.origins[to]={...pending.origin,sha256:h};e.manifest.delete(from);delete q.pendingMoves[from];changed=true;await e.manifest.save();await e.qyyPersist();}continue;}
   if(local.has(to)||await this.a.exists(to))throw Error('同步移动遇到同名笔记，已保留两份，请先处理：'+to);
   const file=this.app.vault.getAbstractFileByPath(from);if(!file)throw Error('等待待移动笔记载入');
   const st=await this.a.stat(from);if(!st||st.mtime!==local.get(from).mtime)throw Error('移动前笔记正在编辑');
   const beforeBytes=await this.a.readBinary(from),wasChanged=st.mtime!==baseline.mtime||st.size!==baseline.size||await qyyHash(beforeBytes)!==baseline.localHash,origin=await e.qyyVersion(from,st,beforeBytes);
   q.pendingMoves[from]={to,baseline,wasChanged,origin};await e.qyyPersist();await e.qyySnapshot(from,st);
   const folder=qyyParent(to);this.block(folder);
   await this.mkdir(folder);e.qyyCheck();await this.app.fileManager.renameFile(file,to);
   const after=await this.a.stat(to),movedHash=await qyyHash(await this.a.readBinary(to));
   e.manifest.set({...baseline,path:to,remotePath:remote.get(to).remotePath,...(!wasChanged?{mtime:after.mtime,size:after.size,localHash:movedHash}:{})});e.manifest.delete(from);local.delete(from);
   q.origins[to]={...origin,sha256:movedHash};changed=true;local.set(to,{path:to,mtime:after.mtime,size:after.size});q.scope?.add(to);delete q.pendingMoves[from];e.markDirty(to);await e.manifest.save();await e.qyyPersist();
  }return changed;
 }
 show(){const owner=this;class Pending extends Modal{onOpen(){this.contentEl.createEl('h2',{text:'处理待确认的同步冲突'});const rows=[...owner.records.values()].filter(r=>r.status==='pending');if(!rows.length)this.contentEl.createEl('p',{text:'当前没有待确认的冲突。'});for(const r of rows){this.contentEl.createEl('h3',{text:r.path});this.contentEl.createEl('p',{text:'修改时间缺失、相近或不可靠。请选择要作为文件夹主笔记的版本，另一份将保留为子笔记。'});new Setting(this.contentEl).setName('选择主版本').addButton(b=>b.setButtonText('本地版本').onClick(()=>choose('local'))).addButton(b=>b.setButtonText('云端版本').onClick(()=>choose('remote')));const choose=async choice=>{r.choice=choice;await owner.save(r);if(owner.engine?.qyyInit().waitingConflicts)delete owner.engine.qyyInit().waitingConflicts[r.path];owner.engine?.markDirty(r.path);this.close();await owner.engine?.startSync(false,{reason:'conflict-choice'});};new Setting(this.contentEl).setName('查看原文').addButton(b=>b.setButtonText('本地原文').onClick(()=>preview('本地'))).addButton(b=>b.setButtonText('云端原文').onClick(()=>preview('云端')));const preview=async label=>{const modal=new Modal(owner.app);modal.contentEl.createEl('h3',{text:label+'版本'});modal.contentEl.createEl('pre',{text:qyyText(await owner.a.readBinary(owner.root+'/'+r.id+'-'+label+'.bin'))});modal.open();};}}}new Pending(this.app).open();}
 dispose(){this.disposed=true;clearInterval(this.timer);this.detach();}
}

