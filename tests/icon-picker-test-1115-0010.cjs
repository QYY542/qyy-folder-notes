const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const source=fs.readFileSync(path.join(__dirname,'../src/icon-picker-1115-0010.js'),'utf8');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(x=>x&&fs.existsSync(x));assert(chrome);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qyy-picker-1115-0010-'));
const html=`<!doctype html><html><head><meta charset="utf-8"><title>pending</title><style>.iconic-search-results{height:260px}.setting-item-control{display:flex;flex-wrap:wrap}.iconic-invisible{visibility:hidden}.iconic-search-result{padding:0;box-sizing:border-box}</style></head><body><main class="workspace"></main><aside><div class="iconic-search-results" id="unrelated"></div></aside><script>
class FolderNotesHelper{async onload(){}onunload(){}async change(k,v){this.settings[k]=v}registerEvent(){}}
class HelperSettings{display(){}}const DEFAULTS={},Setting=class{};

class TextComponent{constructor(el){this.inputEl=document.createElement('input');el.append(this.inputEl);this.inputEl.value='';}onChange(fn){this.fn=fn;return this;}getValue(){return this.inputEl.value;}}
class SearchComponent extends TextComponent{}
const nativeOnChange=SearchComponent.prototype.onChange;
function require(name){if(name!=='obsidian')throw Error(name);return {SearchComponent,getIcon:id=>id.startsWith('lucide-')?{}:null};}
class IconicSearch extends SearchComponent{
 constructor(el){super(el);this.iconMode=false;this.emojiMode=true;this.searchCallback=null;this.nativeCalls=0;this.onChange(()=>this.dispatchResults());}
 setModes(m){Object.assign(this,m);return this.dispatchResults();}
 dispatchResults(){this.nativeCalls++;if(this.searchCallback)this.searchCallback(this.getValue(),this.getValue()?[['native-result','native',[],1]]:[]);return Promise.resolve();}
}
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
  
  const field=new IconicSearch(modal.querySelector('.iconic-icon-picker'));let received=[],query=null,saved=null;
  field.searchCallback=(q,results)=>{query=q;received=results;if(!q)received=[['📚','current',[],0]];control.replaceChildren();for(const [id,label]of received){const b=document.createElement('button');b.className='iconic-search-result';b.textContent=label;b.onclick=()=>saved=id;control.append(b);}};
  await field.dispatchResults();
  check(received.length===24,'blank search shows 24 emoji candidates '+mobile);
  check(field.getValue()===''&&query===' ','input is untouched '+mobile);
  control.children[3].click();check(saved==='📚','native selection uses original emoji id '+mobile);
  await field.setModes({emojiMode:false,iconMode:true});check(received.length===12&&received.every(r=>r[0].startsWith('lucide-')),'icon-only candidates '+mobile);
  await field.setModes({emojiMode:true,iconMode:true});check(received.length===36,'mixed candidates '+mobile);
  field.inputEl.value='research';field.fn();check(field.nativeCalls===1&&received[0][0]==='native-result'&&query==='research','typed search unchanged '+mobile);
  field.inputEl.value='';await field.setModes({emojiMode:false,iconMode:false});check(received.length===0,'both modes disabled stays empty '+mobile);
  await field.setModes({emojiMode:true,iconMode:false});
  const unrelated=new SearchComponent(document.querySelector('aside'));unrelated.onChange(()=>{});check(!Object.hasOwn(unrelated,'dispatchResults'),'other search components untouched '+mobile);unrelated.inputEl.remove();
  let clicks=0;control.firstElementChild.onclick=()=>clicks++;control.firstElementChild.click();check(clicks===1,'selection handler retained '+mobile);
  await h.change('iconPickerCompactEnabled',false);check(received.length===1&&received[0][0]==='📚','disabled restores original current-only results '+mobile);check(!grid.classList.contains('qyy-icon-picker-grid')&&!modal.querySelector('.qyy-icon-picker-hint'),'toggle restores UI '+mobile);
  await h.change('iconPickerCompactEnabled',true);check(received.length===24,'reenabling restores candidates '+mobile);check(grid.classList.contains('qyy-icon-picker-grid'),'toggle on '+mobile);
  modal.remove();await tick();check(h.iconPickerPresentation.candidates.fields.size===0&&!Object.hasOwn(field,'dispatchResults'),'closed search releases wrapper '+mobile);check(h.iconPickerPresentation.grids.size===0,'closed picker releases references '+mobile);
  h.onunload();check(SearchComponent.prototype.onChange===nativeOnChange&&!Object.hasOwn(SearchComponent.prototype,'onChange'),'unload restores prototype '+mobile);check(!document.querySelector('[data-qyy-icon-picker]')&&h.iconPickerPresentation.documents.size===0,'unload cleanup '+mobile);
 }
 document.title='QYY_RESULT_'+btoa(JSON.stringify({passed}));
})().catch(e=>document.title='QYY_RESULT_'+btoa(JSON.stringify({error:String(e)})));
</script></body></html>`;
try{const file=path.join(tmp,'picker-1115-0010.html');fs.writeFileSync(file,html);const r=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--user-data-dir='+path.join(tmp,'profile'),'--dump-dom','--virtual-time-budget=3000','file://'+file],{encoding:'utf8',timeout:45000,maxBuffer:1024*1024});assert.equal(r.status,0);const m=r.stdout.match(/<title>QYY_RESULT_([A-Za-z0-9+/=]+)<\/title>/);assert(m,'browser test did not finish');const result=JSON.parse(Buffer.from(m[1],'base64').toString());assert(!result.error,result.error);for(const n of result.passed)console.log('PASS',n);console.log('PASS '+result.passed.length+' picker desktop/mobile checks');}finally{fs.rmSync(tmp,{recursive:true,force:true});}
