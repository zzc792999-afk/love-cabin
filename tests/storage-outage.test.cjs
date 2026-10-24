const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('configured cloud outage returns failure instead of writing local JSON',async t=>{
    process.env.DATABASE_URL='postgresql://unused:unused@127.0.0.1:1/unused?sslmode=disable';
    process.env.MONGODB_URI='';
    const filename=path.join(__dirname,'..','other','messages.json');const before=fs.readFileSync(filename,'utf8');
    const server=require('../server');await server.ready;
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    t.after(()=>{server.closeAllConnections();server.close()});
    const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:Date.now(),text:'must not be saved'})});
    assert.equal(r.status,503);assert.equal(fs.readFileSync(filename,'utf8'),before);
});
