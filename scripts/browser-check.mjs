import assert from 'node:assert/strict';import {chromium} from 'playwright';import fs from 'node:fs/promises';
const base=process.env.SITE_URL||'http://127.0.0.1:4178/earthsiege-exhumed/';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],httpErrors=[];const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)httpErrors.push(r.status()+' '+r.url())});
const ready=async(url,expression)=>{await page.goto(base+url);if(expression)await page.waitForFunction(expression);await page.waitForLoadState('networkidle')};
const fits=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal page overflow: '+page.url());
try{
 await ready('models/',()=>document.getElementById('info').textContent.includes('faces'));
 const files=await page.evaluate(()=>modelCatalogue.map(r=>r.name));
 for(const name of files)await page.evaluate(async name=>{await select(modelCatalogue.find(r=>r.name===name))},name);
 console.log('Rendered all '+files.length+' model resources.');
 await page.evaluate(async()=>{await select(modelCatalogue.find(r=>r.name.endsWith('/BULLDOG.DTS')));document.getElementById('sequence').value='4';chooseSequence()});
 const before=await page.locator('#view').screenshot();await page.locator('#play').click();await page.waitForTimeout(350);const after=await page.locator('#view').screenshot();assert(!before.equals(after),'Animation did not change the image');await page.locator('#play').click();
 await page.locator('#loadout').selectOption('bare');await page.waitForFunction(()=>document.getElementById('info').textContent.includes('0 mounted weapons'));
 await page.locator('#loadout').selectOption('custom');assert(await page.locator('#mounts select').count()>0);
 const zoomBefore=await page.evaluate(()=>zoom);await page.getByRole('button',{name:'Zoom in',exact:true}).click();assert(await page.evaluate(()=>zoom)<zoomBefore);await page.getByRole('button',{name:'Reset view',exact:true}).click();
 await page.locator('#lighting').selectOption('night');assert(await page.locator('#missionLighting').isVisible());
 await page.locator('#lightVisibility').selectOption('1');await page.locator('#view').focus();const angleBefore=await page.evaluate(()=>angle);await page.keyboard.press('ArrowRight');assert(await page.evaluate(()=>angle)>angleBefore);
 await ready('models/?root=5#simvol0%2Fdgs%2FURBAN.DGS',()=>document.getElementById('root').value==='5'&&document.getElementById('info').textContent.includes('faces'));assert.equal(await page.locator('#play').isVisible(),false);
 console.log('Model animation, equipment, lighting, keyboard, zoom and static-variant controls passed.');
 await ready('missions/?focus=building:4#B0_C3_2A',()=>document.getElementById('sceneFocus').value==='building:4');
 assert.match(await page.locator('#mapinfo').textContent(),/13 buildings/);
 const camera=await page.evaluate(()=>JSON.stringify([sceneFrame,sceneZoom,sceneAngle,sceneElevation]));
 const variation=await page.locator('#launchVariant option').nth(1).getAttribute('value');await page.locator('#launchVariant').selectOption(variation);await page.waitForFunction(v=>launchSelectionKey===v,variation);await page.waitForLoadState('networkidle');assert.equal(await page.evaluate(()=>JSON.stringify([sceneFrame,sceneZoom,sceneAngle,sceneElevation])),camera,'Changing variation moved the camera');
 const z=await page.evaluate(()=>sceneZoom);await page.getByRole('button',{name:'Zoom in',exact:true}).click();assert(await page.evaluate(()=>sceneZoom)<z);
 const box=await page.locator('#scene').boundingBox(),a=await page.evaluate(()=>sceneAngle);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2+10,{steps:5});await page.mouse.up();assert.notEqual(await page.evaluate(()=>sceneAngle),a,'Map drag did not reach the canvas');
 await page.locator('#mode').selectOption('map');assert(await page.locator('#map').isVisible());await page.locator('#mode').selectOption('scene');
 for(const name of ['B0_C0_0A','B0_C1_61','B0_C2_10','B0_C5_00','B0_C6_0A','B0_C7_0A','SM_ESC50','SM_PTL01']){await page.evaluate(async name=>{const r=rows.find(r=>r.name===name);if(!r)throw Error('Missing test mission '+name);await select(r)},name);assert.match(await page.locator('#mapinfo').textContent(),/scenery placements/);}
 await ready('missions/?focus=terrain:5#B0_C5_00',()=>document.getElementById('sceneFocus').value==='terrain:5');assert.match(await page.locator('#mapinfo').textContent(),/URBAN/);
 await ready('missions/?focus=pattern#B0_C1_61',()=>document.getElementById('sceneFocus').value==='pattern');assert(Math.abs(await page.evaluate(()=>sceneElevation)-Math.PI/2)<.001);
 console.log('Mission launches, random variations, camera preservation, pointer controls and all three tours passed.');
 await ready('worlds/',()=>document.getElementById('skyNote').textContent.startsWith('Original level'));
 for(let world=0;world<24;world++){await page.locator('#environment').selectOption(String(Math.floor(world/6)));await page.locator('#time').selectOption(String(Math.floor(world%6/2)));await page.locator('#visibility').selectOption(String(world%2));await page.waitForFunction(()=>!document.getElementById('skyNote').textContent.startsWith('Loading'));}
 await page.locator('#skyPlay').click();await page.waitForFunction(()=>Number(document.getElementById('skyFrame').value)>0);await page.locator('#skyPlay').click();await page.locator('#skyMode').selectOption('panorama');await page.waitForFunction(()=>document.getElementById('sky').width===1280);assert.equal(await page.locator('#skyPlayback').isVisible(),false);
 console.log('All 24 skies, cloud playback and panorama passed.');
 await ready('sound/');for(const audio of await page.locator('audio').all()){await audio.evaluate(async a=>{await a.play()});await page.waitForTimeout(80);assert.equal(await page.locator('audio').evaluateAll(a=>a.filter(x=>!x.paused).length),1);await audio.evaluate(a=>a.pause());}
 console.log('All six FLAC excerpts play; players pause each other.');
 await fs.mkdir('.test-output',{recursive:true});
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});for(const route of ['','story/','models/','missions/','worlds/','sound/','about/','research/']){await ready(route);await fits();if(width===390&&route==='models/'){await page.getByRole('button',{name:'Menu',exact:true}).click();assert(await page.locator('#navigation').isVisible());await page.getByRole('button',{name:'Menu',exact:true}).click();}if((width===390||width===1440)&&['','models/'].includes(route))await page.screenshot({path:'.test-output/'+(route||'home').replaceAll('/','')+'-'+width+'.png',fullPage:true});}}
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await ready('');await fits();await page.screenshot({path:'.test-output/home-dark.png',fullPage:true});
 assert.deepEqual(errors,[],'Browser exceptions');assert.deepEqual(httpErrors,[],'Failed asset requests');console.log('Desktop, tablet, mobile, dark theme, deep links and asset requests passed.');
}finally{await browser.close()}
