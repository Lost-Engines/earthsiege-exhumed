#!/usr/bin/env python3
"""Publish combat captures and draw explanatory diagrams from original results."""
import hashlib,json,math,shutil,sys
from html import escape
from pathlib import Path
site=Path(__file__).resolve().parents[1];root=Path(sys.argv[1]if len(sys.argv)>1 else site/'../earthsiege-reverse').resolve();src=root/'analysis/combat';dst=site/'public/combat';dst.mkdir(exist_ok=True)
for p in src.iterdir():
 if p.suffix=='.json' or p.name in ['intact.png','armour.png','shoulder.png','upper-leg.png','foot.png','cockpit.png']:shutil.copy2(p,dst/p.name)
BG='#101b25';FG='#edf0e7';MUT='#a9bbc5';GOLD='#ebca80';TEAL='#82c9bd';RED='#ef9779'
def text(x,y,t,c=FG,size=18,anchor='start'):
 return f'<text x="{x}" y="{y}" fill="{c}" font-size="{size}" text-anchor="{anchor}">{escape(str(t))}</text>'
def line(x,y,x2,y2,c=TEAL,arrow=False,dash=False):
 return f'<path d="M{x},{y} L{x2},{y2}" fill="none" stroke="{c}" stroke-width="2"'+(' marker-end="url(#arrow)"'if arrow else'')+(' stroke-dasharray="6 5"'if dash else'')+'/>'
def box(x,y,w,h,title,sub='',c=TEAL):
 return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="#1b2a35" stroke="{c}"/>'+text(x+14,y+29,title,c,18)+(text(x+14,y+54,sub,MUT,15)if sub else'')
def svg(name,w,h,title,description,body):
 s=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(description)}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10Z" fill="{TEAL}"/></marker></defs><rect width="{w}" height="{h}" fill="{BG}"/><g font-family="system-ui,sans-serif">{body}</g></svg>\n';(dst/name).write_text(s)
# A single impact, top row then bottom row, following the numbered stages.
b=text(28,35,'Following a hit',GOLD,23)
for x,y,t,sub in [(25,70,'1. Hit geometry','Ray through shield volume'),(295,70,'2. Shield charge','Any shield damage left?'),(565,70,'3. Part armour','Spend the armour field'),(565,230,'4. Internals','Choose by live weights'),(295,230,'5. Attachments','Remove child sections'),(25,230,'6. Consequences','Weapons, motion, salvage')]:b+=box(x,y,210,82,t,sub)
for x,x2,y in [(235,290,111),(505,560,111),(565,510,271),(295,240,271)]:b+=line(x,y,x2,y,arrow=True)
b+=line(670,152,670,225,arrow=True)+text(28,365,'Armour damage is a separate packet field; shield exhaustion gates access to it.',MUT,16)
svg('hit-pipeline.svg',800,395,'Six stages from collision to combat consequences','A hit crosses the shield volume, tests shield charge, spends armour, chooses internal components, removes linked sections and updates consequences.',b)
# Attachment chain and shared function, with leg used by the interactive sample.
b=text(28,34,'Three sections, one leg actuator',GOLD,23)+text(28,63,'Samson left leg: original section and component links',MUT,16)
for y,title,sub in [(95,'Upper leg · section 7','Armour 4,000'),(220,'Lower leg · section 9','Armour 3,750'),(345,'Foot · section 11','Armour 2,500')]:b+=box(35,y,245,80,title,sub)+line(280,y+40,515,260,GOLD,dash=True)
b+=line(155,175,155,215,arrow=True)+line(155,300,155,340,arrow=True)+box(520,220,240,80,'Left leg actuator · 0','Capacity 2,500',GOLD)
b+=text(35,473,'Solid arrows: removal travels down the attachment chain.',TEAL,16)+text(35,503,'Dashed links: armour overflow can damage the same internal component.',GOLD,16)
svg('leg-links.svg',800,530,'Samson leg attachment chain and shared actuator','Upper leg carries lower leg, which carries foot. All three protect the same left leg actuator. A destroyed foot can disable the machine without detaching its upper leg.',b)
# Weighted allocation, showing correctly normalized probabilities, not independent rolls.
b=text(28,34,'Where does cockpit armour overflow go?',GOLD,23)+box(28,65,744,70,'Front cockpit armour · 4,500 points','The remaining damage enters one weighted choice among live internals.')
labels=[('Sensor array',30,700),('Gyroscope',40,700),('Pilot',10,50)];x=28
for label,weight,cap in labels:
 w=744*weight/80;b+=f'<rect x="{x}" y="180" width="{w}" height="48" fill="{[TEAL,GOLD,RED][labels.index((label,weight,cap))]}"/>';b+=text(x+w/2,210,f'{weight/80:.1%}',BG,20,'middle');x+=w
for i,(label,weight,cap)in enumerate(labels):
 x=28+i*255;b+=text(x,268,label,FG,18)+text(x,296,f'Weight {weight}; capacity {cap}',MUT,16)
b+=text(28,345,'When a component dies, remove its weight and choose again if damage remains.',MUT,16)
svg('internal-choice.svg',800,375,'Weighted selection for front cockpit overflow','Weights 30, 40 and 10 become probabilities 37.5%, 50% and 12.5% when all three components are alive. The pilot has only 50 capacity.',b)
# Actual octagonal hit boundary, compared with a circle solely for explanation.
b=text(28,34,'A cheap cross-section for a hit test',GOLD,23)
cx,cy,r=205,205,130;b+=f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{MUT}" stroke-dasharray="4 5"/>'
ps=[(r,0),(r*2/3,r*2/3),(0,r),(-r*2/3,r*2/3),(-r,0),(-r*2/3,-r*2/3),(0,-r),(r*2/3,-r*2/3)]
b+='<polygon points="'+' '.join(f'{cx+x},{cy+y}'for x,y in ps)+f'" fill="{TEAL}" fill-opacity=".1" stroke="{TEAL}" stroke-width="3"/>'
b+=line(cx-r-20,cy,cx+r+20,cy,MUT)+line(cx,cy-r-20,cx,cy+r+20,MUT)+text(cx+r+27,cy+6,'X',MUT,16)+text(cx+8,cy-r-22,'Z',MUT,16)
for y,t in [(115,'Lateral distance estimate:'),(150,'max(|X|, |Z|) + min(|X|, |Z|) / 2'),(205,'Teal: original test boundary'),(238,'Dotted: a circle of the same radius'),(291,'No square root is needed.'),(324,'Depth is approximated linearly too.')]:b+=text(395,y,t,TEAL if y==205 else FG,16)
svg('collision-shape.svg',800,395,'Octagonal approximation used by projectile hit tests','The original lateral norm is maximum absolute coordinate plus half the minimum. Its constant-radius boundary is octagonal; a circle is shown for comparison.',b)
# Original finite movement traces, not a maximum-speed percentage prediction.
m=json.loads((src/'movement.json').read_text());b=text(28,34,'Same request, different journeys',GOLD,23);x0,y0,w,h=75,340,680,250
for k in range(6):
 y=y0-h*k/5;b+=line(x0,y,x0+w,y,'#32434f')+text(x0-12,y+5,str(k*5000),MUT,14,'end')
for k in range(6):b+=text(x0+w*k/5,y0+27,str(k*20),MUT,14,'middle')
for t,c in zip(m['traces'],[TEAL,GOLD,RED]):
 values=[0]+[s['position'][1]-t['start'][1]for s in t['states']];b+='<polyline fill="none" stroke="'+c+'" stroke-width="3" points="'+' '.join(f'{x0+w*i/100:.1f},{y0-h*v/25000:.1f}'for i,v in enumerate(values))+'"/>'
for i,(label,c)in enumerate(zip(['Healthy','Light leg damage','Heavy leg damage'],[TEAL,GOLD,RED])):b+=text(75+i*230,413,label,c,16)
b+=text(415,389,'Controller updates · fixed frame ratio 256',MUT,15,'middle')+text(28,63,'Forward travel in native world units; original controller and root motion',MUT,16)
svg('movement.svg',800,440,'Original Samson displacement under three leg damage states','After 100 updates the healthy, light and heavy cases travel 24,288, 9,183 and 5,060 native units. These traces include gait selection and acceleration.',b)
# Salvage cutoff, with marker available to the enhanced inline figure.
d=json.loads((src/'salvage.json').read_text());b=text(28,34,'The salvage cliff',GOLD,23)+text(28,62,'Contribution of one otherwise intact Samson upper-leg section',MUT,16);x0,y0,w,h=75,335,680,240
for k in range(5):
 y=y0-h*k/4;b+=line(x0,y,x0+w,y,'#32434f')+text(x0-12,y+5,str(k*500),MUT,14,'end')
for k in range(5):b+=text(x0+w*k/4,y0+27,str(k*50),MUT,14,'middle')
b+='<polyline fill="none" stroke="'+TEAL+'" stroke-width="3" points="'+' '.join(f'{x0+w*r["damage"]/200:.1f},{y0-h*r["section_contribution"]/2000:.1f}'for r in d['rows'])+'"/>'
b+=line(x0+w*.75,85,x0+w*.75,y0,RED,dash=True)+text(x0+w*.75-12,116,'150 points',RED,17,'end')+text(415,397,'Accumulated armour damage',MUT,16,'middle')
b+='<g id="salvage-marker" visibility="hidden"><line x1="0" y1="85" x2="0" y2="335" stroke="#ebca80" stroke-width="2"/><circle cx="0" cy="0" r="6" fill="#ebca80"/></g>'
svg('salvage.svg',800,425,'Original salvage contribution for armour damage zero through 200','At 149 damage points the section contributes 1,925. At 150 its contribution drops to zero even though it retains 3,850 of 4,000 armour.',b)
# Actual trajectory of one detached weapon, with its native units retained.
d=json.loads((src/'detached-weapon.json').read_text())['case'];states=[d['initial']]+d['steps'];start=states[0]['position'];ps=[(math.hypot(s['position'][0]-start[0],s['position'][1]-start[1]),s['position'][2])for s in states];maxx=max(p[0]for p in ps);maxz=max(p[1]for p in ps);b=text(28,34,'A weapon becomes a moving object',GOLD,23)+text(28,62,'One original ejection and its complete debris trajectory',MUT,16);x0,y0,w,h=65,335,690,240
b+=line(x0,y0,x0+w,y0,MUT)+text(x0,y0+25,'Release',MUT,14)+text(x0+w,y0+25,'Retired after bouncing',MUT,14,'end')
b+='<polyline fill="none" stroke="'+TEAL+'" stroke-width="2" points="'+' '.join(f'{x0+w*x/maxx:.1f},{y0-h*z/maxz:.1f}'for x,z in ps)+'"/>'
for x,z in ps:b+=f'<circle cx="{x0+w*x/maxx:.1f}" cy="{y0-h*z/maxz:.1f}" r="3" fill="{GOLD}"/>'
b+=text(28,408,'Dots are simulation updates. Horizontal position is distance from the release point.',MUT,15)
svg('weapon-flight.svg',800,435,'Original ballistic path of a detached weapon','Horizontal speed decays each update; gravity lowers vertical speed. Ground contact reverses and damps vertical speed until the object is retired.',b)
notes=['DAMAGE','WEAPONS','LOCOMOTION','COLLISION','EFFECTS','CAMPAIGN','CONTROLLERS','MULTIFUNCTION_DISPLAYS','COMBAT_ARTICLE']
p=site/'public/data-provenance.json';prov=json.loads(p.read_text());updates={}
for name in notes:
 file=root/'docs'/f'{name}.md';raw=file.read_bytes();shutil.copy2(file,site/'content/research'/file.name);updates[f'../docs/{name}.md']=dict(source=f'../docs/{name}.md',sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw))
for i,row in enumerate(prov['files']):
 if row['source']in updates:prov['files'][i]=updates.pop(row['source'])
prov['files'][0:0]=sorted(updates.values(),key=lambda row:row['source']);p.write_text(json.dumps(prov,indent=2)+'\n')
manifest=[dict(file=f.name,bytes=f.stat().st_size,sha256=hashlib.sha256(f.read_bytes()).hexdigest(),kind='explanatory diagram'if f.suffix=='.svg'else'original capture or data')for f in sorted(dst.iterdir())if f.is_file()and f.name!='manifest.json']
(dst/'manifest.json').write_text(json.dumps(dict(description='Damage, physics and salvage article; original captures and labelled explanatory diagrams.',files=manifest),indent=2)+'\n')
print('Published',len(manifest),'combat assets and',len(notes),'research notes.')
