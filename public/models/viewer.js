'use strict';
const $=id=>document.getElementById(id),catalogue=window.modelCatalogue;
const customEquipment=new Map();
const defaultViewAngle=.7+Math.PI/2;
let resource=null,objects=[],rawObjects=[],runtimeObjects=null,shape=null,poseShape=null,anim=null;
let cameraFraming=null,motionTrail=[];
let playing=false,angle=defaultViewAngle,elevation=.3,zoom=.62,last=0,weaponShapes=[],selectionTicket=0,rootTicket=0,channel=null,remainder=0,effect=null,effectState=null,locomotion=null,movementStep=0;
for(const group of [...new Set(catalogue.map(x=>x.group))])$('group').add(new Option(group));
const c=$('view'),renderer=new ES.Renderer(c);
$('palette').add(new Option('Automatic · model environment','auto'));
for(const [i,p]of mediaData.palettes.entries())$('palette').add(new Option(p.name,i));
$('palette').value='auto';
$('bank').add(new Option('No bound textures',''));
for(const p of mediaData.images.filter(p=>p.name.startsWith('simvol0/dba/')))$('bank').add(new Option(p.name,p.name));
function lightingWorld(){
 const time={day:0,dusk:1,night:2}[$('lighting').value];if(time===undefined)return null;
 const terrain=$('lightEnvironment').value==='auto'?ESWorld.terrainForModel(resource?.name||''):+$('lightEnvironment').value;
 return terrain*6+time*2+Number($('lightVisibility').value);
}
function lightingClass(){
 // Constructed mission captures establish HERC=7, flyer=6 and building=5.
 // Mounted weapons share their parent HERC's material bindings.
 return ESWorld.modelClass(resource.name)??(assembly()?7:resource.name.endsWith('/SKIMMER.DTS')?6:null);
}
function modelShading(){
 const world=lightingWorld(),kind=world===null?ESWorld.modelClass(resource.name):lightingClass();
 // The native waypoint HUD converts 1,000 world units to six metres.
 const distance=world===null?0:Math.round(Number($('lightDistance').value)*1000/6);
 return ESWorld.shading(renderer.pal,kind,world,distance,(resource.root_kind==='lod'?objects[0]?.radius:shape.radius)||0);
}
function updatePalette(redraw=true){
 const world=lightingWorld();$('missionLighting').hidden=world===null;$('lightingInfo').hidden=world===null;
 $('palette').options[0].text=world===null?'Automatic · model environment':'Automatic · mission lighting';
 renderer.setPalette($('palette').value==='auto'?(world===null?ESWorld.paletteForModel(resource?.name||''):ESWorld.paletteForWorld(world)):mediaData.palettes[+$('palette').value]);
 renderer.lights=$('lighting').value==='bright'?[{kind:0,intensity:255,position:[0,0,0],direction:[0,0,0]}]:[modelDefaultLight];
 if(redraw)draw();
}
$('palette').onchange=()=>updatePalette();
$('lighting').onchange=()=>{if(lightingWorld()!==null)$('palette').value='auto';updatePalette()};
for(const id of ['lightEnvironment','lightVisibility'])$(id).onchange=()=>{$('palette').value='auto';updatePalette()};
$('lightDistance').oninput=()=>{$('lightDistanceText').textContent=$('lightDistance').value+' m';draw()};
$('bank').onchange=updateBanks;$('loadout').onchange=()=>{renderEquipment();updateBanks()};
function thumbnailPath(r,index){return 'thumbnails/'+r.name+'/'+String(index).padStart(2,'0')+'.png'}
function buildingTitle(r,index){return r.root_labels[index].replace(/^\d+:\s*/,'')}
function list(){
 const q=$('find').value.toLowerCase(),g=$('group').value;
 const rows=catalogue.filter(r=>g==='All'||r.group===g).flatMap(r=>r.group==='Buildings'?r.roots.map((_,index)=>({r,index})): [{r,index:null}]).filter(({r,index})=>[r.name,r.display_name,...r.aliases,index===null?'':buildingTitle(r,index)].join(' ').toLowerCase().includes(q));
 const files=new Set(rows.map(({r})=>r.name)).size;
 $('count').textContent=rows.length===files?files+' model files':rows.length+' entries · '+files+' model files';
 $('models').replaceChildren(...rows.map(({r,index})=>{const tr=document.createElement('tr');tr.dataset.model=r.name;if(index!==null)tr.dataset.root=index;
 if(r===resource&&(index===null||index===+$('root').value))tr.className='selected';
 const preview=document.createElement('td'),img=document.createElement('img');img.src=thumbnailPath(r,index??0);img.loading='lazy';img.width=96;img.height=76;img.alt='';preview.append(img);
 const n=document.createElement('td'),title=document.createElement('strong'),name=document.createElement('small');title.textContent=index===null?r.display_name:buildingTitle(r,index);name.textContent=(index===null?'':r.display_name+' · ')+r.name;name.className='resource-name';n.append(title,name);
 const count=document.createElement('td');count.textContent=index===null?r.roots.length+' '+(r.root_kind==='lod'?'LODs':'variants'):'Variant '+index;tr.append(preview,n,count);tr.tabIndex=0;tr.onclick=()=>select(r,index??0);tr.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(r,index??0)}};return tr}));
}
function showVariants(){
 $('rootLabel').textContent=resource.root_kind==='lod'?'Distance detail':'Model variant';
 $('variants').replaceChildren(...objects.map((shape,i)=>{const button=document.createElement('button'),img=document.createElement('img'),label=document.createElement('span');button.type='button';button.className='variant'+(i===+$('root').value?' selected':'');button.setAttribute('aria-pressed',i===+$('root').value);img.src=thumbnailPath(resource,i);img.loading='lazy';img.width=128;img.height=100;img.alt='';label.textContent=resource.root_labels[i];button.append(img,label);button.onclick=()=>{$('root').value=i;chooseRoot()};return button}));
 $('variantsHint').textContent=resource.root_kind==='lod'?'Distance detail levels, from nearest to farthest. Thumbnails show the default pose and loadout.':'Separate objects in this resource. Click a thumbnail to inspect a variant.';
 $('variantsPanel').hidden=objects.length<2;
}
async function select(r,rootIndex=0){
 const ticket=++selectionTicket;stop();resource=r;$('name').textContent=r.display_name;$('resourceName').textContent=r.name;$('modelNotes').textContent=r.notes.join(' ');list();configureLoadout();
 const loaded=await EarthsiegeData.load(r.url);if(ticket!==selectionTicket)return;rawObjects=loaded;
 const mapping=modelRuntimeBindings[r.name];runtimeObjects=mapping?await EarthsiegeData.load(mapping.url):null;if(ticket!==selectionTicket)return;
 objects=$('runtime').checked&&runtimeObjects?runtimeObjects:rawObjects;$('runtime').parentElement.hidden=!mapping;
 $('root').replaceChildren(...objects.map((s,i)=>new Option(r.root_labels[i],i)));$('root').value=Math.max(0,Math.min(objects.length-1,rootIndex));zoom=.62;
 if(assembly()&&!weaponShapes.length)weaponShapes=await EarthsiegeData.load('data/simvol0/dts/MECHWPNS.json');
 if(ticket!==selectionTicket)return;await chooseRoot();if(ticket!==selectionTicket)return;
 list();history.replaceState(null,'','#'+encodeURIComponent(r.name));
}
async function chooseRoot(){
 const ticket=++rootTicket;stop();objects=$('runtime').checked&&runtimeObjects?runtimeObjects:rawObjects;shape=objects[+$('root').value];
 poseShape=shape.runtime_pose_source===undefined?shape:objects[shape.runtime_pose_source];$('name').textContent=resource.group==='Buildings'?buildingTitle(resource,+$('root').value):resource.display_name;cameraFraming=null;showVariants();list();updatePalette(false);
 anim=(poseShape.extras||[]).find(x=>x.type==='animation_list');effect=modelEffects[resource.name]?.[+$('root').value]||null;$('effectTick').parentElement.hidden=!effect;
 showCollisionField(shape.collision);configureDamage();$('movementControls').hidden=!movementDefinition();const rig=aimDefinition();$('aimControls').hidden=!rig;$('aimLayers').checked=false;$('aimYaw').value=$('aimPitch').value=0;$('aimYawText').textContent=$('aimPitchText').textContent='0°';
 if(rig){$('aimYaw').min=-rig.yaw_limit;$('aimYaw').max=rig.yaw_limit;$('aimPitch').min=rig.pitch_limits[0];$('aimPitch').max=rig.pitch_limits[1]}
 const roles={...movementDefinition()?.profile.sequences,...(rig?{torso_aim:rig.yaw_sequence,weapon_elevation:rig.pitch_sequence}:{})};
 $('sequence').replaceChildren(new Option('Default pose',-1),...(anim?.sequences||[]).map((s,i)=>new Option(`${i}${Object.entries(roles).some(([name,index])=>index===i)?' ('+Object.entries(roles).filter(([name,index])=>index===i).map(([name])=>name.replaceAll('_',' ')).join(', ')+')':''}: ${s.type==='cyclic_sequence'?'cyclic':'one-shot'} · ${s.frames.length} frames · ${s.tick} ms at ×1`,i)));
 $('sequence').value=anim?.sequences.length===1?0:-1;$('reverse').checked=false;$('transitions').hidden=!anim?.transitions.length;$('target').replaceChildren(...(anim?.sequences||[]).map((s,i)=>new Option('Sequence '+i,i)));$('transitionState').textContent='';$('targetFrame').value=-1;updateTargetFrame();$('rootMotionControls').hidden=!anim?.sequences.length;$('frame').value=0;$('blend').value=0;$('cell').value=-1;
 const cells=new Map();function scan(s){if(s.type==='cell_animation')cells.set(s.animation_sequence,Math.max(cells.get(s.animation_sequence)||0,s.parts.length));for(const p of s.parts||[])scan(p)}scan(shape);
 $('cellSequence').replaceChildren(new Option('All',-1),...[...cells].sort((a,b)=>a[0]-b[0]).map(([i,n])=>new Option(`${i}: frames 0–${n-1}`,i)));
 $('cell').max=Math.max(0,...cells.values())-1;
 $('bank').value=modelTextureBindings[resource.name]?.roots[+$('root').value]||'';
 $('metadata').textContent=JSON.stringify({root:shape.type,poseSource:shape.runtime_pose_source??'stored root',nodeBindings:modelRuntimeBindings[resource.name]?.maps[+$('root').value],cellFrameCounts:poseShape.cell_frame_counts,initialCells:ESMath.cells(poseShape),textureBinding:modelTextureBindings[resource.name],radius:shape.radius,transforms:anim?.defaults.length,relations:anim?.relations,sequences:anim?.sequences.map((s,i)=>({index:i,tick:s.tick,priority:s.priority,ground_movement:s.ground_movement,frames:s.frames,parts:s.part_list})),hierarchy:hierarchy(shape)},null,2);
 await updateBanks(false);if(ticket!==rootTicket)return;chooseSequence();showUsage();const url=new URL(location.href);url.searchParams.set('root',$('root').value);url.hash=encodeURIComponent(resource.name);history.replaceState(null,'',url);
}
function showUsage(){}
function hierarchy(s){return {type:s.type,id:s.id,transform:s.transform,points:s.points?.length,faces:s.polygons?.length,thresholds:s.distances,children:s.parts?.map(hierarchy)}}
function stop(){motionTrail=[];$('rootMotionState').textContent='';playing=false;channel=null;effectState=null;locomotion=null;$('movement').value='manual';$('movementState').textContent='';$('play').textContent='Play'}
function chooseSequence(){stop();const seq=anim?.sequences[+$('sequence').value];$('frame').max=Math.max(0,(seq?.frames.length||1)-1);$('frame').value=Math.min(+$('frame').value,+$('frame').max);updatePlaybackControls();draw()}
function updatePlaybackControls(){
 const frames=+$('frame').max>0,cellEffect=effect&&!anim?.sequences.length,moving=$('movement').value!=='manual';
 $('sequence').parentElement.hidden=(anim?.sequences.length||0)<=1;
 $('frame').parentElement.hidden=!frames;$('reverse').parentElement.hidden=!frames;
 $('blend').parentElement.hidden=!frames;
 $('play').hidden=!frames&&!cellEffect&&!moving;$('speed').parentElement.hidden=$('play').hidden;
 $('play').parentElement.hidden=$('play').hidden&&!frames;
}

function assembly(){return modelAssemblies.chassis[resource?.name.split('/').pop().split('.')[0]]}
function configureLoadout(){
 const model=assembly();$('assembly').hidden=!model;$('loadoutLabel').hidden=!model;
 if(!model)return;
 if(!customEquipment.has(resource.name))customEquipment.set(resource.name,model.presets[0].equipment.slice());
 $('loadout').replaceChildren(...model.presets.map((p,i)=>new Option(p.label,i?'preset:'+i:'stock')),new Option('Custom loadout','custom'),new Option('Bare chassis','bare'));
 $('loadout').value='stock';renderEquipment();
}
function equipment(){
 const model=assembly();if(!model)return [];
 const mode=$('loadout').value;
 if(mode==='bare'||mode==='raw')return model.mounts.map(()=>17);
 if(mode==='custom')return customEquipment.get(resource.name);
 const index=mode.startsWith('preset:')?Number(mode.slice(7)):0;return model.presets[index].equipment;
}
function renderEquipment(){
 const model=assembly();if(!model)return;
 const selected=equipment(),mode=$('loadout').value;
 $('mounts').replaceChildren(...model.mounts.slice().sort((a,b)=>a.equipment_slot-b.equipment_slot).map(mount=>{
  const tr=document.createElement('tr'),name=document.createElement('td'),choice=document.createElement('td'),select=document.createElement('select'),status=document.createElement('td');
  const index=mount.equipment_slot;name.textContent='Hardpoint '+(index+1);status.textContent=['Upper','Lower','Left','Right','Internal'][Math.min(4,mount.orientation)]+' · part '+mount.part;
  select.setAttribute('aria-label','Weapon at hardpoint '+(index+1));select.dataset.slot=index;
  // Mission presets can equip a weapon outside the human hangar list. Preserve
  // those captured values rather than silently substituting another weapon.
  const options=[...new Set([...mount.allowed,selected[index]])].filter(i=>i>=0);
  for(const id of options)select.add(new Option(id===17?'Empty':modelAssemblies.weapons[id].name+(mount.allowed.includes(id)?'':' (mission preset)'),id));
  select.value=selected[index];select.disabled=mode==='raw';select.onchange=()=>{const current=equipment().slice();current[index]=+select.value;customEquipment.set(resource.name,current);$('loadout').value='custom';renderEquipment();updateBanks()};
  choice.append(select);tr.append(name,choice,status);return tr;
 }));
 const preset=mode==='stock'?model.presets[0]:mode.startsWith('preset:')?model.presets[Number(mode.slice(7))]:null;
 $('loadoutSource').textContent=mode==='raw'?'Stored attachment placeholders are visible in this inspection mode. The game replaces them with weapons or empty nodes.':preset?'Source: '+preset.source+(preset.missions?.length?' · seen in '+preset.missions.length+' mission fixtures':''):mode==='bare'?'All equipment removed; attachment placeholders are hidden.':'Custom geometry preview; original mount orientations and offsets are retained.';
 $('loadoutRules').textContent=model.restricted?'Choices follow the original hangar’s hardpoint compatibility. Inventory and campaign unlocks are not applied. Missile guidance types share the same array model.':'Cybrid presets come from constructed mission actors. Custom choices are unrestricted geometry inspection; these chassis have no player hangar compatibility list.';
}
async function updateBanks(render=true){const active=assembly()&&!['bare','raw'].includes($('loadout').value);await renderer.setBank(active?[$('bank').value,modelAssemblies.bank]:$('bank').value);if(render)draw()}
function frameDefaultPose(){
 // Fit once to the selected model's intact default pose. Animated limbs,
 // missing parts and changing cell frames must never steer or zoom the camera.
 const built=ESAssembly.instances({shape,transforms:ES.pose(poseShape),assembly:assembly(),equipment:equipment(),weaponShapes,textureOffset:renderer.bankOffsets?.[modelAssemblies.bank]||0,cells:ESMath.cells(poseShape)});
 const points=renderer.geometry(built.instances).points;
 if(!points.length)return {centre:shape.centre||[0,0,0],radius:Math.max(1,shape.radius||1)};
 const bounds=[0,1,2].map(i=>points.reduce((b,p)=>[Math.min(b[0],p[i]),Math.max(b[1],p[i])],[Infinity,-Infinity]));
 return {centre:bounds.map(b=>(b[0]+b[1])/2),radius:Math.max(1,...bounds.map(b=>(b[1]-b[0])/2))};
}
function draw(){
 if(!shape)return;
 cameraFraming??=frameDefaultPose();
 const frame=+$('frame').value,transforms=displayTransforms(frame),model=$('loadout').value==='raw'?null:assembly();
 const heading=movementMatrix();
 const assembled=ESAssembly.instances({shape,transforms,assembly:model,equipment:equipment(),weaponShapes,textureOffset:renderer.bankOffsets?.[modelAssemblies.bank]||0,matrix:heading,cells:effectState?.cells||damagePreview()?.cells||ESMath.cells(poseShape),disabled:damagePreview()?.weapons_disabled});
 if(effectState?.done&&+$('cell').value<0)assembled.instances.length=0;
 const shading=modelShading();
 for(const instance of assembled.instances)instance.materialRamps=shading.ramps;
 if(lightingWorld()!==null){
  const environment=['Desert','Temperate','Ice','Urban'][Math.floor(lightingWorld()/6)];
  $('lightingInfo').textContent=`${environment} · ${$('lighting').selectedOptions[0].text} · ${$('lightVisibility').selectedOptions[0].text.toLowerCase()} visibility · ${shading.band===null?'palette only; no verified distance binding for this standalone resource':'shade band '+shading.band+' / 15'}${shading.culled?' · beyond original draw distance; retained for inspection':''}${$('palette').value==='auto'?'':' · manual palette override'}. Camera and model detail stay unchanged.`;
 }
 const geometry=renderer.geometry(assembled.instances,{cell:+$('cell').value,cellSequence:+$('cellSequence').value,lod:+$('lod').value,edges:$('edges').checked});
 if(lightingWorld()!==null&&+$('lightDistance').value>0&&geometry.textured)$('lightingInfo').textContent+=' Textures do not distance-fade in the original game.';
 if($('worldMotion').checked&&anim)addMovementGuides(geometry,heading);
 renderer.draw(geometry,{angle,elevation,zoom,...cameraFraming});$('frameText').textContent=frame+' / '+$('frame').max;
 $('info').textContent=`${geometry.faces} faces · ${geometry.textured} textured · ${geometry.billboards} billboards · ${assembled.mounted} mounted weapons${assembled.internal?' · '+assembled.internal+' internal weapons (no separate model)':''}${assembled.omitted?' · '+assembled.omitted+' attachments omitted at this LOD':''}${effectState?.done?' · effect complete':''}`;
}
// One reusable offscreen renderer produces static thumbnails. Ordinary browsing
// loads PNGs and never creates a WebGL context for every row or variant.
let thumbnailRenderer=null;
async function renderThumbnail(r,index){
 if(!thumbnailRenderer){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=200;thumbnailRenderer=new ES.Renderer(canvas)}
 const mapping=modelRuntimeBindings[r.name],roots=await EarthsiegeData.load(mapping?.url||r.url),shape=roots[index],pose=roots[shape.runtime_pose_source??index],assembly=modelAssemblies.chassis[r.name.split('/').pop().split('.')[0]];
 thumbnailRenderer.setPalette(ESWorld.paletteForModel(r.name));
 const bank=modelTextureBindings[r.name]?.roots[index];await thumbnailRenderer.setBank(assembly?[bank,modelAssemblies.bank]:bank);
 const weapons=assembly?await EarthsiegeData.load('data/simvol0/dts/MECHWPNS.json'):[];
 const built=ESAssembly.instances({shape,transforms:ES.pose(pose),assembly,equipment:assembly?.presets[0].equipment,weaponShapes:weapons,textureOffset:thumbnailRenderer.bankOffsets[modelAssemblies.bank]||0,cells:ESMath.cells(pose)});
 for(const instance of built.instances)instance.materialRamps=ESWorld.ramps(thumbnailRenderer.pal,ESWorld.modelClass(r.name));
 const geometry=thumbnailRenderer.geometry(built.instances);thumbnailRenderer.draw(geometry,{angle:defaultViewAngle,elevation:.3,zoom:.7});
 return thumbnailRenderer.canvas.toDataURL('image/png').split(',')[1];
}
$('root').onchange=chooseRoot;$('runtime').onchange=chooseRoot;$('sequence').onchange=chooseSequence;
for(const id of ['frame','cell','cellSequence','blend','lod','edges'])$(id).oninput=()=>{if(['frame','blend','cell','cellSequence'].includes(id))stop();draw()};
for(const id of ['find','group'])$(id).oninput=list;
$('effectTick').onchange=()=>{stop();draw()};

function updateTargetFrame(){
 const max=Math.max(0,(anim?.sequences[+$('target').value]?.frames.length||1)-1);
 $('targetFrame').max=max;$('targetFrame').value=Math.max(-1,Math.min(max,Math.trunc(Number($('targetFrame').value)||0)));
}
$('target').onchange=updateTargetFrame;
function movementMatrix(){
 if(!$('worldMotion').checked)return ES.matrix([0,0,locomotion?.angles[2]||0,0,0,0]);
 if(locomotion){const origin=movementDefinition().initial.position;return ES.matrix([...locomotion.angles,...locomotion.position.map((v,i)=>v-origin[i])])}
 return channel?ESMath.webgl(channel.rootMotion()):ES.ident();
}
function addMovementGuides(geometry,matrix){
 const p=matrix.slice(12,15),last=motionTrail.at(-1);
 if(!last||p.some((v,i)=>v!==last[i])){motionTrail.push(p);if(motionTrail.length>2000)motionTrail.shift()}
 const line=(a,b,colour)=>{for(const v of [a,b])geometry.lines.push(...v,0,0,colour,colour,0,0)};
 const size=Math.max(1,shape.radius||1000),extent=size*3;
 for(let i=-3;i<=3;i++){line([-extent,i*size,0],[extent,i*size,0],47);line([i*size,-extent,0],[i*size,extent,0],47)}
 for(let i=1;i<motionTrail.length;i++)line([motionTrail[i-1][0],motionTrail[i-1][1],1],[motionTrail[i][0],motionTrail[i][1],1],31);
 $('rootMotionState').textContent=`Displacement X ${Math.round(p[0])}, Y ${Math.round(p[1])}, Z ${Math.round(p[2])} world units · fixed camera`;
}
$('worldMotion').onchange=()=>{if($('worldMotion').checked&&anim&&+$('sequence').value>=0)ensureChannel();if(!$('worldMotion').checked)$('rootMotionState').textContent='';draw()};
$('fitMotion').onclick=()=>{
 if(!motionTrail.length)return;
 const base=frameDefaultPose(),bounds=[0,1,2].map(i=>motionTrail.reduce((b,p)=>[Math.min(b[0],p[i]),Math.max(b[1],p[i])],[0,0]));
 cameraFraming={centre:bounds.map((b,i)=>(b[0]+b[1])/2+base.centre[i]),radius:base.radius+Math.max(...bounds.map(b=>(b[1]-b[0])/2))};draw();
};

function ensureChannel(){
 if(channel)return;
 if(+$('sequence').value<0){$('sequence').value=0;chooseSequence()}
 const sequence=+$('sequence').value,frame=+$('frame').value,duration=anim.sequences[sequence].frames[frame][0];
 channel=new ESAnimationChannel(anim);
 channel.reset(sequence,frame,Math.min(Math.max(0,duration-1),Math.floor(+$('blend').value*duration/1024)));
 channel.setRate($('reverse').checked?-256:256);
}
function updateChannelControls(){
 $('sequence').value=channel.sequence;$('frame').max=anim.sequences[channel.sequence].frames.length-1;
 $('frame').value=channel.frame;$('blend').value=channel.fraction();updatePlaybackControls();
 if(channel.requestError)$('transitionState').textContent=channel.requestError;
 else if(channel.requested_sequence<0)$('transitionState').textContent='';
 else if(channel.flags&2)$('transitionState').textContent=`Blending ${channel.sequence} → ${channel.next_sequence}`;
 else if(channel.flags&1)$('transitionState').textContent=`Reached sequence ${channel.sequence}, frame ${channel.frame}`;
 else if(channel.exit_frame<0)$('transitionState').textContent='No authored route from this sequence';
 else $('transitionState').textContent=`Waiting for frame ${channel.exit_frame}`;
}
$('play').onclick=()=>{
 if($('movement').value!=='manual'){if(!locomotion||movementStep>=modelLocomotion.controls[$('movement').value].length)startMovement();playing=!playing;$('play').textContent=playing?'Stop':'Play';last=performance.now();remainder=0;return}
 if(effect&&!anim?.sequences.length){playing=!playing;$('play').textContent=playing?'Stop':'Play';if(playing){effectState={timer:effect.reset,cells:effect.frame_counts.map(()=>0),done:false};last=performance.now();remainder=0;draw()}return}
 if(!anim?.sequences.length)return;
 ensureChannel();playing=!playing;$('play').textContent=playing?'Stop':'Play';
 if(playing){last=performance.now();remainder=0}
};
$('reverse').onchange=()=>{if(channel)channel.setRate($('reverse').checked?-256:256);draw()};
$('queue').onclick=()=>{
 if(!anim)return;locomotion=null;$('movement').value='manual';$('movementState').textContent='';ensureChannel();updateTargetFrame();channel.request(+$('target').value,$('stopAtTarget').checked,+$('targetFrame').value);
 playing=true;$('play').textContent='Stop';last=performance.now();remainder=0;updateChannelControls();draw();
};
c.onpointerdown=e=>c.setPointerCapture(e.pointerId);
c.onpointermove=e=>{if(!c.hasPointerCapture(e.pointerId))return;angle-=e.movementX*.01;elevation=Math.max(-1.5,Math.min(1.5,elevation+e.movementY*.01));draw()};
c.onpointerup=e=>c.releasePointerCapture(e.pointerId);
c.onwheel=e=>{e.preventDefault();zoom=Math.max(.2,Math.min(5,zoom*Math.exp(e.deltaY*.001)));draw()};
function tick(t){
 if(playing&&effectState){
  const elapsed=Math.min(250,Math.max(0,t-last));last=t;remainder+=elapsed*Math.max(.05,Math.min(8,+$('speed').value||1));const ratio=+$('effectTick').value,step=ratio*100/256;
  while(remainder>=step&&!effectState.done){effectState=ESMath.effectStep(effect,effectState,ratio);remainder-=step}
  if(effectState.done){playing=false;$('play').textContent='Replay'}draw();
 }
 if(playing&&locomotion){
  const delta=Math.min(250,Math.max(0,t-last));last=t;remainder+=delta*Math.max(.05,Math.min(8,+$('speed').value||1));const inputs=modelLocomotion.controls[$('movement').value];
  while(remainder>=100&&movementStep<inputs.length){locomotion.advance(...inputs[movementStep++],256);remainder-=100}
  updateChannelControls();$('movementState').textContent=`Step ${movementStep}/${inputs.length} · throttle ${locomotion.throttle}/1024 · animation rate ${locomotion.animation_rate}/256`;if(movementStep===inputs.length){playing=false;$('play').textContent='Replay'}draw();
 }else if(playing&&channel){
  const delta=Math.min(250,Math.max(0,t-last));last=t;remainder+=delta*Math.max(.05,Math.min(8,+$('speed').value||1));const units=Math.floor(remainder);remainder-=units;
  channel.advance(units);updateChannelControls();
  const seq=anim.sequences[channel.sequence],terminal=channel.rate<0?channel.frame===0&&channel.elapsed===0:channel.frame===seq.frames.length-1;
  if(((channel.flags&1)&&(channel.options&1))||(seq.type==='sequence'&&terminal&&channel.exit_frame<0&&!(channel.flags&2))){playing=false;$('play').textContent='Play'}
  draw();
 }
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
function movementDefinition(){return modelLocomotion.models[resource?.name.split('/').pop().split('.')[0]]}
function startMovement(){
 const definition=movementDefinition();if(!definition||!anim)return;const initial=definition.initial;
 channel=new ESAnimationChannel(anim);modelLocomotion.fields.forEach((f,i)=>channel[f]=initial.channel[i]);channel.rate=initial.rate;channel.flags=initial.flags;channel.motion=initial.motion.slice();channel.accumulated={basis:initial.matrix.slice(0,9),type:initial.matrix[9],flags:0,translation:initial.matrix.slice(11)};
 locomotion=new ESLocomotion(definition.profile,channel,initial);movementStep=0;remainder=0;updateChannelControls();draw();
}
$('movement').onchange=()=>{const mode=$('movement').value;stop();$('movement').value=mode;if(mode!=='manual')startMovement();else chooseSequence()};
new ResizeObserver(()=>{const bounds=c.getBoundingClientRect();c.width=Math.round(bounds.width);c.height=Math.round(bounds.height);draw()}).observe(c);
select(catalogue.find(x=>x.name===decodeURIComponent(location.hash.slice(1)))||catalogue.find(x=>x.name.endsWith('/HERCULES.DTS'))||catalogue[0],Number(new URLSearchParams(location.search).get('root'))||0);

function aimDefinition(){return modelAimRigs[resource?.name.split('/').pop().split('.')[0]]}
function displayTransforms(frame){
 const rig=aimDefinition();
 if(!rig||!$('aimLayers').checked)return channel?channel.pose().map(t=>t?ESMath.webgl(t):null):ES.pose(poseShape,+$('sequence').value,frame,+$('blend').value);
 const layers=[];
 if(channel)layers.push(channel);
 else if(+$('sequence').value>=0){const body=new ESAnimationChannel(anim),sequence=+$('sequence').value;body.reset(sequence,frame,Math.floor(+$('blend').value*anim.sequences[sequence].frames[frame][0]/1024));layers.push(body)}
 for(const [sequence,angle]of [[rig.yaw_sequence,+$('aimYaw').value],[rig.pitch_sequence,+$('aimPitch').value]]){const layer=new ESAnimationChannel(anim);layer.setPhase(sequence,(angle&65535)>>2);layers.push(layer)}
 return ESAnimationChannel.hierarchy(anim,ESAnimationChannel.combine(layers,rig.priorities)).map(t=>t?ESMath.webgl(t):null);
}
for(const id of ['aimLayers','aimYaw','aimPitch'])$(id).oninput=()=>{$('aimYawText').textContent=(+$('aimYaw').value*360/65536).toFixed(1)+'°';$('aimPitchText').textContent=(+$('aimPitch').value*360/65536).toFixed(1)+'°';draw()};

function damageDefinition(){return modelDamagePreviews[resource?.name.split('/').pop().split('.')[0]]}
function damagePreview(){return damageDefinition()?.cases.find(c=>c.part===+$('damage').value&&c.kind===$('damageKind').value)}
function configureDamage(){
 const definition=damageDefinition();$('damageControls').hidden=!definition;
 const sections=(definition?.cases||[]).filter(c=>c.kind==='destroy');
 $('damage').replaceChildren(new Option('Intact',-1),...sections.map(c=>new Option(c.label,c.part)));$('damageState').textContent='';
}
for(const id of ['damage','damageKind'])$(id).onchange=()=>{
 const state=damagePreview();$('damageState').textContent=state?`${state.flags.dead?'Destroyed':state.flags.disabled?'Disabled':'Operational'} · ${state.detached.length} sections detached` : '';
 $('cell').value=-1;draw();
};
