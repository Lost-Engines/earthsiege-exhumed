(async()=>{
 const $=id=>document.getElementById(id),canvas=$('sky'),ctx=canvas.getContext('2d');
 let rows,playing=false,last=0,ticket=0,current=null,atlas=null,panorama=null;
 const cache=new Map();
 function image(url){if(!cache.has(url))cache.set(url,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Could not load the sky artwork. Please reload.'));img.src=url}));return cache.get(url)}
 function draw(){if(!atlas||!panorama)return;const wide=$('skyMode').value==='panorama';canvas.width=wide?1280:320;canvas.height=200;ctx.imageSmoothingEnabled=false;
 if(wide)ctx.drawImage(panorama,0,0);else{const a=current.animation,f=Number($('skyFrame').value);ctx.drawImage(atlas,(f%a.columns)*a.width,Math.floor(f/a.columns)*a.height,a.width,a.height,0,0,320,200);}
 canvas.classList.toggle('panorama',wide);$('skyPlayback').hidden=wide;$('skyPosition').textContent=(Number($('skyFrame').value)+1)+' / 30';
 }
 function setPlaying(value){playing=value;$('skyPlay').textContent=value?'Pause clouds':'Play clouds';$('skyPlay').setAttribute('aria-pressed',String(value));last=0}
 async function update(){const id=++ticket,world=Number($('environment').value)*6+Number($('time').value)*2+Number($('visibility').value);current=rows.find(x=>x.world===world);$('skyNote').textContent='Loading sky…';const row=current;
 const loaded=await Promise.all([image('environment/'+row.animation.atlas),image('environment/'+row.panorama.image)]);if(id!==ticket)return;[atlas,panorama]=loaded;
 const wide=$('skyMode').value==='panorama';$('skyNote').textContent=wide?(row.panorama.present?'The four original horizon sections, unwrapped through 360°.':'This environment hides the horizon strip. The original sky and ground bands remain.'):'Original level-camera output. Select Play clouds to animate the captured sequence.';
 if(wide)setPlaying(false);draw();const url=new URL(location.href);url.searchParams.set('world',world);url.searchParams.set('view',wide?'panorama':'camera');history.replaceState(null,'',url);
 }
 function loop(time){if(playing&&!document.hidden){if(!last)last=time;if(time-last>=100){$('skyFrame').value=(Number($('skyFrame').value)+Math.floor((time-last)/100))%30;last=time;draw()}}else last=0;requestAnimationFrame(loop)}
 try{const response=await fetch('data.json');if(!response.ok)throw Error('Sky data could not be loaded. Please reload.');rows=await response.json();const q=new URLSearchParams(location.search),world=Number(q.get('world'));if(q.has('world')&&Number.isInteger(world)&&world>=0&&world<24){$('environment').value=Math.floor(world/6);$('time').value=Math.floor(world%6/2);$('visibility').value=world%2}if(q.get('view')==='panorama')$('skyMode').value='panorama';
 for(const id of ['environment','time','visibility','skyMode'])$(id).onchange=()=>update().catch(fail);$('skyFrame').oninput=()=>{setPlaying(false);draw()};$('skyPlay').onclick=()=>setPlaying(!playing);await update();requestAnimationFrame(loop);
 }catch(e){fail(e)}
 function fail(e){setPlaying(false);$('skyNote').textContent=e.message;$('skyNote').setAttribute('role','alert');console.error(e)}
})();
