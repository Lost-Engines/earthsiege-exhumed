/* Launch inputs and outputs are captured together from the original GO/DBSIM. */
'use strict';
let launchState=null,launchSelectionKey='';
const launchRows=()=>missionLaunchCatalogue.filter(r=>r.name===current?.name);
function configureLaunches(row,requested=null){
 const entries=missionLaunchCatalogue.filter(r=>r.name===row.name),contexts=[...new Map(entries.map(r=>[r.context,r])).values()];
 const options=contexts.map(r=>{const o=new Option(r.context_label,r.context);o.title=r.tables.join(', ');return o});
 $('launchContext').replaceChildren(...options);$('launchContext').disabled=!options.length;
 const requestedId=requested?.node!==undefined?`campaign-${requested.node}-${requested.step}`:requested?.context;
 const preferred=contexts.find(r=>r.context===requestedId)||contexts.find(r=>r.source_kind==='saved_career')||contexts.find(r=>r.source_kind==='recorded')||contexts.find(r=>r.context==='single')||contexts.find(r=>r.tables.some(t=>t.endsWith('BTLSET_0.DAT')))||contexts[0];
 if(preferred)$('launchContext').value=preferred.context;
 configureLaunchVariants(requested?.case);
}
function configureLaunchVariants(requested=null){
 const previous=$('launchVariant').selectedOptions[0]?.dataset.seed;
 const entries=launchRows().filter(r=>r.context===$('launchContext').value);
 $('launchVariant').replaceChildren(...entries.map(r=>{const o=new Option(r.seed==null?'Recorded state':`Random variation · seed ${r.seed}`,r.case);o.dataset.seed=r.seed??'';return o}));
 const selected=entries.find(r=>r.case===requested)||entries.find(r=>String(r.seed)===previous)||entries.find(r=>r.seed===17)||entries[0];
 if(selected)$('launchVariant').value=selected.case;
 $('launchVariant').disabled=entries.length<2;
}
function selectedLaunch(){return launchRows().find(r=>r.case===$('launchVariant').value&&r.context===$('launchContext').value)}
function selectedCounters(){
 if($('fixture').value==='launch')return launchState?.metadata.counters||Array(100).fill(0);
 return Array.from({length:100},(_,i)=>$('fixture').value==='flags_one'?1:$('fixture').value==='flags_pattern'?i%5:0);
}
function updateLaunchDetails(){
 const show=$('fixture').value==='launch';$('launchControls').hidden=!show;$('launchDetails').hidden=!show||!launchState;
 const note=$('launchDescription');note.hidden=!show;
 if(!show)return;
 if(!launchState){note.textContent=current?.error?'This source layout is rejected by the reference game’s reader.':'No launch capture is available for this selection.';return}
 const m=launchState.metadata;
 note.textContent=m.history_description+' '+m.roster_description;
 $('launchInputs').textContent=JSON.stringify({context:m.context_label,battle_sets:m.tables,mode:m.mode,node:m.node,step:m.step,seed:m.rng_seed,menu_options:m.menu_options,launch_header:handoff.header,source:m.native_entry,sha256:m.file_sha256,player:m.player},null,2);
 const indices=new Set([0,1,2,3,4,5,6]);
 for(const c of mission.tables?.conditions||[])if(c.words[2]===0)indices.add(c.words[3]);
 for(const section of mission.text?.sections||[])for(const segment of section.segments||[])if(segment.kind==='choice')indices.add(segment.variable);
 const names=['Previous result','Campaign chapter (99 = single mission)','Mission step','Time/palette menu option','Random choice A','Random choice B','Random choice C'];
 const table=document.createElement('table'),head=document.createElement('tr');
 for(const text of ['Counter','Value at launch','Use']){const th=document.createElement('th');th.textContent=text;head.append(th)}table.append(head);
 for(const i of [...indices].sort((a,b)=>a-b)){
  const tr=document.createElement('tr');for(const value of [i,m.counters[i],names[i]||'Referenced by this mission or its text']){const td=document.createElement('td');td.textContent=value;tr.append(td)}table.append(tr);
 }
 $('launchCounters').replaceChildren(table);
 $('allLaunchCounters').textContent=JSON.stringify(m.counters);
}
function saveLaunchSelection(){
 const url=new URL(location.href);url.searchParams.set('fixture',$('fixture').value);
 if($('fixture').value==='launch'){
  if($('launchContext').value)url.searchParams.set('context',$('launchContext').value);
  if($('launchVariant').value)url.searchParams.set('case',$('launchVariant').value);
 }else{url.searchParams.delete('context');url.searchParams.delete('case')}
 history.replaceState(null,'',url);
}
async function changeLaunch(){saveLaunchSelection();await loadFixture();drawText();draw()}
$('launchContext').onchange=async()=>{configureLaunchVariants();await changeLaunch()};
$('launchVariant').onchange=changeLaunch;
