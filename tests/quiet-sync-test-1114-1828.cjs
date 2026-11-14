const fs=require('fs'),assert=require('assert/strict'),{webcrypto}=require('crypto');
const A=require('path').resolve(__dirname,'..')+'/',notices=[];class Base{};
const ob=new Proxy({Platform:{isMobile:true,isDesktopApp:false},Plugin:Base,PluginSettingTab:Base,Modal:Base,Notice:class{constructor(s){notices.push(s)}}},{get:(o,k)=>o[k]||Base});
const mod={exports:{}};
const {SyncAssistant}=new Function('require','module','exports','window','crypto','document',fs.readFileSync(A+'main.js','utf8')+'\nreturn {SyncAssistant};')(n=>{assert.equal(n,'obsidian');return ob},mod,mod.exports,{crypto:webcrypto},webcrypto,{visibilityState:'visible'});
let count=0;async function test(n,f){notices.length=0;await f();count++;console.log('PASS',n)}
function setup(outcome='ok'){
 const records=[],engine={qyyInit(){},async startSync(){if(outcome==='throw')throw Error('offline');if(outcome==='timeout')return new Promise(()=>{});return {success:outcome==='ok',stats:{errors:outcome==='ok'?0:1}}}};
 const app={loadLocalStorage:()=>null,saveLocalStorage:(k,v)=>records.push(v),plugins:{plugins:{'qyy-baidu-sync':{engine,settings:{accessToken:'fake'}}}}};
 const s=new SyncAssistant({app,manifest:{id:'test'},settings:{enabled:true,syncEnabled:true,foregroundSyncEnabled:true,maxWaitSeconds:.01}});s.saveOpenNotes=async()=>{if(outcome==='save-fail')throw Error('disk')};return {s,records};
}
(async()=>{
for(const outcome of ['ok','failure','throw','timeout','save-fail'])for(const manual of [false,true])await test(`${manual?'manual':'automatic'} foreground ${outcome}`,async()=>{const {s,records}=setup(outcome);await s.runForeground(manual);assert.equal(notices.length>0,manual);assert.equal(records.at(-1).status,({ok:'complete',failure:'failed',throw:'failed',timeout:'timeout','save-fail':'local-save-failed'})[outcome]);});
await test('automatic missing authorization is quiet',async()=>{const {s}=setup();s.native().settings.accessToken='';await s.runForeground(false);assert.equal(notices.length,0);await s.runForeground(true);assert.equal(notices.length,1)});
await test('public mobile module has no desktop exit interception',async()=>{assert.equal(SyncAssistant.prototype.runExit,undefined);assert.equal(SyncAssistant.prototype.attachDesktop,undefined)});
await test('previous failure does not popup on startup',async()=>{const {s}=setup();s.lastAttempt={success:false};s.refresh=()=>{};s.host.registerDomEvent=()=>{};s.start();clearTimeout(s.startupTimer);assert.equal(notices.length,0)});
console.log('PASS '+count+' quiet automatic and manual notification checks');
})().catch(e=>{console.error(e);process.exitCode=1});
