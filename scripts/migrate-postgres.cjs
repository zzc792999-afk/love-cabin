const {connectStorage}=require('../cabin-storage.cjs');
(async()=>{
    if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
    process.stdin.setEncoding('utf8');
    let input='';for await(const chunk of process.stdin)input+=chunk;
    const snapshot=JSON.parse(input);
    const storage=await connectStorage(process.env.DATABASE_URL);
    try{console.log(JSON.stringify(await storage.importSnapshot(snapshot)))}finally{await storage.close()}
})().catch(error=>{console.error('Migration failed:',error.code||error.name,String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted]').slice(0,160));process.exitCode=1});
