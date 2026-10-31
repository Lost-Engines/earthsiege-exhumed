/* Original GL equipment slots, model orientation and empty-slot replacement. */
'use strict';
globalThis.ESAssembly={
 findPart(shape,id){if(shape.id===id)return shape;for(const part of shape.parts||[]){const found=this.findPart(part,id);if(found)return found}return null},
 weaponOffset(mount,weapon){const offset=mount.position.slice();if(mount.orientation===0)offset[2]+=weapon.side_offset[2];else if(mount.orientation===1)offset[2]-=weapon.side_offset[2];else if(mount.orientation===2)offset[0]-=weapon.side_offset[0];else if(mount.orientation===3)offset[0]+=weapon.side_offset[0];return offset.map(ESMath.word)},
 instances({shape,transforms,assembly,equipment,weaponShapes,textureOffset=0,matrix=ES.ident(),cells=ESMath.cells(shape),disabled=[]}){
  const hiddenParts=new Set(assembly?.mounts.filter(m=>m.orientation<4).map(m=>m.part)||[]);
  const instances=[{shape,transforms,matrix,cells,hiddenParts}];let mounted=0,internal=0,omitted=0;
  for(const [index,mount]of (assembly?.mounts||[]).entries()){
   const id=equipment?.[mount.equipment_slot]??17;if(id===17||id<0||disabled[index])continue;
   if(mount.orientation>=4){internal++;continue}
   const weapon=modelAssemblies.weapons[id],root=weapon?.roots[mount.orientation],part=this.findPart(shape,mount.part);
   if(!part||!weaponShapes[root]){omitted++;continue}
   const translation=ES.ident();translation.splice(12,3,...this.weaponOffset(mount,weapon));
   instances.push({shape:weaponShapes[root],matrix:ES.mul(matrix,ES.mul(transforms[part.transform]||ES.ident(),translation)),textureOffset});mounted++;
  }
  return {instances,mounted,internal,omitted};
 }
};
