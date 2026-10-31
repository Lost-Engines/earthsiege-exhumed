'use strict';
const $=id=>document.getElementById(id),rows=window.missionCatalogue,zones=window.zoneCatalogue,c=$('map'),ctx=c.getContext('2d');let current=null,mission=null,handoff=null,plan=null,constructed=null,markers=[],serial=0,fixtureSerial=0;
for(const category of [...new Set(rows.map(r=>r.group))])$('category').add(new Option(category));
for(const z of zones)$('zone').add(new Option(z.name,z.name));
const requestedFixture=new URLSearchParams(location.search).get('fixture');$('fixture').value=[...$('fixture').options].some(o=>o.value===requestedFixture)?requestedFixture:'launch';
function list(){
 const q=$('find').value.toLowerCase(),category=$('category').value;
 const filtered=rows.filter(r=>[r.name,r.group,r.role,r.title,r.summary].filter(Boolean).join(' ').toLowerCase().includes(q)&&(category==='All'||r.group===category));
 $('count').textContent=filtered.length+' missions';
 $('list').replaceChildren(...filtered.map(r=>{
  const tr=document.createElement('tr');tr.dataset.mission=r.name;tr.tabIndex=0;if(r===current)tr.className='selected';
  const id=document.createElement('td');id.className='mission-id';id.append(r.name);
  if(r.error){const warning=document.createElement('span');warning.className='mission-warning';warning.textContent='!';warning.tabIndex=0;warning.title='Original reader rejects this source layout: '+r.error;warning.setAttribute('aria-label',warning.title);id.append(' ',warning)}
  const role=document.createElement('td'),group=document.createElement('div'),kind=document.createElement('small');group.textContent=r.category==='Campaign'?r.group:r.category;group.title=r.group_source;kind.textContent=r.role;kind.title=r.role_source;role.append(group,kind);
  const description=document.createElement('td'),summary=document.createElement('span');summary.className='mission-summary';summary.textContent=r.title||r.summary;summary.title=(r.summary_source?r.summary_source+'\n':'')+(r.title||r.summary);description.append(summary);
  if(r.note){const note=document.createElement('small');note.textContent='Test text retained';note.title=r.note;description.append(note)}
  tr.append(id,role,description);tr.onclick=()=>select(r);tr.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(r)}};return tr;
 }));
}
async function select(r,launchContext=null){
 const changed=current?.name!==r.name;current=r;const ticket=++serial;
 if(changed)clearScene();
 const loaded=await EarthsiegeData.load(r.url);if(ticket!==serial)return;
 mission=loaded;$('name').textContent=r.name+' · '+(r.role||r.group);
 $('status').textContent=r.error?'Original reader also rejects this source layout: '+r.error:(r.note||r.summary||'');
 configureLaunches(r,launchContext);await loadFixture();if(ticket!==serial)return;
 drawText();list();await draw();if(ticket!==serial)return;
 history.replaceState(null,'','#'+r.name);saveLaunchSelection();
}
function header(){return handoff?.header||current?.settings}
async function loadFixture(){
 const ticket=++fixtureSerial,selected=current,fixture=$('fixture').value;
 let loaded=null,roster=null,world=null,state=null,selectionKey='';
 if(fixture==='launch'&&!selected.error){
  const entry=selectedLaunch();
  if(entry){state=await EarthsiegeData.load(entry.url);loaded=state.handoff;roster=state.plan;world=state.world;selectionKey=entry.case}
 }else if(fixture!=='source'&&!selected.error){
  [loaded,roster]=await Promise.all([EarthsiegeData.load('handoffs/'+fixture+'/'+selected.name.toLowerCase()+'.json'),EarthsiegeData.load('runtime-handoffs/'+fixture+'/'+selected.name.toLowerCase()+'.json')]);
  const available=constructedCatalogue.find(r=>r.name===selected.name&&r.fixture===fixture);
  if(available)world=await EarthsiegeData.load(available.url);
 }
 if(ticket!==fixtureSerial||selected!==current)return;
 handoff=loaded;plan=roster;constructed=world;launchState=state;launchSelectionKey=selectionKey;
 $('constructedControl').hidden=!world;
 const h=header(),zone=zones.find(z=>z.name==='simvol0/dat/ZONE'+h?.[1]+'.DAT')||zones.find(z=>z.name.endsWith('/ZONE'+h?.[1]+'.DAT'));if(zone)$('zone').value=zone.name;
 $('conditional').disabled=!!handoff;$('referencedControl').hidden=!plan;$('records').textContent=JSON.stringify(handoff?.tables||mission.tables||mission,null,2);
 $('fixtureinfo').textContent=selected.error?'No scene: the reference game’s reader rejects this mission layout.':state?'Original launch handoff and constructed starting actors. All groups are shown, including inactive ones; simulation has not advanced.':handoff?'Compiler diagnostic fixture. Player equipment and simulation counters use the separate DEMO1 test roster; this is not a full mission launch.':'Unresolved source alternatives; no constructed buildings or actors.';
 updateLaunchDetails();$('spatialinfo').hidden=true;$('spatialmodel').hidden=true;drawTriggers();
}


const hercNames=['ROADRUNN','GUNSLING','RAPTOR','TOMAHAWK','PATRIOT','PANTHER','HERCULES','COLOSSUS','MONGOOSE','SCORPION','MIRIMAC','RAMSES','ACHILLES','APOLLO','BULLDOG','SPIDER'];
function draw(){
 if(current?.error||($('fixture').value==='launch'&&!launchState)){clearScene();ctx.fillStyle='#101922';ctx.fillRect(0,0,c.width,c.height);return}
 if($('mode').value==='scene')return drawScene();
 drawMap({canvas:c,context:ctx});
}
function drawMap({canvas,context,projection=null}){
 const c=canvas,ctx=context;
 if(!projection){ctx.fillStyle='#101922';ctx.fillRect(0,0,c.width,c.height)}markers=[];
 const tables=handoff?.tables||mission?.tables||{},zone=zones.find(z=>z.name===$('zone').value),points=handoff?(tables.points||[]).map((p,i)=>({...p,id:i,condition:-1})):(tables.points||[]).filter(p=>$('conditional').value==='all'||p.condition===-1);
 const all=[...(zone?.items||[]).map(i=>i.position),...points.map(p=>p.position),...(constructed&&$('constructed').checked?Object.values(constructed.actors).flat().map(a=>a.position):[])].filter(Array.isArray);if(!all.length)return;
 const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),scale=Math.min((c.width-70)/(maxX-minX||1),(c.height-70)/(maxY-minY||1)),ox=(c.width-(maxX-minX)*scale)/2,oy=(c.height-(maxY-minY)*scale)/2,project=projection||(p=>[ox+(p[0]-minX)*scale,c.height-oy-(p[1]-minY)*scale]);
 ctx.font='12px monospace';ctx.strokeStyle='#263b4c';const grid=10**Math.floor(Math.log10(Math.max(maxX-minX,maxY-minY)/6));
 if(grid>0&&!projection){for(let x=Math.ceil(minX/grid)*grid;x<=maxX;x+=grid){const p=project([x,minY]);ctx.beginPath();ctx.moveTo(p[0],25);ctx.lineTo(p[0],c.height-25);ctx.stroke();ctx.fillStyle='#8b9fb0';ctx.fillText(x.toLocaleString(),p[0]+3,c.height-10)}for(let y=Math.ceil(minY/grid)*grid;y<=maxY;y+=grid){const p=project([minX,y]);ctx.beginPath();ctx.moveTo(25,p[1]);ctx.lineTo(c.width-25,p[1]);ctx.stroke();ctx.fillStyle='#8b9fb0';ctx.fillText(y.toLocaleString(),5,p[1]-3)}}
 if(!projection)for(const item of zone?.items||[]){const p=project(item.position);ctx.fillStyle=`hsl(${item.shape*39%360} 25% 48%)`;ctx.fillRect(p[0]-3,p[1]-3,6,6);markers.push({p,text:`Scenery shape ${item.shape}; XYZ ${item.position.join(', ')}; angles ${item.angles.join(', ')}`,record:item})}
 if($('routes').checked){ctx.strokeStyle='#6c9dba';for(const route of tables.routes||[]){if(!handoff&&$('conditional').value==='base'&&route.condition!==-1)continue;ctx.setLineDash(handoff||route.condition===-1?[]:[4,4]);let previous=[];for(const id of route.points){const matches=points.filter(p=>p.id===id);for(const a of previous)for(const b of matches){const pa=project(a.position),pb=project(b.position);ctx.beginPath();ctx.moveTo(...pa);ctx.lineTo(...pb);ctx.stroke()}previous=matches}}ctx.setLineDash([])}
 if($('points').checked)for(const point of points){const p=project(point.position);ctx.fillStyle=point.condition===-1?'#b8e9bc':'#f5b868';ctx.beginPath();ctx.arc(...p,3.5,0,Math.PI*2);ctx.fill();if($('labels').checked)ctx.fillText(point.id,p[0]+5,p[1]-4);markers.push({p,text:`Point ${point.id}; XYZ ${point.position.join(', ')}${handoff?'':`; condition ${point.condition}; variant ${point.variant}`}`,record:point,position:point.position})}
 let actors=0,groups=0;
 if(handoff){
  const marker=(point,colour,label,record,radius=6)=>{const position=Array.isArray(point)?point:tables.points[point]?.position;if(!Array.isArray(position))return false;const p=project(position);ctx.strokeStyle=colour;ctx.fillStyle=colour;ctx.beginPath();ctx.moveTo(p[0],p[1]-radius);ctx.lineTo(p[0]+radius,p[1]);ctx.lineTo(p[0],p[1]+radius);ctx.lineTo(p[0]-radius,p[1]);ctx.closePath();ctx.stroke();if($('labels').checked)ctx.fillText(label,p[0]+radius+2,p[1]-radius);markers.push({p,text:label,record,position});return true};
  if(constructed&&$('constructed').checked&&$('actors').checked){
   for(const [kind,colour]of [['hercs','#e7c26d'],['flyers','#6dd9e7'],['ground','#e7876d']])for(const actor of constructed.actors[kind]){
    const name=kind==='hercs'?hercNames[actor.chassis]:kind==='flyers'?['SKIMMER','HOVTANK'][actor.type]:worldInspectionData.buildings[actor.type]?.name;
    const label=`${actor.player?'Player · ':''}${name||kind} · group ${actor.group}, member ${actor.member} · source ${actor.source}`;
    marker(actor.position,actor.player?'#ffffff':colour,label,{record_family:kind,index:actor.source,name,preload_slot:actor.slot,...actor},actor.player?8:6);actors++;
   }
  }else if($('actors').checked)for(const [kind,colour]of [['hercs','#e7c26d'],['flyers','#6dd9e7'],['bases','#e7876d']])for(const [i,actor]of tables[kind].entries()){
   const mapping=plan?.live_maps[kind==='bases'?'ground':kind],slot=mapping?.slots.find(s=>s.source===i);
   if(mapping&&$('referenced').checked&&!slot)continue;
   const name=kind==='hercs'?hercNames[actor.chassis]:kind==='flyers'?['SKIMMER','HOVTANK'][actor.type]:worldInspectionData.buildings[actor.type]?.name;
   if(marker(actor.position,colour,`${kind} ${i}${name?' '+name:''}${slot?' → live slot '+slot.live:''}`,{record_family:kind,index:i,name,preload_slot:slot?.live,...actor}))actors++;
  }
  if($('groups').checked)for(const [i,group]of tables.groups.entries())if(marker(group.position,'#c59ce2',`Group ${i}: ${['HERC','flyer','ground'][group.kind]||group.kind}`,{record_family:'group',index:i,...group},9))groups++;
  if($('areas').checked)for(const [i,area]of tables.areas.entries()){
   const a=tables.points[area.first_point]?.position,b=tables.points[area.second_point_or_radius]?.position;if(!a)continue;
   let boundary=[];
   if(area.kind===0&&b)boundary=[[a[0],a[1],a[2]],[a[0],b[1],a[2]],[b[0],b[1],a[2]],[b[0],a[1],a[2]]];
   else if(area.kind!==0){const r=area.second_point_or_radius*10,d=r*2/3;boundary=[[r,0],[d,d],[0,r],[-d,d],[-r,0],[-d,-d],[0,-r],[d,-d]].map(p=>[a[0]+p[0],a[1]+p[1],a[2]])}
   if(boundary.length){ctx.beginPath();boundary.map(project).forEach((p,j)=>j?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle='#e4889814';ctx.strokeStyle='#e48898';ctx.fill();ctx.stroke()}
   marker(area.first_point,'#e48898',`Area ${i}: ${area.kind===0?'rectangle':'native radial distance'}; boundary excluded`,{record_family:'area',index:i,...area},12);
  }
 }
 if(!projection)$('mapinfo').textContent=`${zone?.items.length||0} scenery placements · ${points.length} ${handoff?'compiled':'source'} waypoints · ${actors} ${constructed&&$('constructed').checked?'constructed starting actors':'actor reference positions'} · ${groups} group anchors · ${zone?.name||'No scenery'}`;
}
c.onmousemove=e=>{const bounds=c.getBoundingClientRect(),x=(e.clientX-bounds.left)*c.width/bounds.width,y=(e.clientY-bounds.top)*c.height/bounds.height;const nearest=markers.map(m=>({...m,d:Math.hypot(m.p[0]-x,m.p[1]-y)})).sort((a,b)=>a.d-b.d)[0];c.title=nearest?.d<14?nearest.text:''};for(const id of ['zone','points','routes','labels','conditional','actors','groups','areas','referenced','constructed'])$(id).oninput=draw;for(const id of ['find','category'])$(id).oninput=list;
window.addEventListener('DOMContentLoaded',async()=>{const q=new URLSearchParams(location.search);await select(rows.find(r=>r.name===location.hash.slice(1))||rows.find(r=>r.name==='B0_C3_2A')||rows[0],{context:q.get('context'),case:q.get('case')});if(!q.has('focus')&&current.name==='B0_C3_2A')q.set('focus','building:4');if(q.has('focus')&&[...$('sceneFocus').options].some(o=>o.value===q.get('focus'))){$('sceneFocus').value=q.get('focus');await $('sceneFocus').onchange()}});

function drawText(){
 $('text').replaceChildren(...(mission?.text?.sections||[]).filter(s=>s.tag!=='DEB:').map(s=>{
  const section=document.createElement('section'),h=document.createElement('h3');h.textContent=({'BRF:':'Briefing','OBJ:':'Objectives','DEB:':'Debrief'})[s.tag]||s.tag;section.append(h);
  if(s.objectives){const list=document.createElement('ol');for(const item of s.objectives){const li=document.createElement('li');li.textContent=item.text;list.append(li)}section.append(list)}
  else{let text='';for(const segment of s.segments){if(segment.kind==='literal')text+=segment.text;else{const value=$('textstate').value==='launch'?selectedCounters()[segment.variable]:$('textstate').value==='one'?1:$('textstate').value==='pattern'?segment.variable%5:0;const selected=segment.choices.filter(c=>c.first<=value&&value<=c.last).at(-1);if(selected)text+=selected.text}}const p=document.createElement('p');p.textContent=text;section.append(p);
   for(const segment of s.segments.filter(s=>s.kind==='choice')){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`Counter ${segment.variable}: ${segment.choices.length} phrase alternatives`;details.append(summary);for(const c of segment.choices){const p=document.createElement('p');p.textContent=`${c.first}…${c.last}: ${c.text}`;details.append(p)}section.append(details)}
  }return section;
 }));
}
$('textstate').oninput=drawText;

$('fixture').onchange=()=>changeLaunch();
function inspectMarker(nearest){
 if(!nearest)return;
 $('spatialinfo').hidden=false;$('spatialinfo').textContent=nearest.text+'\n'+JSON.stringify(nearest.record,null,2);
 const record=nearest.record,name=record?.name,ground=record?.record_family==='ground'||record?.record_family==='bases';
 let model=record?.model,root=0;
 if(ground){const definition=sceneBuilding(record,handoff);if(definition){model=definition.name;root=definition.root}}
 else if(!model&&name&&name!=='HOVTANK')model='simvol0/dts/'+name+'.DTS';
 $('spatialmodel').hidden=!model||model.endsWith('/HOVTANK.DTS');
 if(model)$('spatialmodel').href='../models/index.html?root='+root+'#'+encodeURIComponent(model);
}
c.onclick=e=>{const bounds=c.getBoundingClientRect(),x=(e.clientX-bounds.left)*c.width/bounds.width,y=(e.clientY-bounds.top)*c.height/bounds.height,nearest=markers.map(m=>({...m,d:Math.hypot(m.p[0]-x,m.p[1]-y)})).sort((a,b)=>a.d-b.d)[0];if(nearest?.d<16)inspectMarker(nearest)};


function drawTriggers(){
 const section=$('triggers');section.replaceChildren();if(!handoff){section.textContent='Select a compilation fixture to see resolved activation rules.';return}
 const audiences=['Player','Any member of player group','Any active side-0 group','Any active side-1 group','Any active HERC group','Any active flyer group'];
 const table=document.createElement('table'),head=document.createElement('tr');for(const text of ['Trigger','Who can enter','Areas (any)','Counter action','Waiting groups']){const th=document.createElement('th');th.textContent=text;head.append(th)}table.append(head);
 for(const [i,t]of handoff.tables.triggers.entries()){
  const areas=[];for(const a of t.areas){if(a<0)break;areas.push(a)}
  const action=t.counter<0?'None':t.counter_operation===6?`Increment counter ${t.counter}`:t.counter_operation===5?`Clear counter ${t.counter}`:`No counter operation (${t.counter_operation})`;
  const groups=handoff.tables.groups.flatMap((g,j)=>g.trigger===i?[j]:[]),row=document.createElement('tr');
  for(const text of [i,audiences[t.mode]||`Mode ${t.mode}`,areas.join(', ')||'None',action,groups.join(', ')||'None']){const cell=document.createElement('td');cell.textContent=text;row.append(cell)}table.append(row);
 }
 section.append(table);const note=document.createElement('p');note.className='muted';note.textContent='Spatial triggers latch once. Rectangle edges and radial boundaries are excluded; altitude is ignored. Radial areas use the original max + half-min distance, giving an octagonal outline. Group activation is processed before the next trigger scan. Actor events can also set these triggers.';section.append(note);
}
