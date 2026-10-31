/* Original Earthsiege light arithmetic. Native comparisons are retained in
 * models/native-lighting.json. All light vectors below are in object space. */
'use strict';
globalThis.ESLighting = {};
ESLighting.distance = v => {
  const [a,b,c] = v.map(x=>Math.abs(x|0)).sort((a,b)=>b-a);
  return (a+(b>>2)+(b>>4)+(b>>5)+(c>>2))|0;
};
ESLighting.transform = (light,t) => ({
  ...light,
  position: ESMath.rotate(light.position,t).map((v,i)=>(v+t.translation[i])|0),
  direction: ESMath.rotate(light.direction,t).map(ESMath.word)
});
ESLighting.intensity = (lights,point,normal=null,terrain=false) => {
  const dot=(a,b)=>a.reduce((s,v,i)=>(s+Math.imul(v,b[i]))|0,0);
  const divide=(a,b)=>Math.trunc(a/b)|0;
  let total=0;
  for(const light of lights){
    let contribution=0;
    if(light.kind===0 || (light.kind===1&&!normal))contribution=light.intensity;
    else if(light.kind===1){
      let facing=dot(normal,light.direction);
      // Model polygons use a wrapped directional response; terrain uses the
      // unwrapped dot product. Reversing a face means negating its normal.
      if(!terrain)facing=((facing-0x400000)|0)>>1;
      if(facing<0)contribution=-(Math.imul(light.intensity,facing)>>22);
    }else if(light.kind===2){
      const delta=light.position.map((v,i)=>(v-point[i])|0),distance=ESLighting.distance(delta);
      const facing=normal?dot(normal,delta):1;
      if(facing>0){
        const incidence=normal?divide(facing,distance+1):2047;
        const attenuation=divide(Math.imul(light.scale,incidence),(light.attenuation+distance)|0);
        contribution=Math.imul(light.intensity,attenuation)>>11;
      }
    }
    total=(total+contribution)|0;
  }
  return Math.min(255,total)&255;
};
// Convert a preview's rigid object transform back to its original Q14 basis,
// then transform the world lights into object space, as DBSIM 5c140/5b8b4 do.
ESLighting.forObject = (lights,m) => {
  const t={basis:[m[0],m[4],m[1],m[5],m[8],m[9],m[2],m[6],m[10]].map(v=>ESMath.word(Math.round(v*16384))),type:2,translation:[0,0,0]};
  if(t.basis.every((v,i)=>v===ESMath.identity().basis[i]))t.type=0;
  else if(t.basis[4]===0&&t.basis[5]===0&&t.basis[6]===0&&t.basis[7]===0&&t.basis[8]===16384)t.type=1;
  t.translation=ESMath.rotate(m.slice(12,15).map(v=>-Math.round(v)),t);
  return lights.map(light=>ESLighting.transform(light,t));
};
