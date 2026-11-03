import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.SITE_URL||'http://127.0.0.1:4178/earthsiege-exhumed/';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],httpErrors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
page.on('response',r=>{if(r.status()>=400)httpErrors.push(r.status()+' '+r.url())});
const fits=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow at '+await page.evaluate(()=>innerWidth));
try{
 await fs.mkdir('.test-output',{recursive:true});
 await page.goto(base);assert.equal(await page.locator('main a[href="combat/"]').count(),2);
 await page.goto(base+'combat/');
 for(const id of ['damage-controls','shield-controls','salvage-controls'])await page.locator('#'+id).waitFor({state:'visible'});
 const intact=await page.locator('#damage-image').screenshot();
 for(const [state,expected]of [['armour',/0 of 8/],['shoulder',/2 of 8/],['upper-leg',/Disabled: cannot walk/],['foot',/1 section removed/],['cockpit',/Destroyed/]]){
  await page.locator('#damage-state').selectOption(state);assert.match(await page.locator('#damage-details').textContent(),expected);
  await page.waitForFunction(()=>document.getElementById('damage-image').complete);
  if(state==='shoulder')assert(!intact.equals(await page.locator('#damage-image').screenshot()),'Component loss did not change the original drawing');
 }
 await page.locator('#damage-state').selectOption('shoulder');await page.locator('#damage-example').screenshot({path:'.test-output/combat-damage.png'});
 for(const [charge,damage]of [[0,360],[59,360],[60,0],[100,0]]){
  await page.locator('#shield-charge').fill(String(charge));assert.equal(await page.locator('#armour-hit').evaluate(n=>n.value),damage);
  assert.equal(await page.locator('#shield-value').textContent(),String(charge));
 }
 for(const [amount,contribution]of [[0,'2,000'],[149,'1,925'],[150,'0'],[200,'0']]){
  await page.locator('#salvage-damage').fill(String(amount));assert.match(await page.locator('#salvage-readout strong').textContent(),new RegExp('contribution '+contribution+'\\.'));
  assert.equal(await page.locator('#salvage-marker line').getAttribute('x1'),String(75+680*amount/200));
 }
 await page.locator('#salvage-damage').fill('149');await page.locator('#salvage-example').screenshot({path:'.test-output/combat-salvage.png'});
 // Keyboard operation and linked homepage navigation.
 await page.locator('#shield-charge').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#shield-charge').inputValue(),'1');
 for(const width of [360,390,768,1024,1101,1200,1350,1440,1920]){
  await page.setViewportSize({width,height:950});await fits();
  const layout=await page.evaluate(()=>{const r=document.querySelector('.nav-links').getBoundingClientRect(),b=document.querySelector('.brand-links').getBoundingClientRect();return {display:getComputedStyle(document.querySelector('.nav-links')).display,r:r.left,b:b.right,right:r.right}});
  if(layout.display!=='none')assert(layout.r>=layout.b && layout.right<=width,'Navigation overlaps at '+width);
  if(width===390){await page.getByRole('button',{name:'Menu',exact:true}).click();assert(await page.getByRole('link',{name:'Engine articles',exact:true}).isVisible());await page.getByRole('button',{name:'Menu',exact:true}).click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'.test-output/combat-mobile.png'});await page.locator('#salvage-example').screenshot({path:'.test-output/combat-salvage-mobile.png'});}
 }
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'.test-output/combat-desktop.png'});
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await fits();await page.screenshot({path:'.test-output/combat-dark.png'});
 const noJS=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
 await noJS.goto(base+'combat/');
 for(const id of ['damage-controls','shield-controls','salvage-controls'])assert.equal(await noJS.locator('#'+id).isVisible(),false);
 assert(await noJS.locator('#damage-image').isVisible());assert(await noJS.locator('#salvage-chart').isVisible());assert.match(await noJS.locator('#shield-readout').textContent(),/59 shield charge/);await noJS.close();
 assert.deepEqual(errors,[],'Browser errors');assert.deepEqual(httpErrors,[],'Failed assets');
 console.log('Combat: six damage states, exact shield/salvage boundaries, diagram marker, keyboard, nine viewport widths, no-JS, dark mode and navigation passed.');
}finally{await browser.close()}
