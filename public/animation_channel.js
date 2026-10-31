/* Original single-channel request/transition controller, including explicit
 * destination frames. Native traces: models/native-{channels,exact-channels}.json. */
'use strict';
globalThis.ESAnimationChannel=class{
 constructor(animation){
  this.animation=animation;
  for(const name of ['sequence','frame','next_sequence','next_frame','exit_frame','destination_sequence','destination_frame','transition_duration','transition_transform','requested_sequence','requested_frame','options','elapsed','duration','has_motion','rate','flags'])this[name]=0;
  this.motion=[0,0,0,0,0,0];this.accumulated=ESMath.identity();this.reset(0,0,0);
 }
 next(sequence,frame){const s=this.animation.sequences[sequence];return s.type==='cyclic_sequence'?(frame+1)%s.frames.length:Math.min(frame+1,s.frames.length-1)}
 previous(sequence,frame){const s=this.animation.sequences[sequence];return s.type==='cyclic_sequence'?(frame+s.frames.length-1)%s.frames.length:Math.max(frame-1,0)}
 setMotion(transform){const t=this.animation.transforms[transform];this.motion=[...t.slice(3),...t.slice(0,3)];this.has_motion=1}
 frameMotion(){
  const s=this.animation.sequences[this.sequence];
  if(s.ground_movement)this.setMotion(s.transform_indices[this.frame*s.part_list.length]);
  else this.has_motion=0;
 }
 reset(sequence,frame=0,elapsed=0){
  this.sequence=this.next_sequence=sequence;this.frame=frame;this.next_frame=this.next(sequence,frame);
  this.elapsed=elapsed;this.duration=this.animation.sequences[sequence].frames[frame][0];
  this.frameMotion();this.requested_frame=-1;this.requested_sequence=-1;this.options=0;this.exit_frame=-1;this.flags=1;
 }
 request(sequence,stop=false,frame=-1){
  this.requestError=null;
  this.requested_sequence=sequence;this.requested_frame=frame;this.options=stop?1:0;this.flags&=~1;
  if(sequence===-1||(sequence===this.sequence&&frame===this.frame&&this.elapsed===0)){this.flags|=1;this.exit_frame=-1;return}
  const s=this.animation.sequences[this.sequence];
  const start=this.rate<0?this.frame:this.next_frame;
  this.exit_frame=start;
  // Reversing inside a blend can supply a destination-sequence frame as a
  // source-frame index. Eight native exact-request probes run off the source
  // table and never finish their search. Keep the browser responsive.
  if(start<0||start>=s.frames.length){this.exit_frame=-1;this.requestError='No safe transition search during this blend; finish the blend before queuing again.';return}
  do{
   const [,count,index]=s.frames[this.exit_frame];
   for(let i=0;i<count;i++){
    const [duration,target,frame,transform]=this.animation.transitions[index+i];
    if(target!==sequence)continue;
    this.transition_duration=duration;this.destination_sequence=target;this.destination_frame=frame;this.transition_transform=transform;
    const destination=this.animation.sequences[target];
    if(this.requested_frame!==-1&&destination.type!=='cyclic_sequence'){
     const reachable=this.rate<0?frame>this.requested_frame:frame<this.requested_frame;
     if(!reachable&&!(frame===this.requested_frame&&this.elapsed===0))continue;
    }
    return;
   }
   const old=this.exit_frame;
   this.exit_frame=this.rate<0?this.previous(this.sequence,old):this.next(this.sequence,old);
   if(old===this.exit_frame)break;
  }while(this.exit_frame!==start);
  this.exit_frame=-1;
 }
 setRate(rate){
  rate=ESMath.word(rate);const changed=(this.rate<0)!==(rate<0);this.rate=rate;
  if(changed)this.request(this.requested_sequence,Boolean(this.options&1),this.requested_frame);
 }
 accumulate(reverse=false){
  if(!this.has_motion)return;
  const t={...ESMath.rotation(this.motion.slice(3)),translation:this.motion.slice(0,3)};
  if(reverse){
   for(const [a,b]of [[1,2],[4,6],[5,7]])[t.basis[a],t.basis[b]]=[t.basis[b],t.basis[a]];
   t.translation=ESMath.rotate(t.translation.map(v=>-v),t);
  }
  this.accumulated=ESMath.compose(t,this.accumulated);
 }
 reached(){
  if(this.sequence!==this.requested_sequence||(this.requested_frame!==-1&&this.frame!==this.requested_frame))return false;
  this.flags|=1;return Boolean(this.options&1);
 }
 advance(delta){
  if((this.flags&1)&&(this.options&1))return;
  const step=ESMath.word((ESMath.word(delta)*this.rate)>>8);if(!step)return;
  let elapsed=ESMath.word(this.elapsed+step),budget=65536;
  if(elapsed<0&&this.frame===0&&this.exit_frame!==0&&this.previous(this.sequence,0)===0)elapsed=0;
  if(elapsed===0){
   this.elapsed=0;
   if(this.flags&2){
    this.next_sequence=this.sequence;this.next_frame=this.next(this.sequence,this.frame);
    this.duration=this.animation.sequences[this.sequence].frames[this.frame][0];this.flags&=~2;this.frameMotion();
   }
   this.reached();return;
  }
  if(elapsed<0){
   do{
    if(!--budget)throw Error('Animation reverse loop');
    this.next_sequence=this.sequence;this.next_frame=this.frame;
    if(this.frame===this.exit_frame){
     this.sequence=this.destination_sequence;this.frame=this.destination_frame;this.duration=this.transition_duration;
     this.exit_frame=-1;this.flags|=2;this.setMotion(this.transition_transform);
    }else{
     this.frame=this.previous(this.sequence,this.frame);this.duration=this.animation.sequences[this.sequence].frames[this.frame][0];
     this.flags&=~2;this.frameMotion();
    }
    this.accumulate(true);
    if(-this.duration<=elapsed){this.elapsed=ESMath.word(this.duration+elapsed);elapsed=0}
    else{this.elapsed=0;elapsed=ESMath.word(elapsed+this.duration)}
    if(this.reached()){elapsed=0;this.elapsed=0}
   }while(elapsed<0);
   return;
  }
  while(elapsed!==0&&elapsed>=this.duration){
   if(!--budget)throw Error('Animation forward loop');
   this.accumulate();this.sequence=this.next_sequence;this.frame=this.next_frame;
   if(this.next_frame===this.exit_frame){
    this.next_sequence=this.destination_sequence;this.next_frame=this.destination_frame;
    elapsed=ESMath.word(elapsed-this.duration);this.duration=this.transition_duration;this.elapsed=0;
    this.exit_frame=-1;this.flags|=2;this.setMotion(this.transition_transform);
   }else{
    this.next_frame=this.next(this.next_sequence,this.next_frame);
    elapsed=ESMath.word(elapsed-this.duration);this.duration=this.animation.sequences[this.sequence].frames[this.frame][0];
    if(!this.duration)elapsed=0;
    this.elapsed=0;this.flags&=~2;this.frameMotion();
   }
   if(this.reached())elapsed=0;
  }
  this.elapsed=elapsed;
 }
};
ESAnimationChannel.prototype.fraction=function(){
 return this.duration?Math.trunc((Math.trunc(this.duration/2)+this.elapsed*1024)/this.duration)&65535:0;
};
ESAnimationChannel.prototype.localPoses=function(){
 const a=this.animation,s=a.sequences[this.sequence],next=a.sequences[this.next_sequence];
 const result=a.defaults.map(i=>a.transforms[i].slice()),count=s.part_list.length,fraction=this.fraction();
 for(let i=0;i<count;i++){
  const node=s.part_list[i];if(!node)continue;
  const from=s.transform_indices[this.frame*count+i],to=next.transform_indices[this.next_frame*count+i];
  result[node]=from===to?a.transforms[from].slice():ESMath.interpolate(a.transforms[from],a.transforms[to],fraction);
 }
 return result;
};
ESAnimationChannel.prototype.pose=function(){
 const poses=this.localPoses(),matrices=Array(poses.length).fill(null);
 for(const [parent,node]of this.animation.relations){
  const p=poses[node],local={...ESMath.rotation(p.slice(0,3)),translation:p.slice(3)};
  matrices[node]=parent>=0?ESMath.compose(local,matrices[parent]):local;
 }
 if(matrices.length)matrices[0]=ESMath.identity();return matrices;
};
ESAnimationChannel.prototype.rootMotion=function(){
 if(!this.has_motion||!this.duration)return this.accumulated;
 const part=this.motion.map(v=>Math.trunc(ESMath.word(v)*this.elapsed/this.duration));
 return ESMath.compose({...ESMath.rotation(part.slice(3)),translation:part.slice(0,3)},this.accumulated);
};
// Angle-driven channels sample a complete authored sequence at a Q14 phase.
ESAnimationChannel.prototype.setPhase=function(sequence,phase){
 const s=this.animation.sequences[sequence],total=ESMath.word(s.frames.reduce((sum,f)=>sum+f[0],0));
 let elapsed=ESMath.word(Math.floor(((total-1)*ESMath.word(phase)+8192)/16384)),frame=0;
 while(s.frames[frame][0]<=elapsed){elapsed-=s.frames[frame][0];if(++frame>=s.frames.length)throw Error('Phase outside original animation sequence')}
 this.reset(sequence,frame,elapsed);
};
ESAnimationChannel.combine=function(channels,priorities=null){
 if(!channels.length)return [];
 const a=channels[0].animation,poses=a.defaults.map(i=>a.transforms[i].slice());
 const order=channels.map((channel,index)=>({channel,index,priority:priorities?.[channel.sequence]??a.sequences[channel.sequence].priority})).sort((a,b)=>a.priority-b.priority);
 for(const {channel}of order.reverse()){
  const local=channel.localPoses();for(const node of a.sequences[channel.sequence].part_list)if(node)poses[node]=local[node];
 }
 return poses;
};
ESAnimationChannel.hierarchy=function(animation,poses){
 const matrices=Array(poses.length).fill(null);
 for(const [parent,node]of animation.relations){const p=poses[node],local={...ESMath.rotation(p.slice(0,3)),translation:p.slice(3)};matrices[node]=parent>=0?ESMath.compose(local,matrices[parent]):local}
 if(matrices.length)matrices[0]=ESMath.identity();return matrices;
};
