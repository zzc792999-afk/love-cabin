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
            async withoutFields(filter,fields){
                if(!Array.isArray(fields)||fields.some(x=>typeof x!=='string'))throw Error('Invalid projection');
                const result=await pool.query('SELECT document - $3::text[] AS document FROM cabin_documents WHERE collection=$1 AND document @> $2::jsonb ORDER BY sequence ASC',[name,JSON.stringify(filter),fields]);
                return result.rows.map(row=>row.document);
            },
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
const networkFailure=error=>['ECONNRESET','ETIMEDOUT','ECONNREFUSED','EPIPE','ENETUNREACH','57P01','57P02','57P03'].includes(error?.code)||/terminated unexpectedly|connection terminated|connection timeout|query read timeout|socket hang up/i.test(error?.message||'');
function recoverablePool(initial,createFallback){
    let active=initial,promoting;const pools=new Set([initial]),closing=new Map();
    const close=pool=>{if(!closing.has(pool))closing.set(pool,Promise.resolve().then(()=>pool.end()).catch(()=>{}));return closing.get(pool)};
    async function promote(error){
        if(!networkFailure(error)||!createFallback)throw error;if(active!==initial)return active;
        if(!promoting)promoting=Promise.resolve().then(createFallback).then(pool=>{pools.add(pool);active=pool;close(initial);console.warn('PostgreSQL network interrupted; subsequent queries use the same database over secure WebSocket.');return pool}).catch(e=>{promoting=null;throw e});
        return promoting;
    }
    return {
        async query(sql,args){const pool=active;try{return await pool.query(sql,args)}catch(error){if(pool!==initial||!networkFailure(error))throw error;const fallback=await promote(error);if(/^\s*SELECT\b/i.test(typeof sql==='string'?sql:sql.text||''))return fallback.query(sql,args);throw error}},
        async connect(){let client;try{client=await active.connect()}catch(error){client=await (await promote(error)).connect()}
            return {async query(sql,args){try{return await client.query(sql,args)}catch(error){if(networkFailure(error)&&active===initial)await promote(error).catch(()=>{});throw error}},release:(...args)=>client.release(...args)};
        },
        async end(){await Promise.all([...pools].map(close))}
    };
}
async function connectStorage(connectionString){
    const options={connectionString,max:5,connectionTimeoutMillis:15000,idleTimeoutMillis:10000,query_timeout:15000,keepAlive:true,keepAliveInitialDelayMillis:1000};
    const isNeon=/(^|\.)neon\.tech$/.test(new URL(connectionString).hostname);
    const listen=pool=>{pool.on('error',()=>console.error('PostgreSQL connection interrupted; subsequent requests will reconnect.'));return pool};
    const websocket=()=>{const {Pool:WebSocketPool,neonConfig}=require('@neondatabase/serverless');neonConfig.webSocketConstructor=globalThis.WebSocket;return listen(new WebSocketPool(options))};
    const pool=recoverablePool(listen(new Pool(options)),isNeon?websocket:null);
    try{return await createStorage(pool)}catch(error){await pool.end();if(!isNeon||!networkFailure(error))throw error;console.warn('PostgreSQL TCP unavailable; initializing the same database over secure WebSocket.');const fallback=websocket();try{return await createStorage(fallback)}catch(e){await fallback.end();throw e}}
}
module.exports={createStorage,connectStorage,COLLECTIONS,recoverablePool};
