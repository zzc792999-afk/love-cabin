'use strict';
const {randomUUID}=require('node:crypto');
const {Pool}=require('pg');
const COLLECTIONS=['messages','config','wishlist','diary','decisions','polaroids','food_menu','food_orders'];
const documentKey=doc=>doc.id===undefined?'generated:'+randomUUID():JSON.stringify(doc.id);

async function createStorage(pool){
    await pool.query(`CREATE TABLE IF NOT EXISTS cabin_documents (
        collection TEXT NOT NULL, key TEXT NOT NULL, document JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), sequence BIGSERIAL UNIQUE, PRIMARY KEY(collection,key))`);
    await pool.query('CREATE TABLE IF NOT EXISTS cabin_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    function collection(name){
        if(!COLLECTIONS.includes(name))throw new Error('Unknown collection');
        function find(filter={}){
            let order='',limit;
            const cursor={
                sort(spec){if(Object.keys(spec).some(k=>k!=='timestamp'))throw new Error('Unsupported sort');order=spec.timestamp===-1?' DESC':' ASC';return cursor},
                limit(value){if(!Number.isInteger(value)||value<1)throw new Error('Invalid limit');limit=value;return cursor},
                async toArray(){
                    const args=[name,JSON.stringify(filter)];
                    let sql='SELECT document FROM cabin_documents WHERE collection=$1 AND document @> $2::jsonb';
                    sql+=order?" ORDER BY document -> 'timestamp'"+order+', sequence ASC':' ORDER BY sequence ASC';
                    if(limit){args.push(limit);sql+=' LIMIT $3'}
                    return (await pool.query(sql,args)).rows.map(row=>row.document);
                }
            };return cursor;
        }
        return {
            find,
            async findOne(filter){return (await find(filter).limit(1).toArray())[0]||null},
            async insertOne(doc){
                const result=await pool.query('INSERT INTO cabin_documents(collection,key,document) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING',[name,documentKey(doc),JSON.stringify(doc)]);
                return {acknowledged:true,insertedCount:result.rowCount};
            },
            async insertMany(docs){
                const client=await pool.connect();let insertedCount=0;
                try{await client.query('BEGIN');for(const doc of docs){const r=await client.query('INSERT INTO cabin_documents(collection,key,document) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING',[name,documentKey(doc),JSON.stringify(doc)]);insertedCount+=r.rowCount}await client.query('COMMIT');return {acknowledged:true,insertedCount}}
                catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
            },
            async modifyDocument(filter,transform){
                const client=await pool.connect();
                try{
                    await client.query('BEGIN');
                    await client.query('INSERT INTO cabin_documents(collection,key,document) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING',[name,documentKey(filter),JSON.stringify(filter)]);
                    const {rows}=await client.query('SELECT document FROM cabin_documents WHERE collection=$1 AND key=$2 FOR UPDATE',[name,documentKey(filter)]);
                    const next=transform(rows[0].document);
                    await client.query('UPDATE cabin_documents SET document=$3::jsonb WHERE collection=$1 AND key=$2',[name,documentKey(filter),JSON.stringify(next)]);
                    await client.query('COMMIT');return next;
                }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
            },
            async updateOne(filter,update,options={}){
                if(filter.id===undefined||!update.$set)throw new Error('Expected id and $set');
                const patch={...update.$set,id:filter.id};
                if(options.upsert){
                    const result=await pool.query(`INSERT INTO cabin_documents(collection,key,document) VALUES($1,$2,$3::jsonb)
                        ON CONFLICT(collection,key) DO UPDATE SET document=cabin_documents.document || EXCLUDED.document`,[name,documentKey(filter),JSON.stringify({...filter,...patch})]);
                    return {acknowledged:true,modifiedCount:result.rowCount};
                }
                const result=await pool.query('UPDATE cabin_documents SET document=document || $3::jsonb WHERE collection=$1 AND document @> $2::jsonb',[name,JSON.stringify(filter),JSON.stringify(patch)]);
                return {acknowledged:true,modifiedCount:result.rowCount};
            },
            async deleteOne(filter){
                const result=await pool.query('DELETE FROM cabin_documents WHERE collection=$1 AND key=(SELECT key FROM cabin_documents WHERE collection=$1 AND document @> $2::jsonb ORDER BY sequence LIMIT 1)',[name,JSON.stringify(filter)]);
                return {acknowledged:true,deletedCount:result.rowCount};
            }
        };
    }
    return {
        collection,
        async health(){return (await pool.query('SELECT 1 AS ok')).rows[0].ok===1},
        async importSnapshot(snapshot){
            const data=snapshot.data||snapshot;
            for(const name of COLLECTIONS){if(!(name in data))throw new Error('Incomplete migration snapshot: '+name)}
            const client=await pool.connect();
            try{
                await client.query('BEGIN');
                const marker=await client.query("INSERT INTO cabin_migrations(name) VALUES('online-json-import-v1') ON CONFLICT DO NOTHING RETURNING name");
                if(!marker.rowCount){await client.query('ROLLBACK');return {imported:false}}
                const counts={};
                for(const name of COLLECTIONS){
                    let documents=data[name];
                    if(name==='config')documents=[{...documents,id:'global'}];
                    else if(name==='wishlist')documents=[{id:'global_wishlist',items:documents}];
                    if(!Array.isArray(documents))throw new Error('Invalid migration collection: '+name);
                    counts[name]=documents.length;
                    for(const doc of documents)await client.query('INSERT INTO cabin_documents(collection,key,document) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING',[name,documentKey(doc),JSON.stringify(doc)]);
                }
                await client.query('COMMIT');return {imported:true,counts};
            }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
        },
        close:()=>pool.end()
    };
}
async function connectStorage(connectionString){
    const options={connectionString,max:5,connectionTimeoutMillis:15000,idleTimeoutMillis:30000,query_timeout:15000};
    async function initialize(pool){
        pool.on('error',()=>console.error('PostgreSQL connection interrupted; subsequent requests will retry.'));
        try{return await createStorage(pool)}catch(error){await pool.end();throw error}
    }
    try{return await initialize(new Pool(options))}catch(error){
        const isNeon=/(^|\.)neon\.tech$/.test(new URL(connectionString).hostname);
        const networkFailure=['ECONNRESET','ETIMEDOUT','ECONNREFUSED'].includes(error.code)||/terminated unexpectedly|timeout/i.test(error.message);
        if(!isNeon||!networkFailure)throw error;
        // Some networks block native PostgreSQL TCP. The secure WebSocket transport
        // reaches the exact same database and retains transaction semantics.
        const {Pool:WebSocketPool,neonConfig}=require('@neondatabase/serverless');
        neonConfig.webSocketConstructor=globalThis.WebSocket;
        console.warn('PostgreSQL TCP unavailable; retrying the same Neon database over secure WebSocket.');
        return initialize(new WebSocketPool(options));
    }
}
module.exports={createStorage,connectStorage,COLLECTIONS};
