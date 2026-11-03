import fs from 'node:fs/promises';import path from 'node:path';import vm from 'node:vm';import {fileURLToPath} from 'node:url';import {parse} from 'parse5';import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist'),files=[];
async function scan(dir){for(const f of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isSymbolicLink())throw Error('Symlink in site: '+p);if(f.isDirectory())await scan(p);else files.push(p)}}await scan(root);
const errors=[],documents=new Map();
const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const walk=(n,fn)=>{fn(n);for(const c of n.childNodes||[])walk(c,fn)};
for(const file of files.filter(f=>f.endsWith('.html'))){const html=await fs.readFile(file,'utf8'),doc=parse(html),ids=new Set(),links=[];walk(doc,n=>{const id=attr(n,'id');if(id){if(ids.has(id))errors.push('Duplicate ID '+id+' in '+file);ids.add(id)}for(const key of ['href','src']){const value=attr(n,key);if(value)links.push(value)}});documents.set(file,{ids,links});if(!html.includes('name="viewport"'))errors.push('Missing viewport: '+file);if(/\b(?:TFX Traced|Darker Discovered)\b/.test(html)&&!file.endsWith('/about/index.html'))errors.push('Copied identity in '+file);}
for(const [file,{links}]of documents){for(const ref of links){if(/^(?:https?:|data:|mailto:|javascript:)/.test(ref))continue;const url=new URL(ref,'https://site.test/'+path.relative(root,file).split(path.sep).join('/'));let target=path.join(root,decodeURIComponent(url.pathname));try{const stat=await fs.stat(target);if(stat.isDirectory())target=path.join(target,'index.html');await fs.access(target);}catch{errors.push(path.relative(root,file)+' → missing '+ref);continue}if(url.hash&&documents.has(target)&&!['models/index.html','missions/index.html'].some(x=>target.endsWith(x))&&!documents.get(target).ids.has(decodeURIComponent(url.hash.slice(1))))errors.push('Missing anchor '+ref+' in '+file);}}
for(const file of files){const n=path.relative(root,file),size=(await fs.stat(file)).size;if(size>20*1024*1024)errors.push('Unexpected large file '+n);if(/\.(exe|com|iso|cue|bin|rom|zip|7z|vol|tap|hmp|dts|dgs|dba)$/i.test(n))errors.push('Non-display asset '+n)}
const data={};data.window=data;vm.createContext(data);
for(const file of ['models/catalogue.js','models/runtime-bindings.js','models/texture-bindings.js','media/data.js','missions/catalogue.js','missions/launches/catalogue.js'])vm.runInContext(await fs.readFile(path.join(root,file),'utf8'),data);
const exists=async rel=>{try{await fs.access(path.join(root,rel))}catch{errors.push('Missing dynamic data '+rel)}};
for(const model of data.modelCatalogue){await exists('models/'+model.url+'.js');for(let i=0;i<model.roots.length;i++)await exists('models/thumbnails/'+model.name+'/'+String(i).padStart(2,'0')+'.png');const binding=data.modelRuntimeBindings[model.name];if(binding)await exists('models/'+binding.url+'.js');}
for(const bank of data.mediaData.images)await exists('media/pixels/'+bank.name+'.json.js');
for(const mission of data.missionCatalogue){await exists('missions/'+mission.url+'.js');if(!data.missionLaunchCatalogue.some(x=>x.name===mission.name))errors.push('No launch for '+mission.name);}
for(const launch of data.missionLaunchCatalogue)await exists('missions/'+launch.url+'.js');
for(const sky of JSON.parse(await fs.readFile(path.join(root,'worlds/data.json'),'utf8'))){await exists('worlds/environment/'+sky.animation.atlas);await exists('worlds/environment/'+sky.panorama.image)}
for(const song of JSON.parse(await fs.readFile(path.join(root,'audio/catalogue.json'),'utf8')))await exists('audio/'+song.file);
// Tour targets are executable state, not ordinary document anchors.
for(const [file,{links}]of documents){for(const ref of links){if(!ref.includes('#')||/^https?:/.test(ref))continue;const url=new URL(ref,'https://site.test/'+path.relative(root,file));if(url.pathname.endsWith('/models/')){const name=decodeURIComponent(url.hash.slice(1)),model=data.modelCatalogue.find(x=>x.name===name),index=Number(url.searchParams.get('root')||0);if(!model||!model.roots[index])errors.push('Invalid model tour '+ref)}if(url.pathname.endsWith('/missions/')){const name=url.hash.slice(1);if(!data.missionCatalogue.some(x=>x.name===name))errors.push('Invalid mission tour '+ref)}}}
// Article controls use dynamic images; every illustration is covered by hashes.
for(const row of JSON.parse(await fs.readFile(path.join(root,'graphics/manifest.json'),'utf8')).files){
 const rel='graphics/'+row.file;await exists(rel);
 try{const bytes=await fs.readFile(path.join(root,rel));if(bytes.length!==row.bytes||createHash('sha256').update(bytes).digest('hex')!==row.sha256)errors.push('Graphics asset hash mismatch '+rel)}catch{}
}
const progress=JSON.parse(await fs.readFile(path.join(root,'graphics/model-progress.json'),'utf8'));
for(const stage of progress.stages)await exists('graphics/'+stage.image);
if(progress.stages[0].calls!==0||progress.stages.at(-1).calls!==progress.total_calls)errors.push('Incomplete model progress capture');
for(const layer of ['bands','ground','panorama','clouds'])await exists('graphics/world-'+layer+'.png');
for(const row of JSON.parse(await fs.readFile(path.join(root,'combat/manifest.json'),'utf8')).files){
 const rel='combat/'+row.file;await exists(rel);
 try{const bytes=await fs.readFile(path.join(root,rel));if(bytes.length!==row.bytes||createHash('sha256').update(bytes).digest('hex')!==row.sha256)errors.push('Combat asset hash mismatch '+rel)}catch{}
}
for(const row of JSON.parse(await fs.readFile(path.join(root,'combat/damage-states.json'),'utf8')).states)await exists('combat/'+row.image);
for(const row of JSON.parse(await fs.readFile(path.join(root,'articles/manifest.json'),'utf8')).files){
 const rel='articles/'+row.file;await exists(rel);
 try{const bytes=await fs.readFile(path.join(root,rel));if(bytes.length!==row.bytes||createHash('sha256').update(bytes).digest('hex')!==row.sha256)errors.push('Article asset hash mismatch '+rel)}catch{}
}
for(const row of JSON.parse(await fs.readFile(path.join(root,'articles/radar.json'),'utf8')).frames){for(const kind of ['original','native','difference','full'])await exists('articles/radar-'+row.key+'-'+kind+'.png');}
for(const row of JSON.parse(await fs.readFile(path.join(root,'articles/launches.json'),'utf8')).variations)await exists('articles/mission-'+row.seed+'.svg');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Checked ${documents.size} HTML pages, ${files.length} files, all model/texture/mission/sky dependencies and tour targets.`);
