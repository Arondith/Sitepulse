import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const token=readFileSync('.env','utf8').match(/^API_TOKEN=(.+)$/m)?.[1];
const base=process.env.BASE_URL || 'http://localhost:8080';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function api(path,options={}){const r=await fetch(base+path,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});assert.equal(r.ok,true,`${path}: ${r.status} ${r.statusText}`);return r.json()}
let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/healthz')).ok){ready=true;break}}catch{}await wait(1000)}assert.ok(ready,'API became ready');
assert.equal((await fetch(base+'/api/monitors')).status,401,'reject unauthenticated request');
const invalid=await fetch(base+'/api/runs',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({monitor_id:-1})});
assert.equal(invalid.status,400,'reject invalid monitor');
const missing=await fetch(base+'/api/runs',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({monitor_id:2147483647})});
assert.equal(missing.status,404,'reject unknown monitor');
const monitors=await api('/api/monitors');assert.ok(monitors.length);
const created=await api('/api/runs',{method:'POST',body:JSON.stringify({monitor_id:monitors[0].id})});assert.equal(created.state,'queued');
let done=false;for(let i=0;i<90;i++){
 const runs=await api('/api/runs');const run=runs.find(x=>x.id===created.id);
 assert.notEqual(run?.state,'failed',JSON.stringify(run));
 if(run?.state==='completed'){done=true;break}await wait(1000);
}assert.ok(done,'job completed within 90 seconds');
const result=await api('/api/results/'+created.id);
assert.equal(result.status,200);assert.equal(result.title,'SitePulse demo');assert.equal(result.heading,'Your website is responding.');assert.ok(result.screenshot.length>100);
console.log('PASS: authentication → SQL queue → Puppeteer → MongoDB result → API');
