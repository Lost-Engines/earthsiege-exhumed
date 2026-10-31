"""Publish real exhibit captures; Pillow is needed only to make the social card."""
from pathlib import Path
import shutil
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parent.parent
source=root/'.test-output/captures';dest=root/'public/images';dest.mkdir(parents=True,exist_ok=True)
for name in ['hero','models','mission','signature','sky']:
    shutil.copyfile(source/(name+'.png'),dest/(name+'.png'))
# The social image is explicitly a labelled inspection capture, not a DOS screenshot.
frame=Image.new('RGB',(1200,630),'#0a1014')
hero=Image.open(source/'hero.png').convert('RGB').resize((1260,630),Image.Resampling.NEAREST)
frame.paste(hero,(-60,0))
draw=ImageDraw.Draw(frame)
serif='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
sans='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
draw.text((60,110),'LOST ENGINES',font=ImageFont.truetype(sans,18),fill='#ebca80')
draw.text((55,180),'Earthsiege',font=ImageFont.truetype(serif,66),fill='#f5f3ec')
draw.text((55,260),'Exhumed',font=ImageFont.truetype(serif,66),fill='#f5f3ec')
draw.text((60,380),'Inside the 1994 Dynamix game',font=ImageFont.truetype(sans,23),fill='#c0d0d6')
draw.text((60,550),'Original HERC data · Browser inspection render',font=ImageFont.truetype(sans,14),fill='#a6b8c3')
frame.save(dest/'social-preview.jpg',quality=92,optimize=True)
print('Published five lossless exhibit captures and a 1200 × 630 social preview.')
