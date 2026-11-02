import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.SITE_URL||'http://127.0.0.1:4178/earthsiege-exhumed/';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],httpErrors=[];
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('pageerror',e=>errors.push(String(e)));
page.on('response',r=>{if(r.status()>=400)httpErrors.push(r.status()+' '+r.url())});
const ready=async()=>{await page.goto(base+'graphics/');await page.locator('#progress-controls').waitFor({state:'visible'});await page.locator('#texture-controls').waitFor({state:'visible'});await page.locator('#environment-controls').waitFor({state:'visible'});};
const fits=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal page overflow');
try{
 await fs.mkdir('.test-output',{recursive:true});
 console.log('Opening graphics article.');await ready();console.log('Article controls loaded.');
 await fits();
 assert.match(await page.locator('#progress-count').textContent(),/200 \/ 200 calls/);
 console.log('Checking model progress.');const end=await page.locator('#progress-image').screenshot();
 for(const [step,calls]of [[0,0],[6,100],[12,200]]){
  await page.locator('#progress-range').fill(String(step));
  await page.waitForFunction(()=>document.getElementById('progress-image').complete);
  assert.equal(await page.locator('#progress-count').textContent(),calls+' / 200 calls');
  if(step===0)assert(!end.equals(await page.locator('#progress-image').screenshot()),'Progress slider did not change the drawing');
 }
 console.log('Checking layers.');for(const stage of ['bands','ground','panorama','clouds']){
  await page.locator('#environment-stage').selectOption(stage);
  await page.waitForFunction(()=>document.getElementById('environment-image').complete);
  assert((await page.locator('#environment-image').getAttribute('src')).endsWith('world-'+stage+'.png'));
 }
 console.log('Checking texture comparison.');await page.locator('#texture-mode').selectOption('triangles');
 assert(await page.locator('#texture-comparison').isVisible());
 const difference=await page.evaluate(async()=>{
  const original=new Image();original.src=document.getElementById('texture-original').src;await original.decode();
  const c=document.createElement('canvas');c.width=320;c.height=200;const ctx=c.getContext('2d');ctx.drawImage(original,0,0);
  const a=ctx.getImageData(0,0,320,200).data,b=document.getElementById('texture-comparison').getContext('2d').getImageData(0,0,320,200).data;
  let count=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])count++;
  return count;
 });
 assert(difference>1000&&difference<20000,'Expected a visible interpolation difference, got '+difference);
 const triangles=await page.locator('#texture-comparison').screenshot();
 await page.locator('#texture-diagonal').check();
 assert(!triangles.equals(await page.locator('#texture-comparison').screenshot()),'Diagonal did not appear');
 await page.locator('#texture-mode').selectOption('original');assert(await page.locator('#texture-comparison').isVisible());
 await page.locator('#texture-diagonal').uncheck();assert(await page.locator('#texture-original').isVisible());
 assert.equal(await page.locator('#texture-comparison').isVisible(),false);
 console.log('Checking responsive layouts.');
 // Desktop figures and mobile/dark layout captures are retained for inspection.
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'.test-output/graphics-desktop.png'});
 for(const id of ['model-progress','texture-example','environment-example'])await page.locator('#'+id).screenshot({path:'.test-output/'+id+'.png'});
 for(const width of [390,768,1024,1200,1440]){
  await page.setViewportSize({width,height:900});await fits();
  if(width===390){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'.test-output/graphics-mobile.png'});await page.getByRole('button',{name:'Menu',exact:true}).click();assert(await page.getByRole('link',{name:'Graphics engine',exact:true}).isVisible());await page.getByRole('button',{name:'Menu',exact:true}).click();}
 }
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'.test-output/graphics-dark.png'});await fits();
 const noJS=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
 await noJS.goto(base+'graphics/');assert(await noJS.locator('#progress-image').isVisible());assert(await noJS.locator('#texture-original').isVisible());assert.equal(await noJS.locator('#progress-controls').isVisible(),false);
 assert.equal(await noJS.locator('#texture-controls').isVisible(),false);assert.equal(await noJS.locator('#environment-controls').isVisible(),false);
 assert(await noJS.locator('h2').count()>=10);await noJS.close();
 assert.deepEqual(errors,[],'Browser exceptions');assert.deepEqual(httpErrors,[],'Failed asset requests');
 console.log('Graphics article: progress, four layers, texture comparison ('+difference+' changed pixels), diagonal, five viewport widths, dark mode and no-JS fallback passed.');
}finally{await browser.close()}
