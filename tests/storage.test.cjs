const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {createStorage}=require('../cabin-storage.cjs');
async function fixture(t){
    const engine=new PGlite();
    const query=async(sql,args)=>{const r=await engine.query(sql,args);return {...r,rowCount:r.affectedRows}};
    const pool={query,connect:async()=>({query,release(){}}),end:()=>engine.close()};
    const storage=await createStorage(pool);t.after(()=>storage.close());return storage;
}
test('PostgreSQL collection adapter preserves documents, types, order and atomic field updates',async t=>{
    const db=await fixture(t);const notes=db.collection('messages');
    await notes.insertOne({id:2,text:'first',x:1});await notes.insertOne({id:1,text:"'); DROP TABLE notes; --",x:2});
    await notes.insertOne({id:'1',text:'string id'});
    assert.deepEqual((await notes.find({}).toArray()).map(n=>n.id),[2,1,'1']);
    await notes.updateOne({id:1},{$set:{x:33,y:44}});
    assert.equal((await notes.findOne({id:1})).x,33);assert.equal((await notes.findOne({id:'1'})).text,'string id');
    assert.equal((await notes.findOne({id:1})).text,"'); DROP TABLE notes; --");
    const config=db.collection('config');await config.updateOne({id:'global'},{$set:{a:'1'}},{upsert:true});
    await Promise.all([config.updateOne({id:'global'},{$set:{b:'2'}}),config.updateOne({id:'global'},{$set:{c:'3'}})]);
    assert.deepEqual(await config.findOne({id:'global'}),{id:'global',a:'1',b:'2',c:'3'});
    const orders=db.collection('food_orders');await orders.insertMany([{id:'a',timestamp:9,status:'new'},{id:'b',timestamp:100,status:'new'},{id:'c',timestamp:20,status:'new'}]);
    assert.deepEqual((await orders.find({}).sort({timestamp:-1}).limit(2).toArray()).map(n=>n.id),['b','c']);
    await orders.updateOne({id:'b'},{$set:{status:'done'}});assert.equal((await orders.findOne({id:'b'})).timestamp,100);
    await notes.deleteOne({id:1});assert.equal(await notes.findOne({id:1}),null);assert.ok(await notes.findOne({id:'1'}));
});
test('snapshot imports all eight collections once and preserves deletion across redeploy',async t=>{
    const db=await fixture(t);
    const snapshot={data:{messages:[{id:1,text:'old note'}],config:{quarrel_mode:'false',custom:'keep'},wishlist:[{id:'wish',title:'one'}],diary:[{id:'d',timestamp:1}],decisions:[{id:8,timestamp:2}],polaroids:[{id:'p',image:'data:image/png;base64,abc'}],food_menu:[{id:'m',price:12}],food_orders:[{id:'o',status:'new',timestamp:3}]}};
    await assert.rejects(db.importSnapshot({data:{...snapshot.data,diary:null}}),/Invalid migration/);
    const r=await db.importSnapshot(snapshot);assert.equal(r.imported,true);
    assert.deepEqual((await db.collection('wishlist').findOne({id:'global_wishlist'})).items,snapshot.data.wishlist);
    assert.equal((await db.collection('config').findOne({id:'global'})).custom,'keep');
    for(const name of ['messages','diary','decisions','polaroids','food_menu','food_orders'])assert.deepEqual(await db.collection(name).find({}).toArray(),snapshot.data[name]);
    await db.collection('messages').deleteOne({id:1});await db.collection('config').updateOne({id:'global'},{$set:{custom:'changed'}});
    assert.equal((await db.importSnapshot(snapshot)).imported,false);
    assert.equal((await db.collection('messages').find({}).toArray()).length,0);
    assert.equal((await db.collection('config').findOne({id:'global'})).custom,'changed');
    await assert.rejects(db.importSnapshot({data:{messages:[]}}),/Incomplete/);
});
