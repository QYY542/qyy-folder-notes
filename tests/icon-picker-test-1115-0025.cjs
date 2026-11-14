const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const source=fs.readFileSync(path.join(__dirname,'../src/icon-picker-1115-0025.js'),'utf8');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(x=>x&&fs.existsSync(x));assert(chrome);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qyy-picker-1115-0025-'));
const catalogRows=Array.from({length:120},(_,i)=>[String.fromCodePoint(0x1f600+i),['Emoji '+i,['keyword']]]);
catalogRows[0][1][0]='escaped \\u{1F600}';
const fixtureSource='var Mt='+JSON.stringify(catalogRows).replace('😀',String.raw`\u{1F600}`).replace('Emoji 1',String.raw`Emoji \x31`)+';class Catalog{static getEmojis(){let o=new Map(Mt);return o;}};globalThis.unwantedExecution=true;';
const html=`<!doctype html><html><head><meta charset="utf-8"><title>pending</title><style>.iconic-search-results{height:260px}.setting-item-control{display:flex;flex-wrap:wrap}.iconic-invisible{visibility:hidden}.iconic-search-result{padding:0;box-sizing:border-box}</style></head><body><main class="workspace"></main><aside><div class="iconic-search-results" id="unrelated"></div></aside><script>
class FolderNotesHelper{async onload(){}onunload(){}async change(k,v){this.settings[k]=v}registerEvent(){}}
class HelperSettings{display(){}}const DEFAULTS={},Setting=class{};

class TextComponent{constructor(el){this.inputEl=document.createElement('input');el.append(this.inputEl);this.inputEl.value='';}onChange(fn){this.fn=fn;return this;}getValue(){return this.inputEl.value;}}
class SearchComponent extends TextComponent{}
let registryIds=[];
const nativeOnChange=SearchComponent.prototype.onChange;
function require(name){if(name!=='obsidian')throw Error(name);return {SearchComponent,getIconIds:()=>registryIds,getIcon:id=>id.startsWith('lucide-')?{}:null};}
class IconicSearch extends SearchComponent{
 constructor(el){super(el);this.iconMode=false;this.emojiMode=true;this.searchCallback=null;this.nativeCalls=0;this.onChange(()=>this.dispatchResults());}
 setModes(m){Object.assign(this,m);return this.dispatchResults();}
 dispatchResults(){this.nativeCalls++;if(this.searchCallback)this.searchCallback(this.getValue(),this.getValue()==='many'?Array.from({length:55},(_,i)=>['native-'+i,'result '+i,[],1]):this.getValue()?[['native-result','native',[],1]]:[]);return Promise.resolve();}
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
  await field.setModes({emojiMode:true,iconMode:true});check(received.length===24,'mixed candidates first page '+mobile);
  let bar=modal.querySelector('.qyy-icon-picker-pagination'),buttons=bar.querySelectorAll('button');
  check(buttons[0].disabled&&!buttons[1].disabled&&bar.textContent.includes('1 / 2'),'first page controls '+mobile);
  buttons[1].click();check(received.length===12&&received[0][0]==='lucide-folder'&&bar.textContent.includes('2 / 2'),'next page candidates '+mobile);
  check(buttons[1].disabled&&!buttons[0].disabled,'last page boundary '+mobile);
  control.firstElementChild.click();check(saved==='lucide-folder','second page native selection '+mobile);
  buttons[0].click();check(received.length===24&&bar.textContent.includes('1 / 2'),'previous page '+mobile);
  field.inputEl.value='research';field.fn();check(field.nativeCalls===1&&received[0][0]==='native-result'&&query==='research','typed search unchanged '+mobile);
  field.inputEl.value='many';field.fn();bar=modal.querySelector('.qyy-icon-picker-pagination');buttons=bar.querySelectorAll('button');buttons[1].click();buttons[1].click();check(received.length===7&&received[0][0]==='native-48'&&query==='many'&&bar.textContent.includes('3 / 3'),'all search results reachable '+mobile);
  check(parseFloat(getComputedStyle(buttons[1]).minHeight)===(mobile?44:32),'pagination touch size '+mobile);
  field.inputEl.value='';await field.setModes({emojiMode:false,iconMode:false});check(received.length===0,'both modes disabled stays empty '+mobile);
  await field.setModes({emojiMode:true,iconMode:false});
  const unrelated=new SearchComponent(document.querySelector('aside'));unrelated.onChange(()=>{});check(!Object.hasOwn(unrelated,'dispatchResults'),'other search components untouched '+mobile);unrelated.inputEl.remove();
  let clicks=0;control.firstElementChild.onclick=()=>clicks++;control.firstElementChild.click();check(clicks===1,'selection handler retained '+mobile);
  await h.change('iconPickerCompactEnabled',false);check(!modal.querySelector('.qyy-icon-picker-pagination'),'disabled removes pagination '+mobile);check(received.length===1&&received[0][0]==='📚','disabled restores original current-only results '+mobile);check(!grid.classList.contains('qyy-icon-picker-grid')&&!modal.querySelector('.qyy-icon-picker-hint'),'toggle restores UI '+mobile);
  await h.change('iconPickerCompactEnabled',true);check(received.length===24,'reenabling restores candidates '+mobile);check(grid.classList.contains('qyy-icon-picker-grid'),'toggle on '+mobile);
  modal.remove();await tick();check(h.iconPickerPresentation.candidates.fields.size===0&&!Object.hasOwn(field,'dispatchResults'),'closed search releases wrapper '+mobile);check(h.iconPickerPresentation.grids.size===0,'closed picker releases references '+mobile);
  h.onunload();check(SearchComponent.prototype.onChange===nativeOnChange&&!Object.hasOwn(SearchComponent.prototype,'onChange'),'unload restores prototype '+mobile);check(!document.querySelector('[data-qyy-icon-picker]')&&h.iconPickerPresentation.documents.size===0,'unload cleanup '+mobile);
 }

 for(const mobile of [false,true]){
  document.body.classList.toggle('is-mobile',mobile);registryIds=Array.from({length:80},(_,i)=>'lucide-symbol-'+i);
  let reads=0,currentSource=${JSON.stringify(fixtureSource)},delay=null;
  const h=new FolderNotesHelper();h.settings={enabled:true,iconPickerCompactEnabled:true};h.app={workspace:{containerEl:document.querySelector('main'),iterateAllLeaves(){},on(){return {}; }},plugins:{plugins:{iconic:{manifest:{dir:'.obsidian/plugins/iconic',version:'1.1.11'},settings:{maxSearchResults:100}}}},vault:{adapter:{read:async path=>{check(path==='.obsidian/plugins/iconic/main.js','reads only installed Iconic metadata '+mobile);reads++;if(delay)await delay;return currentSource;}}}};await h.onload();
  const modal=document.createElement('div');modal.className='modal-container';modal.innerHTML='<div class="iconic-icon-picker"><div class="iconic-search-results"><div class="setting-item-control"></div></div></div>';document.body.append(modal);
  const field=new IconicSearch(modal.firstElementChild);let records=[],query='';field.searchCallback=(q,r)=>{query=q;records=r;};
  await field.setModes({emojiMode:true,iconMode:true});let entry=h.iconPickerPresentation.candidates.fields.get(field),library=await h.iconPickerPresentation.candidates.catalogue();
  check(entry.records.length===200&&library.complete,'full installed catalogues combined '+mobile);
  check(new Set(entry.records.map(r=>r[0])).size===200,'catalogue has no duplicate ids '+mobile);
  check(entry.bar.textContent.includes('1 / 9')&&records.length===24,'large catalogue paginated '+mobile);
  for(let i=0;i<8;i++)entry.next.click();check(records.length===8&&entry.next.disabled,'last catalogue page reachable '+mobile);
  check(library.emojis.length===120&&library.icons.length===80,'emoji and line icon sources reused '+mobile);
  h.twemoji={active:()=>true,atlas:{},keyFor:id=>id===library.emojis[0][0]?null:'covered'};await field.dispatchResults();check(entry.records.length===199&&entry.records.filter(r=>r[0].startsWith('lucide-')).length===80,'unsupported local emoji hidden without hiding line icons '+mobile);h.twemoji.active=()=>false;await field.dispatchResults();check(entry.records.length===200,'system emoji mode restores full catalogue '+mobile);delete h.twemoji;
  check(!globalThis.unwantedExecution&&library.emojis.some(r=>r[1]==='Emoji 1'),'data parsed without executing source '+mobile);
  await field.setModes({emojiMode:false,iconMode:true});check(entry.records.length===80&&reads===1,'mode change reuses cached metadata '+mobile);
  field.inputEl.value='research';await field.dispatchResults();check(query==='research'&&records[0][0]==='native-result','full library keeps native search '+mobile);
  h.app.plugins.plugins.iconic.manifest.version='2';currentSource='not supported';field.inputEl.value='';await field.setModes({emojiMode:true,iconMode:false});check(entry.records.length===24&&entry.bar.textContent.includes('完整表情目录不可用'),'unsupported format shows explicit fallback '+mobile);
  h.app.plugins.plugins.iconic.manifest.version='3';currentSource=${JSON.stringify(fixtureSource)};let resolve;delay=new Promise(r=>resolve=r);const pending=field.dispatchResults();field.inputEl.value='research';await field.dispatchResults();resolve();await pending;check(query==='research'&&records[0][0]==='native-result','late catalogue does not overwrite a new query '+mobile);delay=null;
  h.onunload();check(!modal.querySelector('.qyy-icon-picker-pagination')&&h.iconPickerPresentation.candidates.libraryPromise===null,'unload releases catalogue and controls '+mobile);modal.remove();registryIds=[];
 }
 document.title='QYY_RESULT_'+btoa(JSON.stringify({passed}));
})().catch(e=>document.title='QYY_RESULT_'+btoa(JSON.stringify({error:String(e)})));
</script></body></html>`;
try{const file=path.join(tmp,'picker-1115-0025.html');fs.writeFileSync(file,html);const r=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--user-data-dir='+path.join(tmp,'profile'),'--dump-dom','--virtual-time-budget=3000','file://'+file],{encoding:'utf8',timeout:45000,maxBuffer:1024*1024});assert.equal(r.status,0);const m=r.stdout.match(/<title>QYY_RESULT_([A-Za-z0-9+/=]+)<\/title>/);assert(m,'browser test did not finish');const result=JSON.parse(Buffer.from(m[1],'base64').toString());assert(!result.error,result.error);for(const n of result.passed)console.log('PASS',n);console.log('PASS '+result.passed.length+' picker desktop/mobile checks');}finally{fs.rmSync(tmp,{recursive:true,force:true});}
