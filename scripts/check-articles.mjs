import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.SITE_URL||'http://127.0.0.1:4178/earthsiege-exhumed/';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
const visit=async route=>{await page.goto(base+route+'/');await page.waitForLoadState('networkidle')};
const fits=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow: '+page.url());
try{
 await fs.mkdir('.test-output',{recursive:true});
 await page.goto(base);for(const route of ['ai','campaign','reconstruction','music'])assert.equal(await page.locator(`main a[href="${route}/"]`).count(),1);
 await visit('articles');assert.equal(await page.locator('.essay-card').count(),6);
 await visit('ai');await page.locator('#contact-controls').waitFor({state:'visible'});
 for(const [distance,expected]of [['49999',/closer alert and eligible trigger path also runs/],['50000',/closer alert and trigger path does not run/],['119999',/recipient gains awareness/],['120000',/adds no awareness/]]){
  await page.locator('#contact-distance').selectOption(distance);assert.match(await page.locator('#contact-result').textContent(),expected);
 }
 await page.locator('#contact-distance').selectOption('49999');await page.locator('#contact-waiting').check();assert.match(await page.locator('#contact-result').textContent(),/skips it/);await page.locator('#contact-waiting').uncheck();
 await page.locator('#contact-example').screenshot({path:'.test-output/article-contact.png'});
 await visit('campaign');await page.locator('#launch-controls').waitFor({state:'visible'});await page.locator('#branch-controls').waitFor({state:'visible'});
 const first=await page.locator('#launch-map').screenshot();
 await page.locator('#launch-variation').selectOption('42');await page.waitForFunction(()=>document.getElementById('launch-map').complete);
 assert.match(await page.locator('#launch-caption').textContent(),/Mongooses/);assert.match(await page.locator('#launch-result').textContent(),/18 HERCs, 4 flyers, 8 ground actors/);
 assert(!first.equals(await page.locator('#launch-map').screenshot()),'Launch diagram did not change');
 await page.locator('#launch-variation').selectOption('17');assert.match(await page.locator('#launch-caption').textContent(),/Stingrays/);
 for(const [node,branch,dest]of [['0','0','node 1'],['0','1','node 2'],['2','0','node 3'],['2','1','campaign failure'],['3','1','node 6'],['7','0','campaign victory'],['7','1','campaign failure']]){
  await page.locator('#branch-node').selectOption(node);await page.locator('#branch-result').selectOption(branch);assert((await page.locator('#branch-destination').textContent()).endsWith(dest+'.'));
 }
 await page.locator('#launch-example').screenshot({path:'.test-output/article-launch.png'});
 await visit('reconstruction');await page.locator('#radar-controls').waitFor({state:'visible'});
 for(const [frame,count]of [['1-120',36],['1-1020',33],['1-1440',30],['2-660',46],['2-720',54],['4-0',31]]){
  await page.locator('#radar-frame').selectOption(frame);assert((await page.locator('#radar-result').textContent()).includes(count+' pixels differ'));
  for(const kind of ['original','native','difference','full'])assert((await page.locator('#radar-'+kind).getAttribute('src')).includes(frame+'-'+kind));
 }
 await page.locator('#radar-frame').selectOption('2-660');await page.locator('#radar-example').screenshot({path:'.test-output/article-radar.png'});
 await visit('music');await page.locator('#fade-controls').waitFor({state:'visible'});
 for(const [step,expected]of [['0',/volume 100/],['1',/volume 85/],['6',/volume 10/],['7',/volume zero/],['8',/encounter piece starts at volume 100/]]){
  await page.locator('#fade-step').fill(step);assert.match(await page.locator('#fade-result').textContent(),expected);assert.equal(await page.locator('#fade-value').textContent(),step);
 }
 await page.locator('#fade-step').focus();await page.keyboard.press('ArrowLeft');assert.match(await page.locator('#fade-result').textContent(),/Update 7/);
 assert.equal(await page.locator('audio').count(),6);
 // Decode every excerpt, then verify playback and the existing one-at-a-time rule.
 for(const audio of await page.locator('audio').all()){
  await audio.evaluate(el=>{el.load()});await page.waitForFunction(el=>el.readyState>=1,await audio.elementHandle());
  assert(Math.abs(await audio.evaluate(el=>el.duration)-24)<0.02,'Unexpected clip duration');
 }
 await page.locator('audio').nth(0).evaluate(el=>el.play());await page.locator('audio').nth(1).evaluate(el=>el.play());assert(await page.locator('audio').nth(0).evaluate(el=>el.paused));await page.locator('audio').nth(1).evaluate(el=>el.pause());
 await page.locator('#fade-example').screenshot({path:'.test-output/article-fade.png'});
 for(const width of [320,390,600,768,950,1024,1440]){
  await page.setViewportSize({width,height:900});
  for(const route of ['articles','ai','campaign','reconstruction','music']){
   await visit(route);await fits();
   const nav=await page.evaluate(()=>{const n=document.querySelector('.nav-links'),r=n.getBoundingClientRect(),b=document.querySelector('.brand-links').getBoundingClientRect();return {display:getComputedStyle(n).display,left:r.left,right:r.right,brand:b.right,width:innerWidth}});
   if(nav.display!=='none')assert(nav.left>=nav.brand&&nav.right<=nav.width+1,'Navigation overlap');
   if(route==='music'){
    const caption=await page.locator('.article-audio caption').boundingBox();const table=await page.locator('.article-audio').boundingBox();
    assert(caption.width>table.width*.9&&caption.height<130,'Collapsed audio caption');
    if(width===390)await page.locator('.article-audio').screenshot({path:'.test-output/article-audio-mobile.png'});
   }
  }
 }
 await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:1440,height:1000});await visit('ai');await page.screenshot({path:'.test-output/article-ai-dark.png'});
 // Direct SVG text bounds catch labels that run out of their illustration.
 const manifest=JSON.parse(await fs.readFile('public/articles/manifest.json','utf8'));
 for(const {file}of manifest.files.filter(r=>r.file.endsWith('.svg'))){
  await page.goto(base+'articles/'+file);
  const outside=await page.evaluate(()=>{const s=document.querySelector('svg').viewBox.baseVal;return [...document.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x<0||b.y<0||b.x+b.width>s.width||b.y+b.height>s.height}).map(t=>t.textContent)});
  assert.deepEqual(outside,[],'Text outside '+file);
 }
 const noJS=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
 for(const route of ['ai','campaign','reconstruction','music']){
  await noJS.goto(base+route+'/');assert((await noJS.locator('article').innerText()).length>9000);
  for(const control of await noJS.locator('.figure-controls').all())assert.equal(await control.isVisible(),false);
  assert(await noJS.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 const fallback=await browser.newPage();await fallback.route('**/articles/launches.json',r=>r.abort());await fallback.goto(base+'campaign/');await fallback.waitForFunction(()=>document.querySelector('#launch-example').textContent.includes('could not load'));
 assert(await fallback.locator('#launch-map').isVisible());assert.equal(await fallback.locator('#launch-controls').isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log('Four articles: original boundaries, launch variants, seven campaign transitions, six pixel crops, music fade, six audio excerpts, keyboard, seven widths, dark mode, SVG bounds, no-JS and failed-data fallback passed.');
}finally{await browser.close()}
