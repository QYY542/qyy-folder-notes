// Reproducible, offline build: no host-vault paths or network access.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),cfg=JSON.parse(fs.readFileSync(path.join(root,'project-1114-1738.json'),'utf8'));
const text='// QYY public candidate. See LICENSE and THIRD-PARTY-NOTICES.\n'+cfg.sources.map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('\n');
new vm.Script(text,{filename:'main.js'});
fs.writeFileSync(path.join(root,'main.js'),text);
for(const [source,target]of Object.entries(cfg.assets))fs.copyFileSync(path.join(root,source),path.join(root,target));
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(cfg.manifest,null,2)+'\n');
fs.writeFileSync(path.join(root,'versions.json'),JSON.stringify(cfg.versions || {[cfg.manifest.version]:cfg.manifest.minAppVersion},null,2)+'\n');
console.log('Built '+cfg.manifest.id+' '+cfg.manifest.version);
