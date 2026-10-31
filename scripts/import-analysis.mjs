// Refresh the public display snapshot; no install archives, executables or ROMs.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parse,serialize,serializeOuter} from 'parse5';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.resolve(process.argv[2]||path.join(root,'../earthsiege-reverse/analysis'));
const output=path.join(root,'public');const provenance=[];
async function read(name){const bytes=await fs.readFile(path.join(source,name));provenance.push({source:name,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});return bytes;}
async function put(name,bytes){const dest=path.join(output,name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}
async function copy(name){await put(name,await read(name));}
async function tree(dir,accept){for(const f of await fs.readdir(path.join(source,dir),{withFileTypes:true})){const rel=dir+'/'+f.name;if(f.isDirectory())await tree(rel,accept);else if(accept(rel))await copy(rel);}}
const data={};data.window=data;vm.createContext(data);
async function dataset(file){vm.runInContext(String(await read(file)),data);}
for(const file of ['models/catalogue.js','models/runtime-bindings.js','media/data.js','missions/catalogue.js','missions/launches/catalogue.js','worlds/environment/browser.js','music/data.js'])await dataset(file);
for(const file of ['browser_data.js','model_cosine.js','model_math.js','animation_channel.js','model_atan.js','locomotion.js','model_lighting.js','world-data.js','world_materials.js','model_renderer.js','model_assembly.js',
'models/catalogue.js','models/locomotion/viewer.js','models/damage/viewer.js','models/material-shading.js','models/lighting.js','models/texture-bindings.js','models/assemblies.js','models/runtime-bindings.js','models/effects.js','models/collision_viewer.js','models/viewer.js',
'missions/viewer.js','missions/launch-view.js','missions/scene.js'])await copy(file);
for(const dir of ['models/data','models/runtime'])await tree(dir,x=>x.endsWith('.json.js'));
await tree('models/thumbnails',x=>x.endsWith('.png'));
const media={palettes:data.mediaData.palettes,images:data.mediaData.images.filter(x=>x.name.startsWith('simvol0/dba/'))};
await put('media/data.js','window.mediaData='+JSON.stringify(media)+';\n');
for(const bank of media.images)await copy('media/pixels/'+bank.name+'.json.js');
const missions=data.missionCatalogue.filter(r=>!r.error),launches=[];
for(const mission of missions){
 const all=data.missionLaunchCatalogue.filter(r=>r.name===mission.name);
 const preferred=all.find(r=>r.tables.some(t=>t.endsWith('BTLSET_0.DAT')))||all.find(r=>r.context==='single')||all[0];
 if(!preferred)throw Error('Missing launch '+mission.name);
 const cases=all.filter(r=>r.context===preferred.context);launches.push(...cases);
 await copy('missions/'+mission.url+'.js');
 for(const entry of cases)await copy('missions/'+entry.url+'.js');
}
await put('missions/catalogue.js','window.missionCatalogue='+JSON.stringify(missions)+';\nwindow.zoneCatalogue='+JSON.stringify(data.zoneCatalogue)+';\n');
await put('missions/launches/catalogue.js','var missionLaunchCatalogue='+JSON.stringify(launches)+';\n');
await put('missions/constructed/catalogue.js','var constructedCatalogue=[];\n');
const skies=[];
for(const w of data.environmentBrowser){
 const motion=w.animations.find(a=>a.view==='level'&&a.mode==='complete');if(!motion)throw Error('Missing sky '+w.world);
 await copy('worlds/environment/'+motion.atlas);await copy('worlds/environment/'+w.panorama.image);
 const {checks,...animation}=motion;skies.push({world:w.world,animation,panorama:w.panorama});
}
await put('worlds/data.json',JSON.stringify(skies));
// Keep compact metadata for reproducible, identical-time audio excerpts.
const audio=[];
for(const [name,title,role,start,seconds]of [['INTRO2','The introduction','The introduction and campaign victory use this score.',8,24],['BATTLE1A','Out on patrol','One of three A/B pairs selected for missions.',8,24],['BATTLE1B','An encounter','The paired encounter variant. The game fades out before restarting the new piece.',8,24]]){
 const song=data.musicCatalogue.find(s=>s.name.endsWith('/'+name+'.HMP'));
 for(const device of ['opl2','opl3']){const r=song.native_renders[device];audio.push({name,title,role,device,start,seconds,source:r.flac_url,gain:r.gain,file:name.toLowerCase()+'-'+device+'.flac'});}
}
await put('audio/catalogue.json',JSON.stringify(audio,null,2)+'\n');
// Adapt the existing inspection UI without requiring the research tree online.
const walk=(node,fn)=>{fn(node);for(const child of [...node.childNodes||[]])walk(child,fn)};
const attr=(node,key)=>node.attrs?.find(a=>a.name===key)?.value;
const set=(node,key,value='')=>{node.attrs??=[];node.attrs=node.attrs.filter(a=>a.name!==key);node.attrs.push({name:key,value})};
const remove=node=>{node.parentNode.childNodes=node.parentNode.childNodes.filter(n=>n!==node)};
for(const page of ['models','missions']){
 const doc=parse(String(await read(page+'/index.html')));let main;const ids=new Map();const scripts=[];
 walk(doc,n=>{if(n.tagName==='main')main=n;if(attr(n,'id'))ids.set(attr(n,'id'),n);if(n.tagName==='script')scripts.push(n)});
 const hide=id=>{const n=ids.get(id);if(n)set(n,'data-private','')};
 walk(main,n=>{if(n.tagName==='a'&&/\.\.\/\.\.\/docs\//.test(attr(n,'href')||''))set(n,'href','https://lostengines.com/earthsiege/'+attr(n,'href').replace('../../',''))});
 if(page==='models'){
  for(const id of ['metadata','usage','collisionField','resourceName','modelNotes'])hide(id);
  for(const id of ['runtime','cellSequence','cell','blend','palette','bank','lod','effectTick']){const n=ids.get(id);set(n.parentNode,'data-private','')}
  for(const id of ['metadata'])set(ids.get(id).parentNode,'data-private','');
  walk(main,n=>{if(n.tagName==='details'&&serialize(n).includes('Rendering, animation &amp; preview scope'))set(n,'data-private','')});
  set(ids.get('assembly'),'open','');
 }else{
  for(const id of ['fixture','launchContext','zone','conditional','textstate','terrain','ground','referenced','constructed','groups','areas'])set(ids.get(id).parentNode,'data-private','');
  for(const id of ['compilationHelp','launchDetails','records','triggers','spatialinfo'])hide(id);
  for(const id of ['records','triggers'])set(ids.get(id).parentNode,'data-private','');
  for(const id of ['controllers'])if(ids.has(id))remove(ids.get(id).parentNode);
  for(const id of ['groups','areas'])ids.get(id).attrs=ids.get(id).attrs.filter(a=>a.name!=='checked');
  walk(main,n=>{if(n.tagName==='p'&&serialize(n).includes('Alternative points with the same ID'))set(n,'data-private','')});
  walk(main,n=>{if(n.tagName==='summary'&&serialize(n).includes('Briefing, objectives'))n.childNodes=[{nodeName:'#text',value:'Mission briefing & objectives',parentNode:n}]});
 }
 const rejected=page==='models'?['usage.js']:['campaign.js','campaign_viewer.js','controllers.js','controllers_viewer.js'];
 walk(main,n=>{if(n.tagName==='p'&&serialize(n).includes('Debrief text here'))n.childNodes=[{nodeName:'#text',value:'Original briefing and objectives, evaluated with the selected launch state.',parentNode:n}];if(attr(n,'class')?.includes('toolbar')){const children=(n.childNodes||[]).filter(c=>c.tagName);if(children.length&&children.every(c=>attr(c,'data-private')!==undefined))set(n,'data-private','')}});
 const html=serialize(main)+'\n'+scripts.filter(s=>!rejected.includes(attr(s,'src'))).map(serializeOuter).join('\n');
 await fs.writeFile(path.join(root,'src',page+'.html'),html);
}
// Small public adaptations are isolated from the recovered rendering logic.
let models=await fs.readFile(path.join(output,'models/viewer.js'),'utf8');
models=models.replace(/function showUsage\(\)\{[\s\S]*?\nfunction hierarchy/,'function showUsage(){}\nfunction hierarchy');
models=models.replace(",new Option('Stored mesh (show mount placeholders)','raw')", '');
models=models.replace('elevation=.3,zoom=1,','elevation=.3,zoom=.62,').replace('));zoom=1;', '));zoom=.62;');
await put('models/viewer.js',models);
let missionJS=await fs.readFile(path.join(output,'missions/viewer.js'),'utf8');
missionJS=missionJS.replace('(mission?.text?.sections||[]).map(',"(mission?.text?.sections||[]).filter(s=>s.tag!=='DEB:').map(");
missionJS=missionJS.replace("||rows[0],{context:", "||rows.find(r=>r.name==='B0_C3_2A')||rows[0],{context:");
missionJS=missionJS.replace("if(q.has('focus')&&","if(!q.has('focus')&&current.name==='B0_C3_2A')q.set('focus','building:4');if(q.has('focus')&&");
// Preserve original text decoding; phrase-debug details are hidden by public CSS.
await put('missions/viewer.js',missionJS);
console.log(`Imported ${data.modelCatalogue.length} model files, ${missions.length} missions / ${launches.length} launches, ${skies.length} skies.`);

// Supporting notes travel with the site; the complete research archive is separate.
const notes=['MODEL_BROWSER','SCENERY_BROWSER','MISSION_LAUNCH','CHEATS_AND_DEVELOPMENT','COMMAND_LINE','BUILD_EVIDENCE','PIXEL_FIDELITY','MUSIC','LIGHTING','RENDERING','COLLISION'];
await fs.mkdir(path.join(root,'content/research'),{recursive:true});
for(const name of notes){const bytes=await read('../docs/'+name+'.md');await fs.writeFile(path.join(root,'content/research',name+'.md'),bytes);}
await put('data-provenance.json',JSON.stringify({description:'Display snapshot from the Earthsiege research archive. See content/research-sources.md and MAINTAINING.md.',modelFiles:data.modelCatalogue.length,missions:missions.length,launchExamples:launches.length,worlds:skies.length,files:provenance.sort((a,b)=>a.source.localeCompare(b.source))},null,2)+'\n');

// Surface a synchronous WebGL failure as clearly as a failed data request.
let transport=await fs.readFile(path.join(output,'browser_data.js'),'utf8');
transport += "\naddEventListener('error',event=>{if(event.error&&/WebGL2/.test(event.error.message)){EarthsiegeData.report(new Error('The 3D viewer needs WebGL 2. Try a browser with hardware graphics enabled.'));document.getElementById('load-error').setAttribute('role','alert')}});\n";
await put('browser_data.js',transport);

// Normalize one trailing-space-only source difference for a clean public diff.
const rendererFile=path.join(output,'model_renderer.js');
await fs.writeFile(rendererFile,(await fs.readFile(rendererFile,'utf8')).replace(/[ \t]+$/gm,''));
