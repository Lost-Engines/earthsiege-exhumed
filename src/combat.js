// Enhance retained original-code captures. Static examples remain readable alone.
const load=async name=>{const r=await fetch('../combat/'+name);if(!r.ok)throw Error('Combat capture unavailable: '+name);return r.json()};
const el=id=>document.getElementById(id);
const number=v=>v.toLocaleString('en-GB');
async function damage(){
 const data=await load('damage-states.json');
 const descriptions={
  intact:'Intact Samson with its original starting equipment.',
  armour:'A 4,000-point direct hit exhausts left shoulder armour. Its arm actuator survives, and the mounted weapons remain enabled.',
  shoulder:'A 10,000-point direct hit removes the left shoulder and its two attached weapon sections.',
  'upper-leg':'A 10,000-point direct hit removes the left upper leg, lower leg and foot. Their shared actuator is destroyed.',
  foot:'A 10,000-point direct hit removes the left foot. The upper and lower leg remain, but their shared actuator is destroyed.',
  cockpit:'A 10,000-point direct hit destroys the cockpit and cascades into its attached shoulders and weapons.'
 };
 // Decode before revealing the selector so image and labels always change together.
 const images=await Promise.all(data.states.map(s=>new Promise((resolve,reject)=>{
  const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src='../combat/'+s.image;
 })));
 function update(){
  const index=data.states.findIndex(s=>s.id===el('damage-state').value);const s=data.states[index];
  el('damage-image').src=images[index].src;el('damage-image').alt='Original Samson rendering: '+s.label.toLowerCase();
  el('damage-caption').textContent=descriptions[s.id];
  const count=s.weapons_disabled.filter(Boolean).length;const f=s.state.flags;
  const condition=f.dead?'Destroyed.':f.disabled?'Disabled: cannot walk.':'Still mobile.';
  el('damage-details').textContent=condition+' '+count+' of '+s.weapons_disabled.length+' equipped weapons disabled.'+(s.detached.length?' '+s.detached.length+(s.detached.length===1?' section removed.':' sections removed.'):' No sections removed.');
 }
 el('damage-state').addEventListener('change',update);update();el('damage-controls').hidden=false;
}
async function shields(){
 const data=await load('shield.json');
 const meters=document.createElement('div');meters.className='combat-meters';
 meters.innerHTML='<label>Shield absorbed <meter id="shield-absorbed" min="0" max="60" value="60"></meter><span id="shield-absorbed-label">60 / 60</span></label><label>Damage sent to armour <meter id="armour-hit" class="harm-meter" min="0" max="360" value="0"></meter><span id="armour-hit-label">0 / 360</span></label>';
 el('shield-example').insertBefore(meters,el('shield-controls'));
 function update(){
  const r=data.rows[Number(el('shield-charge').value)],absorbed=r.charge*2-r.remaining[0]-r.remaining[1];
  el('shield-value').value=String(r.charge);el('shield-absorbed').value=absorbed;el('armour-hit').value=r.body_damage;
  el('shield-absorbed-label').textContent=absorbed+' / 60';el('armour-hit-label').textContent=r.body_damage+' / 360';
  el('shield-readout').innerHTML='<strong>'+r.charge+' shield charge: '+(r.body_damage?'360 damage reaches the body.':'body protected.')+'</strong><p>'+ (r.body_damage?'The shield absorbs '+absorbed+' of the 60 shield-damage points. The remaining '+(60-absorbed)+' opens the body test; its independent armour field is still 360.':'The shield absorbs all 60 shield-damage points. The body damage branch is skipped.')+'</p>';
 }
 el('shield-charge').addEventListener('input',update);update();el('shield-controls').hidden=false;
}
async function salvage(){
 const [data,response]=await Promise.all([load('salvage.json'),fetch('../combat/salvage.svg')]);
 if(!response.ok)throw Error('Salvage diagram unavailable');
 const svg=new DOMParser().parseFromString(await response.text(),'image/svg+xml').documentElement;
 svg.classList.add('salvage-live-chart');const image=el('salvage-chart');image.before(svg);image.hidden=true;
 const marker=svg.querySelector('#salvage-marker'),line=marker.querySelector('line'),dot=marker.querySelector('circle');
 function update(){
  const r=data.rows[Number(el('salvage-damage').value)],x=75+680*r.damage/200,y=335-240*r.section_contribution/2000;
  el('salvage-value').value=String(r.damage);line.setAttribute('x1',x);line.setAttribute('x2',x);dot.setAttribute('cx',x);dot.setAttribute('cy',y);marker.setAttribute('visibility','visible');
  el('salvage-readout').innerHTML='<strong>'+r.damage+' damage: contribution '+number(r.section_contribution)+'.</strong><p>'+number(r.armour_remaining)+' of '+number(data.capacity)+' armour remains. The whole controlled hull score is '+number(r.score)+' before mission-level scaling. '+(r.damage>=150?'This section has crossed the absolute 150-point cutoff.':'This section still qualifies for a contribution.')+'</p>';
 }
 el('salvage-damage').addEventListener('input',update);update();el('salvage-controls').hidden=false;
}
for(const enhance of [damage,shields,salvage])enhance().catch(error=>console.error(error));
