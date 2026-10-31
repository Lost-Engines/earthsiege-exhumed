/* Classic-script transport supports direct file:// use as well as HTTP.
 * Model and mission JSON exports remain available independently. */
'use strict';
globalThis.EarthsiegeData={pending:new Map(),values:new Map(),
 register(script,value){const key=script.replace(/\.js$/,'');this.values.set(key,value);this.pending.get(key)?.resolve(value)},
 load(source){const key=new URL(source,document.baseURI).href;if(this.values.has(key))return Promise.resolve(this.values.get(key));if(this.pending.has(key))return this.pending.get(key).promise;let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});this.pending.set(key,{promise,resolve,reject});const script=document.createElement('script');script.src=key+'.js';script.onerror=()=>reject(Error('Cannot load '+source));script.onload=()=>{if(!this.values.has(key))reject(Error('Data transport did not register '+source))};document.head.append(script);return promise},
 bytes(text){const raw=atob(text),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes},
 report(error){console.error(error);let panel=document.getElementById('load-error');if(!panel){panel=document.createElement('p');panel.id='load-error';panel.style.cssText='padding:1em;background:#54262c;color:#fff';document.querySelector('main').prepend(panel)}panel.textContent='Unable to load this resource: '+error.message}
};
addEventListener('unhandledrejection',event=>EarthsiegeData.report(event.reason));

addEventListener('error',event=>{if(event.error&&/WebGL2/.test(event.error.message)){EarthsiegeData.report(new Error('The 3D viewer needs WebGL 2. Try a browser with hardware graphics enabled.'));document.getElementById('load-error').setAttribute('role','alert')}});
