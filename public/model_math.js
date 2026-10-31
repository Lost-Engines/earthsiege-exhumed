/* Earthsiege 1 fixed-point model math, checked against isolated original code.
 * Native matrices store xx/xy/yx/yy/xz/yz/zx/zy/zz, not row/column order.
 * Conversion to WebGL is deliberately the last operation in the preview. */
'use strict';
globalThis.ESMath={};
ESMath.word=x=>x<<16>>16;
ESMath.round=x=>Math.floor((x+8192)/16384)|0;
ESMath.identity=()=>({basis:[16384,0,0,16384,0,0,0,0,16384],type:0,flags:0,translation:[0,0,0]});
ESMath.cos=angle=>{const a=ESMath.word(angle),sample=(a>>4)+((a>>3)&1),i=Math.abs(sample);return (i<1024?modelCosine[i]:-modelCosine[2048-i])|0};
ESMath.rotation=angles=>{
 const [a,b,c]=angles,C=ESMath.cos,W=ESMath.word,R=ESMath.round,t=ESMath.identity();
 if(!a&&!b){if(!c)return t;const co=C(c),si=C(c-16384);t.basis=[co,si,W(-si),co,0,0,0,0,16384];t.type=1;return t}
 const s=C(a-16384),pc=(C(b-c)+C(b+c))>>1,mc=(C(b-c)-C(b+c))>>1,ps=(C(b+c-16384)+C(c-b-16384))>>1,ms=(C(b+c-16384)-C(c-b-16384))>>1;
 t.basis=[W(pc-R(s*mc)),W(ps+R(s*ms)),W(-((C(c-a-16384)+C(c+a-16384))>>1)),W((C(a-c)+C(c+a))>>1),W(-(C(b-a-16384)+C(b+a-16384))>>1),W(s),W(ms+R(s*ps)),W(mc-R(s*pc)),W((C(a-b)+C(b+a))>>1)];t.type=a?3:2;return t;
};
ESMath.matrixRows=t=>{const m=t.basis;return [[m[0],m[2],m[6]],[m[1],m[3],m[7]],[m[4],m[5],m[8]]]};
ESMath.rotate=(v,t,inverse=false,full=false)=>{if(!t.type&&!full)return v.slice();const m=ESMath.matrixRows(t);return m.map((row,r)=>!full&&t.type===1&&r===2?v[2]:ESMath.round(v.reduce((sum,value,c)=>sum+value*(inverse?m[c][r]:row[c]),0)))};
ESMath.point=(v,t)=>{const m=ESMath.matrixRows(t);return m.map((row,r)=>((!t.type||(t.type===1&&r===2)?v[r]:((v.reduce((sum,value,c)=>sum+value*row[c],8192)|0)>>14))+t.translation[r])|0)};
ESMath.plane=(eye,t,normal)=>ESMath.rotate(eye.map((v,i)=>(v-t.translation[i])|0),t,true,true).reduce((s,v,i)=>s+v*normal[i],0)|0;
ESMath.compose=(a,b)=>{
 let t=ESMath.identity();if(!a.type)t={...b,basis:b.basis.slice()};else if(!b.type)t={...a,basis:a.basis.slice()};else{const A=ESMath.matrixRows(a),B=ESMath.matrixRows(b),m=B.map(row=>A[0].map((_,c)=>ESMath.word(ESMath.round(row.reduce((sum,x,k)=>sum+x*A[k][c],0)))));t.basis=[m[0][0],m[1][0],m[0][1],m[1][1],m[2][0],m[2][1],m[0][2],m[1][2],m[2][2]];t.type=a.type===1&&b.type===1?1:2}
 t.translation=ESMath.rotate(a.translation,b).map((v,i)=>(v+b.translation[i])|0);return t;
};
ESMath.interpolate=(a,b,fraction)=>a.map((v,i)=>{const delta=ESMath.word(b[i]-v),out=v+((delta*fraction)>>10);return i<3?out&65535:ESMath.word(out)});
ESMath.pose=(shape,sequence=-1,frame=0,fraction=0)=>{
 const animation=(shape.extras||[]).find(x=>x.type==='animation_list');if(!animation)return (shape.node_transforms||[]).map(a=>({basis:a.slice(0,9),type:a[9],flags:a[10],translation:a.slice(11)}));
 const poses=animation.defaults.map(i=>animation.transforms[i].slice()),seq=animation.sequences[sequence];
 if(seq){const next=seq.type==='cyclic_sequence'?(frame+1)%seq.frames.length:Math.min(frame+1,seq.frames.length-1);for(let i=0;i<seq.part_list.length;i++){const node=seq.part_list[i];if(node)poses[node]=ESMath.interpolate(animation.transforms[seq.transform_indices[frame*seq.part_list.length+i]],animation.transforms[seq.transform_indices[next*seq.part_list.length+i]],fraction)}}
 const matrices=Array(poses.length).fill(null);
 for(const [parent,node]of animation.relations){const p=poses[node],local={...ESMath.rotation(p.slice(0,3)),translation:p.slice(3)};matrices[node]=parent>=0?ESMath.compose(local,matrices[parent]):local}
 if(matrices.length)matrices[0]=ESMath.identity();return matrices;
};
// The resource reader (0x65d04) zeroes a separate default-state array.
// Stored cell_frame_counts are cycle lengths, never initial frame indices.
ESMath.cells=shape=>Array((shape.cell_frame_counts||[]).length).fill(0);
ESMath.webgl=t=>{const m=t.basis;return [m[0]/16384,m[1]/16384,m[4]/16384,0,m[2]/16384,m[3]/16384,m[5]/16384,0,m[6]/16384,m[7]/16384,m[8]/16384,0,...t.translation,1]};
// Isolated channel stepping with no queued transition request. Game actors set
// Q8 rates independently; 256 is unity. At nominal simulation pacing, delta
// 100 represents 100 ms (DBSIM 0x63fa4 -> 0x14148 -> 0x62718).
ESMath.advanceFrame=(sequence,state,delta,rate=256)=>{
 const next=frame=>sequence.type==='cyclic_sequence'?(frame+1)%sequence.frames.length:Math.min(frame+1,sequence.frames.length-1),result={...state},step=ESMath.word((ESMath.word(delta)*ESMath.word(rate))>>8);if(!step)return result;
 let elapsed=ESMath.word(result.elapsed+step);if(elapsed<0)throw Error('Reverse/overflow channel stepping requires the full transition controller');let budget=65536;
 while(elapsed!==0&&elapsed>=result.duration){if(!--budget)throw Error('Animation frame loop');result.frame=result.next;result.next=next(result.frame);elapsed-=result.duration;result.duration=sequence.frames[result.frame][0];if(!result.duration)elapsed=0}
 result.elapsed=elapsed;return result;
};
// Primary explosion controller (0x5d74 / 0x6410c). Countdown overshoot is
// discarded; cell completion removes the effect instead of looping forever.
ESMath.effectStep=(definition,state,ratio)=>{
 const result={...state,cells:state.cells.slice()};result.timer=Math.max(0,ESMath.word(result.timer-ESMath.word(ratio)));
 if(result.timer)return result;
 if(definition.cell<0){result.done=true;return result}
 const index=definition.cell;result.cells[index]=(result.cells[index]+1)%definition.frame_counts[index];
 if(!result.cells[index])result.done=true;else result.timer=definition.reset;
 return result;
};
