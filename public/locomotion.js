/* Independent normal-player locomotion reconstruction, checked against DBSIM
 * 0x11afc / 0x12038 / 0x14148. Collision, damage and AI are separate consumers. */
'use strict';
globalThis.ESLocomotion=class{
 constructor(profile,channel,state){this.profile=profile;this.channel=channel;Object.assign(this,structuredClone(state));delete this.initial;this.channel=channel}
 scale(a,b,bits=8){return ESMath.word(Math.floor((a*b+2**(bits-1))/2**bits))}
 approach(value,target,step){return target<value?Math.max(target,ESMath.word(value-step)):target>value?Math.min(target,ESMath.word(value+step)):value}
 cancel(){const c=this.channel;c.requested_sequence=c.requested_frame=c.exit_frame=-1;c.flags=1;c.options=0}
 control(axis,steer){
  const p=this.profile.values,s=this.profile.sequences,c=this.channel;
  if(Math.abs(axis)>60?axis<=0:this.throttle>=0)steer=ESMath.word(-steer);
  const change=this.scale(-axis,145);
  if(change){const next=ESMath.word(this.throttle+change);this.throttle=(this.throttle&4095)&&(next<0)!==(this.throttle<0)?0:Math.max(-1024,Math.min(1024,next))}
  const desired=this.scale(this.throttle,this.throttle<0?-p['04']:p['06'],10);
  const previous=this.speed;this.speed=this.approach(this.speed,Math.max(p['04'],Math.min(p['06'],desired)),p['08']);steer=Math.max(-256,Math.min(256,steer));
  const turnPose=c.sequence===s.turn_in_place,stopPose=c.sequence===s.forward_start_stop||c.sequence===s.reverse_start_stop;
  let special=false,magnitude=Math.abs(this.speed),previousMagnitude=Math.abs(previous);
  if(magnitude&&turnPose&&!stopPose){steer=0;magnitude=0;this.speed=0}
  if(c.sequence===c.next_sequence){
   if(previousMagnitude<magnitude){
    if(!stopPose){
     if(c.sequence===s.movement){this.animation_rate=this.speed;if(c.requested_sequence===s.forward_start_stop||c.requested_sequence===s.reverse_start_stop)this.cancel();if(this.speed>p['2e']&&c.requested_sequence!==s.fast_movement)c.request(s.fast_movement)}
     else this.cancel();
    }else{
     if(this.speed<1){this.speed=Math.max(this.speed,-p['2e']);this.animation_rate=Math.min(this.speed,-60)}else{this.speed=Math.min(this.speed,p['2e']);this.animation_rate=Math.max(this.speed,60)}
     special=true;
     if(c.requested_sequence!==s.movement){c.reset(this.speed<0?s.reverse_start_stop:s.forward_start_stop);c.request(s.movement)}
    }
   }else if(magnitude<previousMagnitude){
    if(c.sequence===s.fast_movement){
     if(magnitude<p['2e']){this.speed=previous<1?p['6e']:p['2e'];this.animation_rate=this.speed;if(c.requested_sequence!==s.movement)c.request(s.movement)}else this.cancel();
    }else if(c.sequence===s.movement){
     if(!magnitude){this.animation_rate=0;if(!stopPose){const destination=previous<1?s.reverse_start_stop:s.forward_start_stop;if(c.requested_sequence!==destination)c.request(destination);this.animation_rate=previous<1?-100:100;special=true}}
     else if(c.requested_sequence===s.fast_movement)this.cancel();
    }
   }else if(!magnitude){
    if(Math.abs(steer)<51||!(stopPose||turnPose)){
     if(turnPose&&!stopPose){if(c.requested_sequence!==s.forward_start_stop)c.request(s.forward_start_stop);this.animation_rate=this.animation_rate>0?100:-100}
    }else if(!turnPose){
     if(c.requested_sequence!==s.turn_in_place){c.reset(steer<0?s.reverse_start_stop:s.forward_start_stop);c.request(s.turn_in_place)}
     this.animation_rate=steer<0?-100:100;
    }else this.animation_rate=this.scale(350,steer,10);
   }else this.animation_rate=this.speed;
  }else this.speed=previous;
  const absolute=Math.abs(this.speed);let steering=0;
  if(!special&&absolute>=45){const span=p['06']-45,half=span>>1,amount=absolute-45;steering=amount>half?p['02']-Math.trunc(p['02']*(amount-half)/((span-half)*2)):Math.trunc(p['02']*amount/half)}
  this.turn=this.approach(this.turn,this.scale(steer,steering),p['0a']);this.angles[2]=(this.angles[2]+this.turn)&65535;
 }
 advance(axis,steer,ratio){
  this.control(axis,steer);const c=this.channel;c.setRate(this.animation_rate);
  // Rebase accumulated root movement to the current interpolated position.
  c.accumulated=ESMath.identity();
  if(c.has_motion){const part=c.motion.map(v=>Math.trunc(ESMath.word(v)*c.elapsed/c.duration)),inverse=ESMath.rotation(part.slice(3));for(const [a,b]of [[1,2],[4,6],[5,7]])[inverse.basis[a],inverse.basis[b]]=[inverse.basis[b],inverse.basis[a]];inverse.translation=ESMath.rotate(part.slice(0,3).map(v=>-v),inverse);c.accumulated=inverse}
  c.advance(this.scale(100,ratio));
  const movement=c.rootMotion(),rotation=ESMath.rotation(this.angles);
  this.position=ESMath.rotate(movement.translation,rotation).map((v,i)=>(v+this.position[i])|0);
  // Normal locomotion has only planar root rotation. Reject unexpected tilt.
  if(movement.basis[4]||movement.basis[5])throw Error('Non-planar locomotion needs the general native matrix-angle consumer');
  this.angles[2]=(this.angles[2]+ESLocomotion.atan(movement.basis[3],-movement.basis[2]))&65535;
 }
};
ESLocomotion.atan=(x,y)=>{
 if(!(x||y))x=1;const ax=Math.abs(x),ay=Math.abs(y),ratio=(a,b)=>{const product=BigInt(a)*512n;return Number(((product&~0xffffffffn)|((product+BigInt(b>>1))&0xffffffffn))/BigInt(b))};let angle=0;
 if(ay<=ax){if(ay){const q=ratio(ay,ax);angle=q?q*4+modelAtan[q]:0}}else{const q=ratio(ax,ay);angle=4096-(q?q*4+modelAtan[q]:0)}
 if(x<0)angle=8192-angle;if(y<0)angle=16384-angle;return angle*4&65535;
};
