'use strict';
window.showCollisionField=function(field){
 const panel=document.getElementById('collisionField');panel.hidden=!field;
 if(!field)return;
 const canvas=document.getElementById('collisionMap'),ctx=canvas.getContext('2d');
 const scale=Math.max(1,Math.floor(420/Math.max(field.columns,field.rows)));
 canvas.width=field.columns*scale;canvas.height=field.rows*scale;
 const maximum=Math.max(...field.heights),cell=2**field.cell_shift;
 for(let row=0;row<field.rows;row++)for(let column=0;column<field.columns;column++){
  const code=field.cells[row*field.columns+column],height=field.heights[code];
  const shade=height?Math.max(30,Math.round(height*255/maximum)):0;
  ctx.fillStyle=`rgb(${shade},${shade},${shade})`;
  ctx.fillRect(column*scale,(field.rows-1-row)*scale,scale,scale);
 }
 const description=`${field.columns} × ${field.rows} cells · ${cell} world units per cell · height 0–${maximum}. X points right, Y points up. Brightness shows collision height, independently of the model palette. Hover to inspect.`;
 const info=document.getElementById('collisionInfo');info.textContent=description;
 canvas.onpointermove=e=>{
  const bounds=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-bounds.left)*field.columns/bounds.width),y=field.rows-1-Math.floor((e.clientY-bounds.top)*field.rows/bounds.height);
  if(x<0||y<0||x>=field.columns||y>=field.rows)return;
  const code=field.cells[y*field.columns+x];
  info.textContent=`Cell ${x}, ${y} · local X ${(x-field.origin[0])*cell}…${(x+1-field.origin[0])*cell-1}, Y ${(y-field.origin[1])*cell}…${(y+1-field.origin[1])*cell-1} · stored code ${code} → height ${field.heights[code]}`;
 };
 canvas.onpointerleave=()=>info.textContent=description;
};
