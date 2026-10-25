'use strict';
const {randomBytes,randomUUID,createHash,scrypt:rawScrypt,timingSafeEqual}=require('node:crypto');
const {promisify}=require('node:util');const fs=require('node:fs');const path=require('node:path');const scrypt=promisify(rawScrypt);
const hash=s=>createHash('sha256').update(s).digest('hex');
async function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+Buffer.from(await scrypt(password,salt,64)).toString('hex')}
async function verify(password,encoded){if(typeof password!=='string'||password.length>128||!/^\w{32}:[a-f0-9]{128}$/.test(encoded||''))return false;const [salt,digest]=encoded.split(':');return timingSafeEqual(await scrypt(password,salt,64),Buffer.from(digest,'hex'))}
async function readJson(req){if(!req.headers['content-type']?.startsWith('application/json'))throw Object.assign(Error('请发送 JSON 数据'),{status:415});let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>12000)throw Object.assign(Error('内容太长了'),{status:413})}try{const b=JSON.parse(body);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b}catch{throw Object.assign(Error('数据格式无效'),{status:400})}}
function localCollection(root){const file=path.join(root,'.private','cabin-next.json');let docs;const load=()=>{if(!docs)docs=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];return docs};const save=()=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(docs))};return {find:f=>({toArray:async()=>load().filter(d=>Object.entries(f).every(([k,v])=>d[k]===v))}),findOne:async f=>load().find(d=>Object.entries(f).every(([k,v])=>d[k]===v))||null,updateOne:async(f,u)=>{load();let d=docs.find(x=>x.id===f.id);if(!d){d={...f};docs.push(d)}Object.assign(d,u.$set);save()},deleteOne:async f=>{load();docs=docs.filter(d=>d.id!==f.id);save()}}}
function createNext(getCollection,options={}){
 const fallback=localCollection(options.root||__dirname);const collection=async()=>await getCollection('config')||fallback;const attempts=new Map();const secure=()=>process.env.NODE_ENV==='production'||!!process.env.RENDER;
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 const cookie=(res,value,age)=>res.setHeader('Set-Cookie',`cabin_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure()?'; Secure':''}`);
 return async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),p=url.pathname;
  if(p==='/ping'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:'ok');return true}
  const publicFiles=['/','/index.html','/manifest.json','/sw.js','/js/cabin-next.js','/js/cabin-next.css','/images/icon-192.png','/images/icon-512.png'];
  const isAuth=p.startsWith('/api/v2/'),isApi=p.startsWith('/api/');
  if(publicFiles.includes(p))return false;
  try{
   if(!['GET','HEAD','OPTIONS'].includes(req.method)){
    if(req.headers['sec-fetch-site']==='cross-site')return send(res,403,{error:'请从小屋内操作'}),true;
    if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin)}catch{return send(res,403,{error:'来源无效'}),true}if(origin.host!==req.headers.host)return send(res,403,{error:'请从小屋内操作'}),true}
   }
   const col=await collection();const stored=await col.findOne({id:'private_cabin_auth'});const current=stored?.hash||options.passwordHash||process.env.CABIN_PASSWORD_HASH||'';
   const token=/(?:^|;\s*)cabin_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];const record=token?await col.findOne({id:'v2_session:'+hash(token)}):null;
   const enabled=!!current,authenticated=enabled?!!(record&&record.expires>Date.now()&&record.version===hash(current)):!process.env.RENDER;
   if(p==='/api/v2/session'&&req.method==='GET')return send(res,200,{authenticated,configured:enabled,local:!enabled}),true;
   if(p==='/api/v2/login'&&req.method==='POST'){
    if(!enabled)return send(res,503,{error:'小屋口令尚未配置，请联系维护者'}),true;
    const key=req.socket.remoteAddress||'global',now=Date.now();let a=attempts.get(key);if(!a||now-a.start>900000){a={start:now,count:0};attempts.set(key,a)}if(++a.count>30)return send(res,429,{error:'尝试太多，请 15 分钟后再试'}),true;
    const b=await readJson(req);if(!await verify(b.password,current))return send(res,401,{error:'口令不对，再检查一下吧'}),true;
    const session=randomBytes(32).toString('hex');await col.updateOne({id:'v2_session:'+hash(session)},{$set:{kind:'v2_session',expires:now+30*86400000,version:hash(current)}},{upsert:true});cookie(res,session,30*86400);attempts.delete(key);for(const row of await col.find({kind:'v2_session'}).toArray())if(row.expires<now)await col.deleteOne({id:row.id});return send(res,200,{ok:true}),true;
   }
   if(!authenticated){if(isApi){send(res,401,{error:'请先输入小屋口令'});return true}res.writeHead(302,{Location:'/?next='+encodeURIComponent(p+url.search)});res.end();return true}
   req.cabinPrivate=true;
   if(p==='/api/v2/logout'&&req.method==='POST'){if(token)await col.deleteOne({id:'v2_session:'+hash(token)});cookie(res,'',0);return send(res,200,{ok:true}),true}
   if(p==='/api/v2/password'&&req.method==='PUT'){
    const b=await readJson(req);if(!await verify(b.currentPassword,current))return send(res,403,{error:'原口令不正确'}),true;if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)return send(res,400,{error:'新口令需要 12–128 个字符'}),true;await col.updateOne({id:'private_cabin_auth'},{$set:{hash:await passwordHash(b.password)}},{upsert:true});cookie(res,'',0);return send(res,200,{ok:true}),true;
   }
   const state=async()=>({moods:await col.find({kind:'v2_mood'}).toArray(),events:await col.find({kind:'v2_event'}).toArray()});
   if(p==='/api/v2/state'&&req.method==='GET')return send(res,200,await state()),true;
   if(p==='/api/v2/mood'&&req.method==='PUT'){
    const b=await readJson(req);if(!['shanshan','zuzhe'].includes(b.role)||!['开心','平静','想你','疲惫','需要抱抱'].includes(b.mood)||typeof b.note!=='string'||b.note.length>100)return send(res,400,{error:'请选择心情，附言不超过 100 字'}),true;
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());await col.updateOne({id:'v2_mood:'+day+':'+b.role},{$set:{kind:'v2_mood',day,role:b.role,mood:b.mood,note:b.note.trim(),timestamp:Date.now()}},{upsert:true});return send(res,200,await state()),true;
   }
   if(p==='/api/v2/mood'&&req.method==='DELETE'){
    const role=url.searchParams.get('role');if(!['zuzhe','shanshan'].includes(role))return send(res,400,{error:'记录身份无效'}),true;const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());await col.deleteOne({id:'v2_mood:'+day+':'+role});return send(res,200,await state()),true;
   }
   if(p==='/api/v2/events'&&req.method==='POST'){
    const b=await readJson(req);if(typeof b.title!=='string'||!b.title.trim()||b.title.length>50||typeof b.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.day)||!Number.isFinite(Date.parse(b.day))||new Date(b.day).toISOString().slice(0,10)!==b.day||typeof b.yearly!=='boolean')return send(res,400,{error:'请填写有效日期和 1–50 字的标题'}),true;
    if((await col.find({kind:'v2_event'}).toArray()).length>=100)return send(res,409,{error:'最多保存 100 个纪念日'}),true;await col.updateOne({id:'v2_event:'+randomUUID()},{$set:{kind:'v2_event',title:b.title.trim(),day:b.day,yearly:b.yearly,timestamp:Date.now()}},{upsert:true});return send(res,201,await state()),true;
   }
   if(p==='/api/v2/events'&&req.method==='DELETE'){const id=url.searchParams.get('id');if(!id?.startsWith('v2_event:'))return send(res,400,{error:'纪念日不存在'}),true;await col.deleteOne({id});return send(res,200,await state()),true}
   if(p==='/api/v2/wishes'&&req.method==='POST'){
    const b=await readJson(req);if(!['add','toggle','delete'].includes(b.action))return send(res,400,{error:'心愿操作无效'}),true;
    if(b.action==='add'&&(typeof b.title!=='string'||!b.title.trim()||b.title.length>80||!['daily','travel','food','special'].includes(b.category)))return send(res,400,{error:'心愿标题限 80 字，请选择分类'}),true;
    if(b.action==='toggle'&&typeof b.completed!=='boolean')return send(res,400,{error:'完成状态无效'}),true;
    const wishes=await getCollection('wishlist');if(!wishes?.modifyDocument)return send(res,503,{error:'需要连接云数据库才能修改共享心愿'}),true;
    const doc=await wishes.modifyDocument({id:'global_wishlist'},d=>{let items=Array.isArray(d.items)?d.items:[];
     if(b.action==='add'){if(items.length>=200)throw Object.assign(Error('心愿最多 200 项'),{status:409});items=[...items,{id:randomUUID(),title:b.title.trim(),category:b.category,completed:false}]}
     if(b.action==='toggle')items=items.map(x=>x.id===b.id?{...x,completed:b.completed}:x);
     if(b.action==='delete')items=items.filter(x=>x.id!==b.id);
     return {...d,items};});return send(res,200,{items:doc.items}),true;
   }
   if(isAuth)return send(res,404,{error:'接口不存在'}),true;
   return false;
  }catch(e){send(res,e.status||503,{error:e.status?e.message:'云端暂时没有回应，请稍后重试，内容未假保存'});return true}
 };
}
module.exports={createNext,passwordHash,verify};
