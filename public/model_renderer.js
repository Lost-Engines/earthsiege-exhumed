/* Inspection rendering with original palette indices, surface sides and textures.
 * Uses a depth buffer, not the original painter/BSP implementation. */
'use strict';
window.ES={};
ES.ident=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
ES.mul=(a,b)=>{const r=Array(16).fill(0);for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(let k=0;k<4;k++)r[j*4+i]+=a[k*4+i]*b[j*4+k];return r};
ES.transform=(v,m)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]];
ES.matrix=t=>ESMath.webgl({...ESMath.rotation(t.slice(0,3)),translation:t.slice(3)});
ES.pose=(shape,sequence=-1,frame=0,fraction=0)=>ESMath.pose(shape,sequence,frame,fraction).map(t=>t?ESMath.webgl(t):null);
ES.Renderer=class{
 constructor(canvas){this.canvas=canvas;const gl=this.gl=canvas.getContext('webgl2',{antialias:false});if(!gl)throw Error('WebGL2 required');const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};const p=this.program=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,`#version 300 es
in vec3 position;in vec2 uv;in vec4 surface;
in vec2 polygon0;in vec2 polygon1;in vec2 polygon2;in vec2 polygon3;in float polygonSize;
uniform mat4 projection;out vec2 texUV;flat out vec4 sides;out vec2 shadeIndices;
flat out vec2 polygon[4];flat out int polygonCount;
void main(){
 gl_Position=projection*vec4(position,1.);
 // Give texture overlays a few depth-buffer units of priority over their
 // coplanar support face. The original layers these with painter ordering.
 if(polygonSize>0.)gl_Position.z-=0.000001*gl_Position.w;
 gl_PointSize=1.;texUV=uv;sides=surface;shadeIndices=surface.xy;
 polygon[0]=polygon0;polygon[1]=polygon1;polygon[2]=polygon2;polygon[3]=polygon3;polygonCount=int(polygonSize);
}`));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,`#version 300 es
precision highp float;precision highp sampler2DArray;in vec2 texUV;flat in vec4 sides;in vec2 shadeIndices;uniform sampler2D palette;uniform sampler2D shadeMaps;uniform sampler2DArray bank;uniform int textureCount;out vec4 pixel;
flat in vec2 polygon[4];flat in int polygonCount;
vec2 polygonUV(){
 if(polygonCount<3)return texUV;
 // Original ordinary-view mapping walks screen columns across the whole
 // polygon. Interpolating across a GPU triangle diagonal kinks the artwork.
 vec2 corners[4]=vec2[4](vec2(0.,0.),vec2(1.,0.),vec2(1.,1.),vec2(0.,1.));
 float lower=1.e30,upper=-1.e30;vec2 lowUV=vec2(0.),highUV=vec2(0.);
 for(int i=0;i<4;i++){
  if(i>=polygonCount)break;int j=(i+1)%polygonCount;
  // The original translated-texture back-face path reverses projected
  // positions, retaining the texture-corner order.
  vec2 a=polygon[gl_FrontFacing?i:polygonCount-1-i],b=polygon[gl_FrontFacing?j:polygonCount-1-j];
  float dx=b.x-a.x;if(abs(dx)<.00001)continue;
  float t=(gl_FragCoord.x-a.x)/dx;if(t<0.||t>1.)continue;
  float y=mix(a.y,b.y,t);vec2 at=mix(corners[i],corners[j],t);
  if(y<lower){lower=y;lowUV=at;}if(y>upper){upper=y;highUV=at;}
 }
 if(upper-lower<.00001)return texUV;
 return mix(lowUV,highUV,clamp((gl_FragCoord.y-lower)/(upper-lower),0.,1.));
}
void main(){float value=gl_FrontFacing?sides.x:sides.y;float mode=gl_FrontFacing?sides.z:sides.w;if(mode<0.)discard;if(mode==10.){value=floor((gl_FrontFacing?shadeIndices.x:shadeIndices.y)+0.0001);}else if(mode>0.){if(value<0.||value>=float(textureCount))discard;value=floor(texture(bank,vec3(polygonUV(),value)).r*255.+.5);if(value==0.&&mode<=1.)discard;if(mode>1.)value=floor(texelFetch(shadeMaps,ivec2(int(value),int(mode)-2),0).r*255.+.5);}pixel=texelFetch(palette,ivec2(int(value),0),0);}`));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);gl.enable(gl.DEPTH_TEST);gl.frontFace(gl.CW);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);for(const [name,size,offset]of [['position',3,0],['uv',2,12],['surface',4,20]]){const at=gl.getAttribLocation(p,name);gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,36,offset)}this.mappingBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.mappingBuffer);this.mappingAttributes=[];
for(const [name,size,offset]of [['polygon0',2,0],['polygon1',2,8],['polygon2',2,16],['polygon3',2,24],['polygonSize',1,32]]){const at=gl.getAttribLocation(p,name);this.mappingAttributes.push(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,36,offset);gl.disableVertexAttribArray(at);gl.vertexAttrib1f(at,0)}
this.projection=gl.getUniformLocation(p,'projection');this.palette=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.palette);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.uniform1i(gl.getUniformLocation(p,'palette'),0);this.bank=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.bank);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(p,'bank'),1);this.textureCount=0;this.setPalette(window.mediaData.palettes.find(p=>p.name==='simvol0/dpl/WORLD0.DPL')||window.mediaData.palettes[0]);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.bank);gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.R8,1,1,1,0,gl.RED,gl.UNSIGNED_BYTE,new Uint8Array([0]));}
 setPalette(p){this.pal=p;const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.palette);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,256,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array(p.rgb));this.shadeMaps??=gl.createTexture();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.shadeMaps);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);const maps=globalThis.modelTextureShading?.[p.name]||Array.from({length:8},()=>Array.from({length:256},(_,i)=>i));gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,256,8,0,gl.RED,gl.UNSIGNED_BYTE,new Uint8Array(maps.flat()));gl.uniform1i(gl.getUniformLocation(this.program,'shadeMaps'),2);}
 async setBank(names){
  const serial=this.ticket=(this.ticket||0)+1;names=[...new Set((Array.isArray(names)?names:[names]).filter(Boolean))];this.textureCount=0;this.frames=[];this.bankOffsets={};const resources=names.map(name=>mediaData.images.find(r=>r.name===name)).filter(Boolean);if(!resources.length)return;
  const banks=await Promise.all(resources.map(r=>EarthsiegeData.load('../media/pixels/'+r.name+'.json')));if(serial!==this.ticket)return;
  const images=banks.flatMap(r=>r.frames),size=Math.max(...images.flatMap(f=>[f.width,f.height])),bytes=new Uint8Array(size*size*images.length);this.bankOffsets={};let offset=0;for(let i=0;i<resources.length;i++){this.bankOffsets[resources[i].name]=offset;offset+=banks[i].frames.length}
  for(let i=0;i<images.length;i++){const frame=images[i],pixels=EarthsiegeData.bytes(frame.indices);for(let y=0;y<size;y++)for(let x=0;x<size;x++)bytes[i*size*size+y*size+x]=pixels[Math.min(frame.height-1,Math.floor(y*frame.height/size))*frame.width+Math.min(frame.width-1,Math.floor(x*frame.width/size))]}
  const gl=this.gl;gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.bank);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.R8,size,size,images.length,0,gl.RED,gl.UNSIGNED_BYTE,bytes);this.textureCount=images.length;this.frames=images;
 }
 geometry(instances,{cell=-1,cellSequence=-1,lod=-1,edges=false}={}){
  const triangles=[],lines=[],dots=[],points=[],sprites=[],textureQuads=[];
  let faces=0,textured=0,billboards=0,invalid=0;
  const palette=this.pal,worldLights=this.lights||[modelDefaultLight];
  for(const {shape,matrix=ES.ident(),transforms=[],hiddenParts=new Set(),textureOffset=0,cells=ESMath.cells(shape),materialRamps=palette.ramps}of instances){
  const shade=(value,intensity)=>{
   const ramp=materialRamps?.[value];
   return ramp?.length?ramp[(intensity*ramp.length)>>8]:value&255;
  };
   const visit=s=>{
    if(s.id&&hiddenParts.has(s.id))return;
    if(s.type==='detail'){
     const index=lod<0?s.parts.length-1:Math.min(lod,s.parts.length-1);
     if(s.parts[index])visit(s.parts[index]);return;
    }
    if(s.type==='cell_animation'){
     const override=cell>=0&&(cellSequence<0||cellSequence===s.animation_sequence),frame=override?cell:(cells[s.animation_sequence]||0);
     if(s.parts.length)visit(s.parts[(frame&65535)%s.parts.length]);return;
    }
    if(s.type==='billboard'){
     billboards++;
     const bitmap=s.bitmap+textureOffset,frame=this.frames?.[bitmap];
     if(frame){
      const m=ES.mul(matrix,transforms[s.transform]||ES.ident()),anchor=ES.transform(s.centre,m),unit=s.radius/64;
      sprites.push({anchor,unit,bitmap,width:frame.width,height:frame.height,x:s.x_offset,y:s.y_offset});
      const bound=Math.max(frame.width,frame.height)*unit;
      points.push(anchor.map(v=>v-bound),anchor.map(v=>v+bound));
     }
     return;
    }
    if(s.points){
     const m=ES.mul(matrix,transforms[s.transform]||ES.ident()),verts=s.points.map(v=>ES.transform(v,m));
     const lights=ESLighting.forObject(worldLights,m);
     for(const p of s.polygons){
      if(p.type==='polygon'||!p.vertex_count)continue;
      const indices=s.indices.slice(p.vertex_list,p.vertex_list+p.vertex_count),face=indices.map(i=>verts[i]);
      if(face.some(v=>!v)){invalid++;continue}
      const colour=p.colour_index||0,raw=s.colours[colour],back=s.colours[colour+2]||raw;
      if(!raw)continue;
      const pair=r=>[r[0]+r[1]*256,r[2]+r[3]*256];
      let [front,ff]=pair(raw),[rear,bf]=pair(back);
      const texture=p.type==='textured_polygon',gouraud=p.type.includes('gouraud');
      const normal=s.points[p.normal]||[0,0,2048],centre=s.points[p.centre_index]||[0,0,0];
      const illuminate=(point,normal,back=false)=>ESLighting.intensity(lights,point,back?normal.map(v=>ESMath.word(-v)):normal);
      const light=illuminate(centre,normal),backLight=illuminate(centre,normal,true);
      const baseFront=front,baseRear=rear;
      let fm=texture?1:0,bm=fm;
      if(texture){
       front+=textureOffset;rear+=textureOffset;
       fm=front>=this.textureCount?-1:2+Math.floor(7*light/255);
       bm=rear>=this.textureCount?-1:2+Math.floor(7*backLight/255);
      }else{
       if((ff&0x1400)===0x1400)fm=-1;
       if((bf&0x1400)===0x1400)bm=-1;
       if(p.type.includes('shaded')||gouraud){front=shade(front,light);rear=shade(rear,backLight)}
      }
      if(fm<0&&bm<0){invalid++;continue}
      // IDs and texture-lighting rows are discrete. Only Gouraud palette
      // indices may interpolate; interpolating a constant ID then truncating
      // it creates a speckle of the preceding colour/row through roundoff.
      if(gouraud){if(fm>=0)fm=10;if(bm>=0)bm=10}
      const sides=[front,rear,fm,bm];
      if(face.length<3){
       const colour=fm>=0?front:rear,packed=face.flatMap(v=>[...v,0,0,colour,colour,0,0]);
       (face.length===1?dots:lines).push(...packed);points.push(...face);continue;
      }
      const uv=[[0,0],[1,0],[1,1],[0,1]];
      if(texture&&face.length<=4)textureQuads.push({first:triangles.length/9,count:(face.length-2)*3,points:face});
      for(let j=1;j+1<face.length;j++)for(const k of [0,j,j+1]){
       let colours=sides;
       if(gouraud){
        const vertex=s.points[indices[k]],vertexNormal=s.points[s.indices[p.normal_list+k]]||normal;
        colours=[shade(baseFront,illuminate(vertex,vertexNormal)),shade(baseRear,illuminate(vertex,vertexNormal,true)),fm,bm];
       }
       triangles.push(...face[k],...(uv[k]||[0,0]),...colours);
      }
      if(edges)for(let j=0;j<face.length;j++)for(const pt of [face[j],face[(j+1)%face.length]])lines.push(...pt,0,0,103,103,0,0);
      points.push(...face);faces++;if(texture)textured++;
     }
    }
    for(const part of s.parts||[])visit(part);
   };
   visit(shape);
  }
  return {triangles,lines,dots,points,sprites,textureQuads,faces,textured,billboards,invalid};
 }
 textureMapping(geometry,vertexCount){
  const values=new Float32Array(vertexCount*9),m=this.viewProjection,c=this.canvas;
  for(const face of geometry.textureQuads||[]){
   const packed=Array(9).fill(0);let valid=true;
   for(const [i,[x,y,z]]of face.points.entries()){
    const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0){valid=false;break}
    packed[i*2]=(1+(m[0]*x+m[4]*y+m[8]*z+m[12])/w)*c.width/2;
    packed[i*2+1]=(1+(m[1]*x+m[5]*y+m[9]*z+m[13])/w)*c.height/2;
   }
   if(!valid)continue;packed[8]=face.points.length;
   for(let i=face.first;i<face.first+face.count;i++)values.set(packed,i*9);
  }
  return values;
 }
 billboardTriangles(sprites,right,up){const triangles=[];for(const s of sprites){const point=(x,y)=>s.anchor.map((v,i)=>v+right[i]*(x-s.x)*s.unit+up[i]*(s.y-y)*s.unit),corners=[point(0,0),point(s.width,0),point(s.width,s.height),point(0,s.height)],uv=[[0,0],[1,0],[1,1],[0,1]];for(const i of [0,1,2,0,2,3])triangles.push(...corners[i],...uv[i],s.bitmap,s.bitmap,1,1)}return triangles;}
 draw(geometry,{angle=.7,elevation=.3,zoom=1,centre=null,radius=null}={}){const gl=this.gl,c=this.canvas;gl.clearColor(.04,.06,.08,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(!geometry.points.length)return;const bounds=[0,1,2].map(i=>geometry.points.reduce((b,p)=>[Math.min(b[0],p[i]),Math.max(b[1],p[i])],[Infinity,-Infinity]));centre??=bounds.map(b=>(b[0]+b[1])/2);radius??=Math.max(...bounds.map(b=>b[1]-b[0]))/2||1;const co=Math.cos(angle),si=Math.sin(angle),ce=Math.cos(elevation),se=Math.sin(elevation),aspect=c.width/c.height,f=1.4/zoom,view=[co,-si*se,si*ce,0,si,co*se,-co*ce,0,0,ce,se,0,0,0,0,1];view[12]=-(co*centre[0]+si*centre[1]);view[13]=-(-si*se*centre[0]+co*se*centre[1]+ce*centre[2]);view[14]=-(si*ce*centre[0]-co*ce*centre[1]+se*centre[2])-radius*3;const near=radius*.003,far=radius*20,perspective=[f/aspect,0,0,0,0,f,0,0,0,0,-(far+near)/(far-near),-1,0,0,-2*far*near/(far-near),0];this.viewProjection=ES.mul(perspective,view);gl.uniformMatrix4fv(this.projection,false,new Float32Array(this.viewProjection));gl.uniform1i(gl.getUniformLocation(this.program,'textureCount'),this.textureCount);gl.viewport(0,0,c.width,c.height);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([...geometry.triangles,...this.billboardTriangles(geometry.sprites||[],[co,si,0],[-si*se,co*se,ce])]),gl.DYNAMIC_DRAW);const vertexCount=(geometry.triangles.length+(geometry.sprites?.length||0)*54)/9;
gl.bindBuffer(gl.ARRAY_BUFFER,this.mappingBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.textureMapping(geometry,vertexCount),gl.DYNAMIC_DRAW);for(const at of this.mappingAttributes)gl.enableVertexAttribArray(at);
gl.drawArrays(gl.TRIANGLES,0,vertexCount);
for(const at of this.mappingAttributes){gl.disableVertexAttribArray(at);gl.vertexAttrib1f(at,0)}gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);if(geometry.lines.length){gl.depthFunc(gl.LEQUAL);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geometry.lines),gl.DYNAMIC_DRAW);gl.drawArrays(gl.LINES,0,geometry.lines.length/9);gl.depthFunc(gl.LESS)}if(geometry.dots?.length){gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geometry.dots),gl.DYNAMIC_DRAW);gl.drawArrays(gl.POINTS,0,geometry.dots.length/9)}}
};
