/* Mission loaders replace DPL placeholder ramps through SHADES.DAT and WLD.
 * Inspection distance is explicit and independent of the orbit camera. */
'use strict';
globalThis.ESWorld={
 terrainForModel(name){return {DESERT:0,TEMPER:1,ICE:2,URBAN:3}[name.split('/').pop().split('.')[0]]??0},
 paletteForModel(name){return this.paletteForWorld(this.terrainForModel(name)*6)},
 paletteForWorld(world){
  return mediaData.palettes.find(p=>p.name===`simvol0/dpl/WORLD${world-world%2}.DPL`);
 },
 modelClass(name){
  const stem=name.split('/').pop().split('.')[0];
  if(['DESERT','TEMPER','ICE','URBAN'].includes(stem))return 0;
  if(stem.startsWith('BASES')||stem==='BHULKS')return 5;
  return null;
 },
 shading(palette,kind,world=null,distance=0,radius=0){
  const name=world===null?palette.name.split('/').pop().split('.')[0]:'WORLD'+world;
  const environment=worldInspectionData.worlds[name];
  if(!environment||kind===null)return {ramps:palette.ramps,band:null,culled:false};
  const offset=kind===5||kind===8?environment.model_distance_offsets[kind===5&&radius>=5000?1:0]:0;
  const shadeDistance=kind===5?Math.max(0,distance+offset):distance;
  const clipDistance=Math.max(0,distance+offset),thresholds=environment.distance_bands[kind===0?1:0];
  let band=0;while(band+1<thresholds.length&&shadeDistance>=thresholds[band])band++;
  const ramps=palette.ramps.slice();
  for(const [slot,column]of worldInspectionData.shade_bindings[kind]||[]){
   const [first,count]=environment.shade_ranges[column][band];
   ramps[slot]=Array.from({length:count},(_,i)=>first+i);
  }
  return {ramps,band,culled:clipDistance>thresholds.at(-1)};
 },
 ramps(palette,kind,world=null,distance=0,radius=0){return this.shading(palette,kind,world,distance,radius).ramps}
};
