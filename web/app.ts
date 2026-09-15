type Monitor = {id:number;name:string;url:string};
type Run = {id:string;name:string;state:'queued'|'running'|'completed'|'failed';attempts:number;created_at:string;error:string|null};
type Result = {screenshot:string;title:string;status:number;duration_ms:number;errors:string[]};
function el<T extends HTMLElement>(id:string):T {return document.getElementById(id) as T}
let token='';let timer:ReturnType<typeof setInterval>|undefined;let refreshing=false;
const message=(text:string)=>{el('message').textContent=text};
async function request<T>(path:string,options:RequestInit={}):Promise<T>{
 const response=await fetch(path,{...options,headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}});
 if(!response.ok)throw new Error(response.status===401?'Check your API token.':await response.text());
 return response.json() as Promise<T>;
}
function node(tag:string,text:string,className=''):HTMLElement{const n=document.createElement(tag);n.textContent=text;n.className=className;return n}
async function refresh(){
 if(!token||refreshing)return;refreshing=true;
 try{
  const runs=await request<Run[]>('/api/runs');const container=el('runs');container.replaceChildren();
  if(!runs.length)container.append(node('p','No checks yet. Run your first monitor above.'));
  for(const run of runs){
   const row=node('div','','run');const info=node('div','','info');info.append(node('strong',run.name),node('small',`${new Date(run.created_at).toLocaleString()} · Attempt ${run.attempts}${run.error?' · '+run.error:''}`));
   row.append(info,node('span',run.state,`badge ${run.state}`));
   if(run.state==='completed'){const button=node('button','View result','secondary');button.onclick=()=>void details(run.id);row.append(button)}container.append(row);
  }
 }catch(error){message(String(error))}finally{refreshing=false}
}
async function details(id:string){
 try{const result=await request<Result>(`/api/results/${id}`);const {screenshot,...metadata}=result;el('metadata').textContent=JSON.stringify(metadata,null,2);el<HTMLImageElement>('screenshot').src=`data:image/jpeg;base64,${screenshot}`;el<HTMLDialogElement>('detail').showModal()}catch(error){message(String(error))}
}
el('connect').onclick=async()=>{
 token=el<HTMLInputElement>('token').value;clearInterval(timer);el('monitors').replaceChildren();el('runs').replaceChildren();
 try{
  const monitors=await request<Monitor[]>('/api/monitors');el('count').textContent=`${monitors.length} configured`;
  for(const monitor of monitors){const card=node('article','','monitor');const button=node('button','Run check') as HTMLButtonElement;
   button.onclick=async()=>{button.disabled=true;try{await request('/api/runs',{method:'POST',body:JSON.stringify({monitor_id:monitor.id})});message('Check queued. Results refresh every 3 seconds.');await refresh()}catch(error){message(String(error))}finally{button.disabled=false}};
   card.append(node('h3',monitor.name),node('p',monitor.url),button);el('monitors').append(card)
  };message('Connected. Ready to check.');await refresh();timer=setInterval(()=>void refresh(),3000);
 }catch(error){token='';message(String(error))}
};
el('refresh').onclick=()=>void refresh();el('close').onclick=()=>el<HTMLDialogElement>('detail').close();
