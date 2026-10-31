/* Public navigation controls; recovered geometry and original math live separately. */
(()=>{
 const model=document.body.dataset.page==='models',canvas=document.getElementById(model?'view':'scene');if(!canvas)return;
 const buttons=document.createElement('div');buttons.className='viewer-buttons';
 function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;buttons.append(b)}
 if(model){button('Zoom in',()=>{zoom=Math.max(.2,zoom/1.25);draw()});button('Zoom out',()=>{zoom=Math.min(5,zoom*1.25);draw()});button('Reset view',()=>{angle=defaultViewAngle;elevation=.3;zoom=.62;draw()});}
 else{button('Zoom in',()=>{sceneZoom=Math.max(.015,sceneZoom/1.25);drawScene()});button('Zoom out',()=>{sceneZoom=Math.min(6,sceneZoom*1.25);drawScene()});}
 canvas.closest('#sceneWrap')?.after(buttons);if(model)canvas.after(buttons);
 // Keyboard orbit and zoom provide a non-pointer route through both inspectors.
 canvas.tabIndex=0;canvas.setAttribute('aria-label',model?'Model view. Arrow keys rotate; plus and minus zoom.':'Mission view. Arrow keys rotate; plus and minus zoom.');
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key))return;e.preventDefault();const right=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,up=e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0;
 if(model){angle+=right*.12;elevation=Math.max(-1.4,Math.min(1.4,elevation+up*.12));if(['+','='].includes(e.key))zoom/=1.15;if(e.key==='-')zoom*=1.15;draw();}
 else{sceneAngle+=right*.12;sceneElevation=Math.max(.06,Math.min(Math.PI/2,sceneElevation+up*.12));if(['+','='].includes(e.key))sceneZoom/=1.15;if(e.key==='-')sceneZoom*=1.15;drawScene();}
 });
 if(!model)new ResizeObserver(()=>{const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;canvas.width=sceneOverlay.width=Math.round(rect.width);canvas.height=sceneOverlay.height=Math.round(rect.height);drawScene()}).observe(canvas);
 // Hash-only navigation must select the model/mission, including browser Back.
 addEventListener('hashchange',async()=>{
  const id=decodeURIComponent(location.hash.slice(1));
  if(model){const r=catalogue.find(r=>r.name===id);if(r)await select(r,Number(new URLSearchParams(location.search).get('root'))||0)}
  else{const r=rows.find(r=>r.name===id);if(r){await select(r);const focus=new URLSearchParams(location.search).get('focus');if(focus&&[...$('sceneFocus').options].some(o=>o.value===focus)){$('sceneFocus').value=focus;await $('sceneFocus').onchange()}}}
 });
})();
