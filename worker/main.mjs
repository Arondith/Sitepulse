import pg from 'pg';
import {MongoClient} from 'mongodb';
import puppeteer from 'puppeteer';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {allowedURL, nextState, validID} from './policy.mjs';

const sql = new pg.Pool({connectionString:process.env.DATABASE_URL});
const mongo = new MongoClient(process.env.MONGO_URL);
await mongo.connect();
const results = mongo.db('sitepulse').collection('results');
await results.createIndex({run_id:1},{unique:true});
const origins = new Set((process.env.ALLOWED_ORIGINS || 'http://fixture').split(',').map(x=>x.trim()));
const server=createServer(async(req,res)=>{
 const id=req.url?.split('/').pop() || '';
 if(req.method!=='GET'||!req.url?.startsWith('/api/results/')||!validID(id)){res.writeHead(404);res.end();return;}
 try{
  const result=await results.findOne({run_id:id},{projection:{_id:0}});
  res.writeHead(result?200:404,{'Content-Type':'application/json'});res.end(JSON.stringify(result || {error:'result not ready'}));
 }catch{res.writeHead(503);res.end('results database unavailable')}
});
server.listen(8081,'0.0.0.0');
let stopping=false;
process.on('SIGTERM',()=>{stopping=true});process.on('SIGINT',()=>{stopping=true});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function inspect(job) {
 if(!allowedURL(job.url,origins)) throw new Error('Monitor origin is not allowed');
 const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || undefined});
 try{
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:800});
  await page.setRequestInterception(true);
  page.on('request',request=>{void (allowedURL(request.url(),origins)?request.continue():request.abort()).catch(()=>{});});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error).slice(0,500)));
  const start=Date.now();
  const response=await page.goto(job.url,{waitUntil:'networkidle2',timeout:20000});
  const elapsed=Date.now()-start;
  const title=await page.title();
  const heading=await page.$eval('h1',el=>el.textContent).catch(()=>null);
  const screenshot=await page.screenshot({encoding:'base64',type:'jpeg',quality:55});
  return {run_id:job.id,url:job.url,status:response?.status() || 0,title,heading,duration_ms:elapsed,errors:errors.slice(0,20),screenshot,checked_at:new Date()};
 }finally{await browser.close()}
}

while(!stopping){
 try{
  // A worker that died on its last attempt must not leave a run stuck forever.
  await sql.query("UPDATE runs SET state='failed',error='Worker lease expired after final attempt',finished_at=now() WHERE state='running' AND lease_until<now() AND attempts>=3");
  const token=randomUUID();
  // One atomic SQL statement: SKIP LOCKED lets other workers claim other jobs.
  const claimed=await sql.query(`WITH candidate AS (
   SELECT id FROM runs WHERE (state='queued' OR (state='running' AND lease_until<now())) AND attempts<3
   ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1
  ) UPDATE runs SET state='running',attempts=attempts+1,lease_token=$1,lease_until=now()+interval '60 seconds'
    FROM candidate WHERE runs.id=candidate.id RETURNING runs.*`,[token]);
  const job=claimed.rows[0];if(!job){await delay(1000);continue;}
  const monitor=await sql.query('SELECT url FROM monitors WHERE id=$1',[job.monitor_id]);job.url=monitor.rows[0].url;
  const heartbeat=setInterval(()=>{void sql.query("UPDATE runs SET lease_until=now()+interval '60 seconds' WHERE id=$1 AND lease_token=$2 AND state='running'",[job.id,token]).catch(console.error)},15000);
  try{
   const result=await inspect(job);
   // Stable run id makes retries overwrite one document instead of duplicating it.
   try {
    await results.updateOne({run_id:job.id,$or:[{attempt:{$lte:job.attempts}},{attempt:{$exists:false}}]},{$set:{...result,attempt:job.attempts}},{upsert:true});
   } catch (error) {
    // A newer attempt already wrote this run. The unique index rejects a stale upsert.
    if(error.code !== 11000) throw error;
   }
   await sql.query("UPDATE runs SET state='completed',finished_at=now(),error=NULL WHERE id=$1 AND lease_token=$2 AND state='running'",[job.id,token]);
   console.log(JSON.stringify({event:'completed',run_id:job.id}));
  }catch(error){
   const state=nextState(job.attempts);
   await sql.query("UPDATE runs SET state=$3,error=$4,finished_at=CASE WHEN $3='failed' THEN now() ELSE NULL END WHERE id=$1 AND lease_token=$2 AND state='running'",[job.id,token,state,String(error).slice(0,1000)]);
   console.error(JSON.stringify({event:state,run_id:job.id,error:String(error)}));
  }finally{clearInterval(heartbeat)}
 }catch(error){console.error(error);await delay(2000)}
}
server.close();await sql.end();await mongo.close();
