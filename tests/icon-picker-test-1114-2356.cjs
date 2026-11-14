const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const source=fs.readFileSync(path.join(__dirname,'../src/icon-picker-1114-2356.js'),'utf8');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(x=>x&&fs.existsSync(x));assert(chrome);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qyy-picker-1114-2356-'));
const html=`<!doctype html><html><head><meta charset="utf-8"><title>pending</title><style>.iconic-search-results{height:260px}.setting-item-control{display:flex;flex-wrap:wrap}.iconic-invisible{visibility:hidden}.iconic-search-result{padding:0;box-sizing:border-box}</style></head><body><main class="workspace"></main><aside><div class="iconic-search-results" id="unrelated"></div></aside><script>
class FolderNotesHelper{async onload(){}onunload(){}async change(k,v){this.settings[k]=v}registerEvent(){}}
class HelperSettings{display(){}}const DEFAULTS={},Setting=class{};
${source}
(async()=>{
 const passed=[],check=(ok,name)=>{if(!ok)throw Error(name);passed.push(name);},tick=()=>new Promise(r=>setTimeout(r,20));
 for(const mobile of [false,true]){
  document.body.classList.toggle('is-mobile',mobile);
  const h=new FolderNotesHelper();h.settings={enabled:true,iconPickerCompactEnabled:true};h.app={workspace:{containerEl:document.querySelector('main'),iterateAllLeaves(){},on(){return {};}}};await h.onload();
  const modal=document.createElement('div');modal.className='modal-container';modal.innerHTML='<div class="iconic-icon-picker"><div class="iconic-search-results"><div class="setting-item-control"><div class="iconic-search-result iconic-invisible">placeholder</div></div></div></div>';document.body.append(modal);await tick();
  const grid=modal.querySelector('.iconic-search-results'),control=grid.firstElementChild,hint=modal.querySelector('.qyy-icon-picker-hint');
  check(getComputedStyle(grid).display==='none'&&!hint.hidden,'empty search shows hint '+mobile);
  control.innerHTML='<button class="iconic-search-result"><span>test</span></button>';await tick();
  check(getComputedStyle(grid).display!=='none'&&hint.hidden,'results replace empty hint '+mobile);
  check(grid.getBoundingClientRect().height<120,'sparse grid shrinks '+mobile);
  check(parseFloat(getComputedStyle(control.firstElementChild).minHeight)===(mobile?44:36),'touch target size '+mobile);
  check(getComputedStyle(document.getElementById('unrelated')).height==='260px','unrelated layout untouched '+mobile);
  let clicks=0;control.firstElementChild.onclick=()=>clicks++;control.firstElementChild.click();check(clicks===1,'selection handler retained '+mobile);
  await h.change('iconPickerCompactEnabled',false);check(!grid.classList.contains('qyy-icon-picker-grid')&&!modal.querySelector('.qyy-icon-picker-hint'),'toggle restores UI '+mobile);
  await h.change('iconPickerCompactEnabled',true);check(grid.classList.contains('qyy-icon-picker-grid'),'toggle on '+mobile);
  modal.remove();await tick();check(h.iconPickerPresentation.grids.size===0,'closed picker releases references '+mobile);
  h.onunload();check(!document.querySelector('[data-qyy-icon-picker]')&&h.iconPickerPresentation.documents.size===0,'unload cleanup '+mobile);
 }
 document.title='QYY_RESULT_'+btoa(JSON.stringify({passed}));
})().catch(e=>document.title='QYY_RESULT_'+btoa(JSON.stringify({error:String(e)})));
</script></body></html>`;
try{const file=path.join(tmp,'picker-1114-2356.html');fs.writeFileSync(file,html);const r=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--user-data-dir='+path.join(tmp,'profile'),'--dump-dom','--virtual-time-budget=3000','file://'+file],{encoding:'utf8',timeout:45000,maxBuffer:1024*1024});assert.equal(r.status,0);const m=r.stdout.match(/<title>QYY_RESULT_([A-Za-z0-9+/=]+)<\/title>/);assert(m,'browser test did not finish');const result=JSON.parse(Buffer.from(m[1],'base64').toString());assert(!result.error,result.error);for(const n of result.passed)console.log('PASS',n);console.log('PASS '+result.passed.length+' picker desktop/mobile checks');}finally{fs.rmSync(tmp,{recursive:true,force:true});}
