#!/usr/bin/env python3
"""Import original-code article captures and generate explanatory SVG diagrams.

Run the analysis tools/build_graphics_article.py first. This importer needs only
Python's standard library. Building or deploying the site needs neither Python
nor the private analysis workspace.
"""
from pathlib import Path
import json,shutil,hashlib,sys
site=Path(__file__).resolve().parents[1]
root=Path(sys.argv[1] if len(sys.argv)>1 else site.parent/'earthsiege-reverse').resolve()
src=root/'analysis/graphics-engine'; dst=site/'public/graphics';dst.mkdir(parents=True,exist_ok=True)
meta=json.loads((src/'provenance.json').read_text())
files=[row['file']for row in meta['images']]+['model-progress.json','gouraud-bands.json','texture-quad.json','palette.json','provenance.json']
for name in files:shutil.copy2(src/name,dst/name)
BG='#101b24';FG='#d9e5e8';MUT='#9fb5bd';TEAL='#7cc3b6';GOLD='#edcb81';RED='#e7987d'
def svg(name,w,h,title,desc,body):
 txt=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc"><title id="title">{title}</title><desc id="desc">{desc}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 Z" fill="{TEAL}"/></marker></defs><rect width="{w}" height="{h}" rx="4" fill="{BG}"/><g font-family="system-ui,sans-serif" font-size="18" fill="{FG}">{body}</g></svg>'''
 (dst/name).write_text(txt+'\n')
def text(x,y,s,fill=FG,size=18,anchor='start'):return f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}" text-anchor="{anchor}">{s}</text>'
def line(x,y,x2,y2,colour=TEAL,arrow=False,dash=False):return f'<path d="M{x},{y} L{x2},{y2}" fill="none" stroke="{colour}" stroke-width="2"'+(' marker-end="url(#arrow)"'if arrow else'')+(' stroke-dasharray="7 6"'if dash else'')+'/>'
def rect(x,y,w,h,fill='#1b303a',stroke=TEAL):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="{fill}" stroke="{stroke}"/>'
b=''
for i,(a,c)in enumerate([('1. Pose &amp; place','Local parts → world → camera'),('2. Order &amp; reject','Bounds, distance, BSP, faces'),('3. Light &amp; clip','Normals, palette ramps, near plane'),('4. Project','3D points → integer screen positions'),('5. Fill','Flat spans, bands, affine textures'),('6. Present','Cockpit masks, VGA pages, palette')]):
 y=25+i*82;b+=rect(25,y,750,64)+text(44,y+26,a,GOLD,20)+text(44,y+50,c,MUT,17)
 if i<5:b+=line(400,y+65,400,y+80,arrow=True)
svg('pipeline.svg',800,520,'From model coordinates to VGA memory','Conceptual stages of the renderer. Operations are interleaved within each object in the actual code.',b)
b=text(30,35,'Perspective, seen from the side',GOLD,23)+text(30,62,'Y points forward; Z points up.',MUT)
b+=line(90,280,745,280,arrow=True)+text(715,306,'Y')+line(90,280,90,95,arrow=True)+text(62,106,'Z')
b+=line(270,100,270,330,GOLD)+text(270,365,'screen / near plane',GOLD,17,'middle')
b+=line(90,280,660,100)+line(660,100,660,280,MUT,dash=True)+line(90,280,660,280,MUT)
b+=f'<circle cx="660" cy="100" r="6" fill="{GOLD}"/><circle cx="270" cy="223.16" r="5" fill="{TEAL}"/><circle cx="90" cy="280" r="6" fill="{TEAL}"/>'
b+=text(676,96,'(Y, Z)',GOLD)+text(44,325,'eye')+text(300,248,'f × Z / Y',TEAL)+text(160,306,'f',GOLD)+text(438,306,'Y',MUT)
b+=text(30,414,'Farther away → smaller projected displacement.',FG,20)
svg('projection.svg',800,450,'Perspective projection using similar triangles','A vertex at height Z and depth Y projects to height f times Z divided by Y on a plane f units from the eye. The usual near plane is at that same depth.',b)
b=text(28,35,'Near-plane clipping, seen from above',GOLD,22)
b+=f'<path d="M280,75 L280,300" stroke="{GOLD}" stroke-width="2"/><polygon points="130,120 630,95 650,270" fill="#503e34" stroke="{RED}" stroke-width="2"/><polygon points="280,112.5 630,95 650,270 280,163.27" fill="#28574e" stroke="{TEAL}" stroke-width="2"/>'
for x,y in [(280,112.5),(280,163.27)]:b+=f'<circle cx="{x}" cy="{y}" r="6" fill="{GOLD}"/>'
b+=text(65,325,'Discarded',RED)+text(415,325,'Kept and projected',TEAL)+text(285,70,'near',GOLD)+text(30,380,'At each crossing: interpolate position, UV and light.',FG,20)
svg('clipping.svg',800,410,'Clipping a triangle before perspective division','A triangle crossing the near plane is trimmed to a four-sided polygon. New edge intersections retain interpolated position, texture coordinates and light values.',b)
b=text(28,35,'Painter order inside one authored BSP node',GOLD,22)
b+=line(375,70,375,280,GOLD,dash=True)+text(390,92,'splitting plane',GOLD,17)
b+=rect(110,140,90,60,'#234b47')+text(155,178,'A',FG,24,'middle')+rect(500,170,90,60,'#344252')+text(545,208,'B',FG,24,'middle')
b+=f'<circle cx="710" cy="260" r="7" fill="{TEAL}"/>'+text(695,294,'eye',TEAL,18,'middle')+line(695,253,602,207,arrow=True)
b+=text(375,319,'draw far side → node → near side',FG,20,'middle')
b+=rect(310,351,130,45)+text(375,380,'node',GOLD,20,'middle')+line(310,394,235,425,arrow=True)+line(440,394,515,425,arrow=True)
b+=text(235,452,'A first',TEAL,19,'middle')+text(515,452,'B last',TEAL,19,'middle')
svg('painter.svg',800,480,'Painter ordering with a binary space partition','In this illustrative top view, A is on the far side of a partition and B is on the eye side. Draw A, any polygons at the node, then B. Moving the eye across the partition reverses the side order.',b)
# Pixel-memory diagram: row groups, plane addresses and logical page layout.
cols=[GOLD,TEAL,'#b3a3d6',RED];b=text(28,35,'Four neighbouring pixels, four memory planes',GOLD,22)
for i in range(12):
 x=46+i*59;b+=rect(x,64,52,46,cols[i%4],BG)+text(x+26,94,str(i),BG,20,'middle')
b+=text(28,137,'Screen x',MUT,17)
for p in range(4):
 y=163+p*51;b+=text(30,y+28,'Plane '+str(p),cols[p],18)
 for j in range(3):b+=rect(150+j*182,y,166,36)+text(233+j*182,y+25,'pixel '+str(p+j*4),cols[p],18,'middle')
b+=text(233,390,'offset 0',MUT,17,'middle')+text(415,390,'offset 1',MUT,17,'middle')+text(597,390,'offset 2',MUT,17,'middle')
b+=text(28,434,'plane = x &amp; 3',FG,19)+text(250,434,'address = y × stride + (x &gt;&gt; 2)',FG,19)
b+=text(28,476,'320-pixel row: stride 80 bytes per plane.',MUT,18)
b+=text(28,505,'640-pixel backing surface: stride 160; four 320 × 200 pages.',MUT,18)
svg('vga.svg',800,535,'VGA planar pixel addressing','Successive screen pixels are distributed across four VGA planes. Pixels zero, four and eight occupy consecutive byte addresses in plane zero. The stride depends on the backing surface width.',b)
# Visualise bands emitted by the original routine, not a new shading algorithm.
g=json.loads((src/'gouraud-bands.json').read_text());pal=json.loads((src/'palette.json').read_text())['colours']
b=text(24,32,'One triangle becomes many flat polygons',GOLD,22)+'<g transform="translate(80,20) scale(2)">'
for band in g['bands']:
 rgb=[(v<<2)|(v>>4)for v in pal[band['colour']][:3]];c='#%02x%02x%02x'%tuple(rgb)
 b+=f'<polygon points="'+ ' '.join(f'{x},{y}'for x,y in band['points'])+f'" fill="{c}" stroke="#eadabc" stroke-opacity=".65" stroke-width=".45"/>'
b+='</g>'
for (x,y),idx in zip(g['points'],g['colours']):b+=text(80+x*2,20+y*2+(-12 if y<100 else 28),str(idx),GOLD,18,'middle')
b+=text(28,405,'Labels are palette indices. Fine lines expose the emitted bands.',MUT,17)
svg('gouraud-bands.svg',800,435,'The original Gouraud routine emits a band for each palette step','Original emitted polygon boundaries over a synthetic triangle shaded with one WORLD0 colour ramp. Corner palette indices are 112, 127 and 120.',b)
print('Copied',len(files),'assets and generated six SVG diagrams.')

# Publish source and output hashes for the illustrations and their research notes.
manifest=[]
for file in sorted(dst.iterdir()):
 if file.name=='manifest.json' or not file.is_file():continue
 manifest.append(dict(file=file.name,bytes=file.stat().st_size,sha256=hashlib.sha256(file.read_bytes()).hexdigest(),kind='explanatory SVG' if file.suffix=='.svg' else 'analysis capture or data'))
(dst/'manifest.json').write_text(json.dumps(dict(description='Original renderer captures, controlled synthetic examples and explanatory SVG diagrams for the graphics article.',files=manifest),indent=2)+'\n')
notes=['SIMULATOR_VERSIONS','RENDERING','LIGHTING','ENVIRONMENT','ANIMATION','FORMATS','COMMAND_LINE','BUILD_EVIDENCE','PIXEL_FIDELITY']
p=site/'public/data-provenance.json';provenance=json.loads(p.read_text());updates={}
for name in notes:
 file=root/'docs'/f'{name}.md';raw=file.read_bytes();shutil.copy2(file,site/'content/research'/file.name)
 updates[f'../docs/{name}.md']=dict(source=f'../docs/{name}.md',sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw))
for i,row in enumerate(provenance['files']):
 if row['source'] in updates:provenance['files'][i]=updates.pop(row['source'])
provenance['files'][0:0]=sorted(updates.values(),key=lambda row:row['source'])
p.write_text(json.dumps(provenance,indent=2)+'\n')
print('Published',len(manifest),'graphics assets and',len(notes),'supporting notes.')
