const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
let source=fs.readFileSync(path.join(root,'src/paste-repair-1114-2349.js'),'utf8');
const end=source.lastIndexOf('})();');
source=source.slice(0,end)+'window.qyyPasteTestApi={normalizeMarkdown,mathHtml,convertPaste,codeContext,PasteAssistant};\n'+source.slice(end);
const cases=fs.readFileSync(path.join(__dirname,'paste-cases-1114-2349.js'),'utf8');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(x=>x&&fs.existsSync(x));
assert(chrome,'Chrome/Chromium required');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qyy-paste-1114-2349-'));
const fixture=String.raw`<!doctype html><html><head><meta charset="utf-8"><title>pending</title><style>
body{font-size:16px;--table-line-height:1.3}.cm-editor{line-height:1.5}.ped-lh-relaxed .markdown-source-view.mod-cm6 .cm-content{line-height:1.85}
.cm-table-widget td{line-height:var(--table-line-height)}.cm-formatting-quote{display:inline}
</style></head><body class="ped-wys ped-lh-relaxed"><div class="workspace"><div class="markdown-source-view mod-cm6 is-live-preview"><div class="cm-table-widget"><table><tr><td><div class="cm-editor"><div class="cm-scroller"><div class="cm-content"><div class="cm-line" id="cell">sample</div></div></div></div></td></tr></table></div><div id="quote" class="HyperMD-quote" style="text-indent:-14px;padding-inline-start:14px"><span class="cm-formatting-quote">&gt; </span><span>quote</span></div></div></div>
<script>
window.onerror=(message)=>document.title="QYY_RESULT_"+btoa(JSON.stringify({error:String(message)}));
class FolderNotesHelper {async onload(){}onunload(){}async change(k,v){this.settings[k]=v}registerEvent(){}}
class HelperSettings {display(){}}
const DEFAULTS={},Setting=class{};
const require=name=>{if(name!=='obsidian')throw Error('desktop dependency');return {htmlToMarkdown:html=>new DOMParser().parseFromString(html,'text/html').body.textContent};};
${source}
${cases.replace(/<\/script/gi, "<\\/script")}
(async()=>{
 const passed=[];const check=(value,name)=>{if(!value)throw Error(name);passed.push(name);};
 for(const mobile of [false,true]) {
  document.body.classList.toggle('is-mobile',mobile);document.body.classList.toggle('is-phone',mobile);
  const original=(html,plain)=>html?new DOMParser().parseFromString(html,'text/html').body.textContent:null,plan=(ed,md)=>md;
  const power={pastedMarkdown:original,plannedPaste:plan},events={};
  const h=new FolderNotesHelper();h.settings={enabled:true,pasteRepairEnabled:true,stableEditingEnabled:true};
  h.app={plugins:{plugins:{powereditor:power}},workspace:{containerEl:document.querySelector('.workspace'),iterateAllLeaves(){},on:(name,fn)=>{events[name]=fn;return {};}}};
  await h.onload();
  const raw='\\\\[x=1\\\\]',prose={getCursor:()=>({line:0,ch:0}),getRange:()=>'',getLine:()=>''};
  check(power.pastedMarkdown('',raw)==='$$\nx=1\n$$','delimiter repair '+mobile);
  const code={...prose,getRange:()=>String.fromCharCode(96).repeat(3)+'latex\n'};
  const md=power.pastedMarkdown('<b>x</b>',raw);check(power.plannedPaste(code,md)===raw,'code target remains raw '+mobile);
  const cell=document.getElementById('cell'),quote=document.getElementById('quote');
  check(getComputedStyle(cell).lineHeight==='20.8px','table line height '+mobile);
  const before=getComputedStyle(quote).paddingInlineStart;quote.classList.add('cm-active');quote.style.textIndent='-20px';quote.style.paddingInlineStart='20px';
  check(getComputedStyle(quote).paddingInlineStart===before&&getComputedStyle(quote).textIndent==='0px','quote stable when activated '+mobile);
  check(getComputedStyle(quote.firstElementChild).display==='none','quote marker hidden '+mobile);
  const view=quote.parentElement;view.classList.remove('is-live-preview');check(getComputedStyle(quote.firstElementChild).display!=='none','source mode retains quote '+mobile);view.classList.add('is-live-preview');
  await h.change('stableEditingEnabled',false);check(getComputedStyle(cell).lineHeight==='29.6px','style toggle restores original '+mobile);
  await h.change('pasteRepairEnabled',false);check(power.pastedMarkdown('',raw)===null,'repair toggle off '+mobile);await h.change('pasteRepairEnabled',true);
  delete h.app.plugins.plugins.powereditor;h.pasteAssistant.refresh();check(power.pastedMarkdown===original,'Power disable restores method '+mobile);
  let inserted;const ed={...prose,replaceSelection:s=>inserted=s};const event={defaultPrevented:false,clipboardData:{files:[],getData:type=>type==='text/plain'?raw:''},preventDefault(){this.defaultPrevented=true}};
  events['editor-paste'](event,ed);check(event.defaultPrevented&&inserted.includes('$$'),'native paste fallback '+mobile);
  inserted=null;events['editor-paste']({...event,defaultPrevented:false,clipboardData:{files:[{}]}},ed);check(inserted===null,'image attachment untouched '+mobile);
  events['editor-paste']({...event,defaultPrevented:true},ed);check(inserted===null,'already handled paste untouched '+mobile);
  h.app.plugins.plugins.powereditor=power;h.pasteAssistant.refresh();check(power.pastedMarkdown!==original,'Power re-enable adapts '+mobile);
  await h.change('enabled',false);check(power.pastedMarkdown('',raw)===null,'master switch '+mobile);
  h.onunload();check(power.pastedMarkdown===original&&power.plannedPaste===plan,'unload restores both methods '+mobile);
  check(!document.querySelector('[data-qyy-paste]')&&!document.body.classList.contains('qyy-stable-editing'),'unload removes presentation '+mobile);
 }
 document.title='QYY_RESULT_'+btoa(JSON.stringify({core:window.qyyCoreCount,passed}));
})().catch(error=>document.title='QYY_RESULT_'+btoa(JSON.stringify({error:String(error)})));
</script></body></html>`;
try {
 const file=path.join(tmp,'paste-1114-2349.html');fs.writeFileSync(file,fixture);
 const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--user-data-dir='+path.join(tmp,'profile'),'--dump-dom','--virtual-time-budget=3000','file://'+file],{encoding:'utf8',timeout:45000,maxBuffer:3*1024*1024});
 assert.equal(run.status,0,run.stderr.slice(-1000));const match=run.stdout.match(/<title>QYY_RESULT_([A-Za-z0-9+/=]+)<\/title>/);assert(match,'browser checks did not finish');
 const result=JSON.parse(Buffer.from(match[1],'base64').toString());assert(!result.error,result.error);assert.equal(result.core,53);
 for(const name of result.passed)console.log('PASS',name);
 console.log('PASS '+(result.core+result.passed.length)+' paste normalization and desktop/mobile browser checks');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
