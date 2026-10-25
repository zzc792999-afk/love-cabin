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
 const cookie=(res,value,age)=>res.appendHeader('Set-Cookie',`cabin_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure()?'; Secure':''}`);
 return async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),p=decodeURIComponent(url.pathname);
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
   const needsAdmin=p.startsWith('/api/v2/admin/')||p==='/api/v2/logout'||(p==='/api/food/orders'&&['PUT','DELETE'].includes(req.method))||(p==='/api/food/menu'&&['POST','DELETE'].includes(req.method));
   const adminHash=needsAdmin?(await col.findOne({id:'private_cabin_admin_auth'}))?.hash||options.adminPasswordHash||process.env.CABIN_ADMIN_PASSWORD_HASH||'':'';
   const adminToken=/(?:^|;\s*)cabin_admin_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];
   const adminRecord=needsAdmin&&adminToken?await col.findOne({id:'v2_admin_session:'+hash(adminToken)}):null;
   const adminVersion=hash(adminHash+':'+current);
   const isAdmin=!!(adminHash&&adminRecord&&adminRecord.expires>Date.now()&&adminRecord.version===adminVersion);
   const adminCookie=(value,age)=>res.appendHeader('Set-Cookie',`cabin_admin_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure()?'; Secure':''}`);
   if(p==='/api/v2/admin/session'&&req.method==='GET')return send(res,200,{authenticated:isAdmin,configured:!!adminHash}),true;
   if(p==='/api/v2/admin/login'&&req.method==='POST'){
    if(!adminHash)return send(res,503,{error:'管理员登录尚未配置，请联系维护者'}),true;
    const key='admin:'+(req.socket.remoteAddress||'global'),now=Date.now();let a=attempts.get(key);if(!a||now-a.start>900000){a={start:now,count:0};attempts.set(key,a)}if(++a.count>15)return send(res,429,{error:'管理员登录尝试过多，请 15 分钟后重试'}),true;
    const b=await readJson(req);if(!await verify(b.password,adminHash))return send(res,401,{error:'管理员密码不正确'}),true;
    const session=randomBytes(32).toString('hex');await col.updateOne({id:'v2_admin_session:'+hash(session)},{$set:{kind:'v2_admin_session',expires:now+8*3600000,version:adminVersion}},{upsert:true});adminCookie(session,8*3600);attempts.delete(key);for(const row of await col.find({kind:'v2_admin_session'}).toArray())if(row.expires<now)await col.deleteOne({id:row.id});return send(res,200,{ok:true}),true;
   }
   if(p==='/api/v2/admin/logout'&&req.method==='POST'){if(adminToken)await col.deleteOne({id:'v2_admin_session:'+hash(adminToken)});adminCookie('',0);return send(res,200,{ok:true}),true}
   const foodManagement=(p==='/api/food/orders'&&['PUT','DELETE'].includes(req.method))||(p==='/api/food/menu'&&['POST','DELETE'].includes(req.method));
   if(foodManagement&&!isAdmin)return send(res,403,{error:'此操作仅限管理员，请进入餐厅管理后台'}),true;
   if(p==='/api/v2/admin/kitchen'&&req.method==='GET'){
    if(!isAdmin)return send(res,403,{error:'请先登录餐厅管理员'}),true;
    const [orders,menu]=await Promise.all(['food_orders','food_menu'].map(async name=>{const c=await getCollection(name);if(!c)throw Error('Cloud storage required');return c.find({}).toArray()}));
    return send(res,200,{orders,menu}),true;
   }
   if(p==='/api/food/orders'&&req.method==='PUT'){
    const b=await readJson(req);if(typeof b.id!=='string'||!['pending','cooking','delivering','completed'].includes(b.status))return send(res,400,{error:'订单或状态无效'}),true;
    const orders=await getCollection('food_orders');if(!orders)return send(res,503,{error:'请先连接云数据库'}),true;const order=await orders.findOne({id:b.id});if(!order)return send(res,404,{error:'订单不存在'}),true;
    await orders.updateOne({id:b.id},{$set:{status:b.status,updateTime:Date.now()}});return send(res,200,{success:true,id:b.id,status:b.status}),true;
   }

   if(p==='/api/v2/logout'&&req.method==='POST'){if(adminToken)await col.deleteOne({id:'v2_admin_session:'+hash(adminToken)});adminCookie('',0);if(token)await col.deleteOne({id:'v2_session:'+hash(token)});cookie(res,'',0);return send(res,200,{ok:true}),true}
   if(p==='/api/v2/password'&&req.method==='PUT'){
    const b=await readJson(req);if(!await verify(b.currentPassword,current))return send(res,403,{error:'原口令不正确'}),true;if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)return send(res,400,{error:'新口令需要 12–128 个字符'}),true;await col.updateOne({id:'private_cabin_auth'},{$set:{hash:await passwordHash(b.password)}},{upsert:true});cookie(res,'',0);return send(res,200,{ok:true}),true;
   }
   if(p==='/api/food/menu'&&req.method==='POST'){
    const b=await readJson(req);if(typeof b.name!=='string'||!b.name.trim()||b.name.length>50||typeof b.desc!=='string'||b.desc.length>160||typeof b.emoji!=='string'||b.emoji.length>12||typeof b.category!=='string'||!b.category.trim()||b.category.length>30||!Number.isFinite(b.price)||b.price<0||b.price>9999)return send(res,400,{error:'请检查菜名、图标、分类和价格'}),true;
    const dishes=await getCollection('food_menu');if(!dishes)return send(res,503,{error:'请先连接云数据库'}),true;if((await dishes.find({}).toArray()).length>=100)return send(res,409,{error:'菜单最多 100 道菜，请先整理'}),true;
    const dish={id:'dish_'+randomUUID(),name:b.name.trim(),desc:b.desc.trim(),emoji:b.emoji,category:b.category.trim(),price:b.price,available:true};await dishes.insertOne(dish);return send(res,200,{success:true,dish}),true;
   }
   if(p==='/api/food/menu'&&req.method==='DELETE'){
    const dishes=await getCollection('food_menu');if(!dishes)return send(res,503,{error:'请先连接云数据库'}),true;const id=url.searchParams.get('id'),dish=(await dishes.find({}).toArray()).find(d=>String(d.id)===id);if(!dish)return send(res,404,{error:'菜品不存在'}),true;await dishes.deleteOne({id:dish.id});return send(res,200,{success:true}),true;
   }
   const legacyFiles={config:'config.json',messages:'messages.json',wishlist:'wishlist.json',diary:'diary.json',decisions:'decisions.json',polaroids:'polaroids.json',food_menu:'food_menu.json',food_orders:'food_orders.json'};
   const records=async(name,filter={},without=[])=>{
    const c=await getCollection(name);
    if(c){if(without.length&&typeof c.withoutFields==='function')return c.withoutFields(filter,without);return c.find(filter).toArray()}
    const file=path.join(options.root||__dirname,'other',legacyFiles[name]);if(!fs.existsSync(file))return [];
    const value=JSON.parse(fs.readFileSync(file,'utf8'));return Array.isArray(value)?value:[value];
   };
   if(p==='/api/v2/snapshot'&&req.method==='GET'){
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const [configs,messages,wishes,diary,decisions,photos,menu,orders,moods,events]=await Promise.all([
     records('config',{id:'global'}),records('messages'),records('wishlist',{id:'global_wishlist'}),records('diary'),records('decisions'),records('polaroids',{},['imgData','image','src']),records('food_menu'),records('food_orders'),col.find({kind:'v2_mood',day:today}).toArray(),col.find({kind:'v2_event'}).toArray()]);
    const cfg=configs.find(x=>x.id==='global')||configs[0]||{};
    const keys=['config_partner_a','config_partner_b','config_meet_date','config_countdown_title','config_countdown_target','config_custom_announcement','config_photo_list'];
    const config=Object.fromEntries(keys.filter(k=>Object.hasOwn(cfg,k)).map(k=>[k,cfg[k]]));
    const polaroids=photos.map(x=>{const {imgData,image,src,...meta}=x;return {...meta,src:'/api/v2/photos/'+encodeURIComponent(String(x.id))}});
    return send(res,200,{config,messages,wishlist:wishes[0]?.items||(!await getCollection('wishlist')?wishes:[]),diary,decisions,polaroids,menu,orders,next:{moods,events}}),true;
   }
   const photo=/^\/api\/v2\/photos\/([^/]{1,160})$/.exec(p);
   if(photo&&['GET','HEAD'].includes(req.method)){
    const c=await getCollection('polaroids');let item=c?await c.findOne({id:photo[1]}):(await records('polaroids')).find(x=>String(x.id)===photo[1]);if(!item&&c&&/^\d+$/.test(photo[1]))item=await c.findOne({id:Number(photo[1])});
    if(!item)return send(res,404,{error:'照片已移除'}),true;
    const source=item.imgData||item.image||item.src||'';if(typeof source!=='string'||!source.trim())return send(res,404,{error:'照片链接无效'}),true;if(source.length>17*1024*1024)return send(res,413,{error:'照片数据过大'}),true;
    const match=/^data:image\/(jpeg|png|webp|gif);base64,([a-z0-9+/=\s]+)$/i.exec(source);
    if(match){const bytes=Buffer.from(match[2].replace(/\s/g,''),'base64');if(!bytes.length||bytes.length>12*1024*1024)return send(res,413,{error:'照片数据过大或无效'}),true;res.writeHead(200,{'Content-Type':'image/'+match[1].toLowerCase(),'Content-Length':bytes.length,'Cache-Control':'private, no-store'});res.end(req.method==='HEAD'?undefined:bytes);return true}
    try{const target=new URL(source,'http://'+req.headers.host+'/');if(!['http:','https:'].includes(target.protocol)||(target.host===req.headers.host&&target.pathname===p))throw Error();const location=target.host===req.headers.host?target.pathname+target.search+target.hash:target.href;res.writeHead(302,{Location:location,'Cache-Control':'private, no-store'});res.end();return true}catch{return send(res,404,{error:'照片链接无效'}),true}
   }
   if(p==='/api/v2/orders'&&req.method==='POST'){
    const b=await readJson(req);
    if(typeof b.id!=='string'||!/^ord_[a-f0-9-]{36}$/.test(b.id)||!['zuzhe','shanshan'].includes(b.role)||typeof b.note!=='string'||b.note.length>100||!Array.isArray(b.items)||!b.items.length||b.items.length>30||b.items.some(i=>!i||!['string','number'].includes(typeof i.id)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>20)||new Set(b.items.map(i=>JSON.stringify(i.id))).size!==b.items.length)return send(res,400,{error:'请检查餐单和数量，每道菜最多 20 份'}),true;
    const orders=await getCollection('food_orders'),dishes=await getCollection('food_menu');if(!orders||!dishes)return send(res,503,{error:'需要连接云数据库才能下单'}),true;
    const requestHash=hash(JSON.stringify({role:b.role,note:b.note.trim(),items:[...b.items].sort((a,b)=>String(a.id).localeCompare(String(b.id)))}));
    const existing=await orders.findOne({id:b.id});if(existing)return send(res,existing.requestHash===requestHash?200:409,existing.requestHash===requestHash?{success:true,order:existing}:{error:'餐单内容已变化，请重新确认后下单'}),true;
    const menu=await dishes.find({}).toArray();const items=[];
    for(const line of b.items){const dish=menu.find(d=>d.id===line.id&&d.available!==false);if(!dish)return send(res,409,{error:'有菜品已下架，请刷新菜单后再确认'}),true;items.push({id:dish.id,name:dish.name,emoji:dish.emoji,price:Number(dish.price)||0,quantity:line.quantity})}
    const cfg=await col.findOne({id:'global'})||{},customer=b.role==='zuzhe'?(cfg.config_partner_a||'陈祖哲'):(cfg.config_partner_b||'白珊珊');
    const order={id:b.id,customer,author:customer,items,note:b.note.trim(),total:Math.round(items.reduce((n,x)=>n+x.price*x.quantity,0)*100)/100,status:'pending',timestamp:Date.now(),requestHash};
    await orders.insertOne(order);const saved=await orders.findOne({id:b.id});if(saved.requestHash!==requestHash)return send(res,409,{error:'这份餐单已提交过不同内容，请重新确认'}),true;
    return send(res,200,{success:true,order:saved}),true;
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
