/* Constructed inspection scenes. Placement comes from original-loader captures;
 * visibility here deliberately includes waiting groups, without running AI. */
'use strict';
const sceneCanvas=$('scene'),sceneOverlay=$('sceneOverlay'),sceneContext=sceneOverlay.getContext('2d'),sceneRenderer=new ES.Renderer(sceneCanvas);
const sceneResources=new Map();
let sceneGeometry=null,sceneKey='',sceneLoadingKey='',scenePending=null,sceneTicket=0,sceneContextKey='',sceneMission='';
let sceneAngle=.7,sceneElevation=.55,sceneZoom=.75,sceneFrame=null,sceneWholeFrame=null,sceneWorld=null,sceneSummary='',sceneSelection=null;
function sceneLoad(url){if(!sceneResources.has(url))sceneResources.set(url,EarthsiegeData.load(url));return sceneResources.get(url)}
function sceneBuilding(actor,script){
 const definition=worldInspectionData.buildings[actor.type];if(!definition)return null;
 const source=actor.source??actor.index,groups=script?.tables.groups||[],group=actor.group??groups.findLastIndex(g=>g.kind===2&&g.members.includes(source));
 const side=groups[group]?.mode??0,condition=script?.tables.bases[source]?.initial_value??100,player=groups[0];
 const objective=player?.target_kind===0?groups[player.target]?.kind===2&&groups[player.target].members.includes(source):player?.target_kind===3&&player.target===source;
 const affiliation=side===(player?.mode??0)?'Friendly':'Enemy';
 const wreck=condition===0,stem=wreck?'BHULKS':definition.channels?(side?'BASES_AE':'BASES_AN'):(side?'BASES_E':'BASES');
 return {name:'simvol0/'+(definition.channels&&!wreck?'dts/':'dgs/')+stem+(definition.channels&&!wreck?'.DTS':'.DGS'),root:wreck?definition.wreck:definition.root,label:definition.name+(wreck?' wreck':''),condition,side,affiliation,objective:!!objective};
}
async function sceneModel(name,index=0){
 const record=modelCatalogue.find(r=>r.name===name);if(!record)return null;
 const binding=modelRuntimeBindings[name],roots=await sceneLoad('../models/'+(binding?.url||record.url)),shape=roots[index];
 if(!shape)return null;
 const pose=roots[shape.runtime_pose_source??index];
 return {shape,transforms:ES.pose(pose),cells:ESMath.cells(pose),bank:modelTextureBindings[name]?.roots[index]};
}
function sceneBounds(points){
 const bounds=[0,1,2].map(i=>points.reduce((b,p)=>[Math.min(b[0],p[i]),Math.max(b[1],p[i])],[Infinity,-Infinity]));
 return {centre:bounds.map(b=>(b[0]+b[1])/2),radius:Math.max(1000,...bounds.map(b=>(b[1]-b[0])/2))};
}
async function buildScene(snapshot){
 const {zone,kind,script,world,showActors,ground,worldIndex}=snapshot;
 const roots=await sceneLoad('../models/data/simvol0/dgs/'+kind+'.json');
 const instances=zone.items.filter(i=>roots[i.shape]).map(i=>({shape:roots[i.shape],matrix:ES.matrix([...i.angles,...i.position]),nativeClass:0}));
 const actorModels=[],missing=[],banks=new Set(['simvol0/dba/BASETEX.DBA']);
 if(showActors&&world){
  for(const [family,actors]of Object.entries(world.actors))for(const actor of actors){
   if(!Array.isArray(actor.position)){missing.push(family+' '+actor.source+': unresolved placement');continue}
   const building=family==='ground'?sceneBuilding(actor,script):null,name=building?.name||actor.model;
   const model=name?await sceneModel(name,building?.root||0):null;
   if(!model){missing.push(name||family+' '+actor.source);continue}
   if(model.bank)banks.add(model.bank);
   const assembly=family==='hercs'?modelAssemblies.chassis[name.split('/').pop().split('.')[0]]:null;
   if(assembly)banks.add(modelAssemblies.bank);
   actorModels.push({actor,model,assembly,building});
  }
 }
 const weapons=actorModels.some(a=>a.assembly)?await sceneLoad('../models/data/simvol0/dts/MECHWPNS.json'):[];
 if(ground){
  const positions=zone.items.map(i=>i.position),bounds=sceneBounds(positions),size=bounds.radius+50000,minX=bounds.centre[0]-size,maxX=bounds.centre[0]+size,minY=bounds.centre[1]-size,maxY=bounds.centre[1]+size;
  const colour=worldInspectionData.worlds['WORLD'+worldIndex].ground;
  instances.push({shape:{points:[[minX,minY,-20],[minX,maxY,-20],[maxX,maxY,-20],[maxX,minY,-20],[0,0,2048]],indices:[0,1,2,3],colours:[[colour,0,0,0]],polygons:[{type:'solid_polygon',normal:4,colour_index:0,vertex_list:0,vertex_count:4}]},inspectionGround:true});
 }
 return {instances,actorModels,weapons,banks:[...banks],missing};
}
function clearScene(){
 ++sceneTicket;sceneKey='';sceneLoadingKey='';scenePending=null;sceneGeometry=null;sceneWorld=null;sceneContextKey='';sceneMission='';sceneSelection=null;markers=[];
 sceneRenderer.draw({points:[]});sceneContext.clearRect(0,0,sceneOverlay.width,sceneOverlay.height);
 $('sceneFocus').replaceChildren(new Option('No scene available','all'));
 $('mapinfo').textContent=current?.error?'No scene available: incompatible mission source layout.':'No launch capture is available for this selection.';
 updateSceneNotice();
}
async function drawScene(){
 if(current?.error||($('fixture').value==='launch'&&!launchState)){clearScene();return}
 updateSceneNotice();
 const zone=zones.find(z=>z.name===$('zone').value);if(!zone||!current)return;
 const terrainNames=['DESERT','TEMPER','ICE','URBAN'],h=header(),terrainIndex=$('terrain').value==='auto'?(h?.[0]??zone.kind):terrainNames.indexOf($('terrain').value),kind=terrainNames[terrainIndex];
 if(!kind)return;
 // The original uses an even-numbered DPL for both normal/low-visibility WLD partners.
 const paletteIndex=terrainIndex*6+(h?.[9]??0)*2,worldIndex=paletteIndex+(h?.[8]??0),contextKey=[current.name,$('fixture').value,launchSelectionKey,zone.name,kind].join('|');
 const key=[contextKey,worldIndex,$('ground').checked,$('actorModels').checked].join('|');
 if(key!==sceneKey){
  if(key!==sceneLoadingKey){
   sceneLoadingKey=key;const ticket=++sceneTicket,snapshot={missionName:current.name,zone,kind,script:handoff,world:constructed,showActors:$('actorModels').checked,ground:$('ground').checked,worldIndex};
   scenePending=(async()=>{
    const built=await buildScene(snapshot);if(ticket!==sceneTicket)return false;
    await sceneRenderer.setBank(built.banks);if(ticket!==sceneTicket)return false;
    const palette=mediaData.palettes.find(p=>p.name===`simvol0/dpl/WORLD${paletteIndex}.DPL`);sceneRenderer.setPalette(palette);
    const instances=built.instances;
    for(const item of built.actorModels){
     const {actor,model,assembly}=item,matrix=ES.matrix([...actor.angles,...actor.position]);
     const equipment=[];assembly?.mounts.forEach((mount,i)=>{equipment[mount.equipment_slot]=actor.weapons[i]});
     const assembled=ESAssembly.instances({...model,assembly,equipment,weaponShapes:built.weapons,textureOffset:sceneRenderer.bankOffsets[modelAssemblies.bank]||0,matrix});
     assembled.instances[0].textureOffset=sceneRenderer.bankOffsets[model.bank]||0;
     for(const instance of assembled.instances)instances.push({...instance,nativeClass:actor.native_class});
    }
    for(const instance of instances)instance.materialRamps=ESWorld.ramps(palette,instance.nativeClass,worldIndex);
    sceneGeometry=sceneRenderer.geometry(instances);sceneKey=key;sceneWorld=snapshot.world;
    sceneSummary=`${zone.items.length} scenery placements · ${built.actorModels.filter(a=>a.building).length} buildings · ${built.actorModels.filter(a=>!a.building).length} HERCs/flyers · ${kind} · WORLD${worldIndex} · ${sceneGeometry.faces.toLocaleString()} polygons`;
    if(built.missing.length)sceneSummary+=' · Unavailable models: '+[...new Set(built.missing)].join(', ');
    if(!snapshot.world)sceneSummary+=' · Select a compiled fixture to include constructed buildings and actors.';
    const positions=[...sceneGeometry.points,...Object.values(snapshot.world?.actors||{}).flat().map(a=>a.position)].filter(Array.isArray);
    sceneWholeFrame=sceneBounds(positions);
    if(sceneContextKey!==contextKey){
     const newMission=sceneMission!==snapshot.missionName;
     sceneContextKey=contextKey;sceneMission=snapshot.missionName;
     // A new compilation or terrain set changes content, not the camera.
     // Recompute the Reset destination, retaining the exact current framing.
     if(newMission||!sceneFrame){sceneFrame=sceneWholeFrame;sceneZoom=.75;sceneSelection=null}
     setSceneFocusOptions(zone,snapshot.world);$('sceneFocus').value=newMission?'all':'custom';
    }
    return true;
   })();
  }
  if(!await scenePending||key!==sceneLoadingKey)return;
 }
 sceneRenderer.draw(sceneGeometry,{angle:sceneAngle,elevation:sceneElevation,zoom:sceneZoom,...sceneFrame});
 sceneContext.clearRect(0,0,sceneOverlay.width,sceneOverlay.height);
 drawMap({canvas:sceneOverlay,context:sceneContext,projection:sceneProject});
 $('mapinfo').textContent=sceneSummary;
}
function sceneProject(point){
 const m=sceneRenderer.viewProjection,[x,y,z=0]=point,w=m[3]*x+m[7]*y+m[11]*z+m[15];
 if(w<=0)return [-1000000,-1000000];
 return [(1+(m[0]*x+m[4]*y+m[8]*z+m[12])/w)*sceneCanvas.width/2,(1-(m[1]*x+m[5]*y+m[9]*z+m[13])/w)*sceneCanvas.height/2];
}
function setSceneFocusOptions(zone,world){
 const choices=[new Option('Whole map','all')];
 if(world?.actors.ground.length)choices.push(new Option('All buildings','buildings'));
 if(world?.actors.hercs.some(a=>a.player))choices.push(new Option('Player start','player'));
 for(const [i,actor]of (world?.actors.ground||[]).entries()){const building=sceneBuilding(actor,handoff);choices.push(new Option(`${building.affiliation} ${building.label} #${actor.source}${building.objective?' · objective':''}`,'building:'+i))}
 for(const variant of [...new Set(zone.items.map(i=>i.shape))].sort((a,b)=>a-b)){const count=zone.items.filter(i=>i.shape===variant).length;choices.push(new Option(`Terrain variant ${variant} · first of ${count}`,'terrain:'+variant))}
 if(zone.name.endsWith('/ZONE1161.DAT'))choices.push(new Option('North-edge terrain pattern','pattern'));
 const custom=new Option('Current viewpoint','custom');custom.disabled=true;choices.push(custom);
 $('sceneFocus').replaceChildren(...choices);$('sceneFocus').value='all';
}
function focusScene(position,radius=18000){sceneFrame={centre:position.slice(),radius};sceneZoom=.75;$('sceneFocus').value='custom';drawScene()}
$('sceneFocus').onchange=async()=>{
 const value=$('sceneFocus').value;
 if(value==='all'){sceneFrame=sceneWholeFrame;sceneZoom=.75}
 else if(value==='buildings'){
  const points=sceneWorld.actors.ground.map(a=>a.position).filter(Array.isArray),bounds=sceneBounds(points);sceneFrame={centre:bounds.centre,radius:Math.max(18000,bounds.radius*1.35)};sceneZoom=.6;
 }else if(value==='player'){sceneFrame={centre:sceneWorld.actors.hercs.find(a=>a.player).position,radius:18000};sceneZoom=.75}
 else if(value.startsWith('building:')){sceneFrame={centre:sceneWorld.actors.ground[Number(value.slice(9))].position,radius:15000};sceneZoom=.75}
 else if(value.startsWith('terrain:')){
  const index=+value.slice(8),zone=zones.find(z=>z.name===$('zone').value),item=zone.items.find(i=>i.shape===index);
  const kind=$('terrain').value==='auto'?['DESERT','TEMPER','ICE','URBAN'][header()[0]]:$('terrain').value,roots=await sceneLoad('../models/data/simvol0/dgs/'+kind+'.json');
  if(item){sceneFrame={centre:item.position.slice(),radius:Math.max(1000,roots[index].radius*1.2)};sceneZoom=.75}
 }else if(value==='pattern'){sceneFrame={centre:[8000,400000,0],radius:35000};sceneAngle=0;sceneElevation=Math.PI/2;sceneZoom=.65}
 drawScene();
};
$('sceneTop').onclick=()=>{sceneAngle=0;sceneElevation=Math.PI/2;drawScene()};
$('sceneReset').onclick=()=>{sceneAngle=.7;sceneElevation=.55;$('sceneFocus').value='all';$('sceneFocus').onchange()};
function updateSceneNotice(){
 if(current?.error){$('sceneNotice').hidden=false;$('sceneNoticeText').textContent='The reference game’s mission reader rejects this retained source layout. No scenery or launch is available.';$('sceneShowActors').hidden=true;return}
 const source=$('fixture').value==='source',hidden=!$('actorModels').checked,unavailable=!source&&!constructed;
 $('sceneNotice').hidden=$('mode').value!=='scene'||(!source&&!hidden&&!unavailable);
 $('sceneNoticeText').textContent=source?'Source view shows terrain and waypoint alternatives only. Choose a compiled mission to construct its buildings and actors.':unavailable?'Constructed buildings and actors are unavailable for this mission layout.':'Buildings and actors are hidden.';
 $('sceneShowActors').hidden=unavailable;
}
$('sceneShowActors').onclick=async()=>{
 $('actorModels').checked=true;
 if($('fixture').value==='source'){$('fixture').value='launch';await $('fixture').onchange()}
 await drawScene();
};
$('mode').onchange=()=>{const show=$('mode').value==='scene';$('map').hidden=show;$('sceneWrap').hidden=!show;$('sceneControls').hidden=!show;updateSceneNotice();draw()};
for(const id of ['terrain','ground','actorModels'])$(id).oninput=draw;
function sceneNearest(e){const b=sceneCanvas.getBoundingClientRect(),x=(e.clientX-b.left)*sceneCanvas.width/b.width,y=(e.clientY-b.top)*sceneCanvas.height/b.height;return markers.map(m=>({...m,d:Math.hypot(m.p[0]-x,m.p[1]-y)})).sort((a,b)=>a.d-b.d)[0]}
let sceneDrag=null,sceneDragged=false;
sceneCanvas.oncontextmenu=e=>e.preventDefault();
sceneCanvas.onpointerdown=e=>{sceneCanvas.setPointerCapture(e.pointerId);sceneDrag={x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button===2};sceneDragged=false};
sceneCanvas.onpointermove=e=>{
 if(!sceneCanvas.hasPointerCapture(e.pointerId)){const nearest=sceneNearest(e);sceneCanvas.title=nearest?.d<14?nearest.text:'';return}
 sceneDragged ||= Math.hypot(e.clientX-sceneDrag.x,e.clientY-sceneDrag.y)>3;
 if(sceneDrag.pan||e.shiftKey){
  const units=6*sceneFrame.radius*sceneZoom/1.4/sceneCanvas.getBoundingClientRect().height,co=Math.cos(sceneAngle),si=Math.sin(sceneAngle),[x,y]=sceneFrame.centre;
  // Move across the ground, not the tilted screen plane: orbit must never
  // inherit an accumulated pivot height from panning. This also stays stable
  // when looking along the horizon or straight down.
  sceneFrame={...sceneFrame,centre:[x-units*(co*e.movementX+si*e.movementY),y+units*(-si*e.movementX+co*e.movementY),0]};$('sceneFocus').value='custom';
 }else{sceneAngle-=e.movementX*.01;sceneElevation=Math.max(-.2,Math.min(Math.PI/2,sceneElevation+e.movementY*.01))}
 drawScene();
};
sceneCanvas.onpointerup=e=>{sceneCanvas.releasePointerCapture(e.pointerId);sceneDrag=null};
sceneCanvas.onclick=e=>{if(sceneDragged)return;const nearest=sceneNearest(e);if(nearest?.d<16){sceneSelection=nearest;inspectMarker(nearest)}};
sceneCanvas.ondblclick=e=>{const nearest=sceneNearest(e);if(nearest?.d<16&&nearest.position)focusScene(nearest.position)};
sceneCanvas.onwheel=e=>{e.preventDefault();sceneZoom=Math.max(.015,Math.min(6,sceneZoom*Math.exp(e.deltaY*.001)));drawScene()};
