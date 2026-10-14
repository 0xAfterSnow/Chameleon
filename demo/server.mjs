import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { ARC, ID, HASH, validateNetwork, validateIntent, createClient, configurationIssues, networkFor, loadConfig } from './lib/api.mjs';
import { verifyWebhook } from './lib/webhook.mjs';
import { acceptsOrigin } from './lib/origin.mjs';
export function createDemo(c, {fetcher=fetch, database=':memory:'} = {}) {
  const db = new DatabaseSync(database);
  db.exec('CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, intent TEXT, type TEXT, received TEXT)');
  const api = createClient(c, fetcher), limits = new Map();
  let windowStart = Date.now(), requests = 0;
  const network=networkFor(c);
  const issues = configurationIssues(c);
  const configured = issues.length === 0;
  const assets = new Map(['index.html','app.js','style.css','assets/logo.svg','assets/emerald-wave.png','assets/mona-sans.woff2','assets/ibm-plex-mono.woff2'].map(n => [n,readFileSync(new URL(`./public/${n}`,import.meta.url))]));
  async function body(req) {
    const chunks=[]; let size=0;
    for await (const chunk of req) { size+=chunk.length; if(size>16384) throw Object.assign(new Error('Request too large'),{status:413}); chunks.push(chunk); }
    return Buffer.concat(chunks);
  }
  const server=createServer(async(req,res)=>{
    const send=(status,value,type='application/json')=>{
      res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
      res.end(type==='application/json'?JSON.stringify(value):value);
    };
    try {
      const path=new URL(req.url,c.origin).pathname;
      if(req.method==='GET' && path==='/healthz') return send(200,{status:'ok'});
      if(Date.now()-windowStart>60000){limits.clear();requests=0;windowStart=Date.now();}
      const ip=req.socket.remoteAddress,count=(limits.get(ip)||0)+1;
      if(++requests>600 || count>90) return send(429,{error:'Rate limit reached; retry in one minute.'});
      limits.set(ip,count);
      if(req.method==='POST' && path==='/api/webhook'){
        const raw=await body(req);
        if(!verifyWebhook(raw,req.headers['gochameleon-signature'],c.webhookSecret)) return send(401,{error:'Invalid signature'});
        const e=JSON.parse(raw);
        if(!ID.test(e.id||'') || !ID.test(e.data?.intent_id||'') || !['payment.confirmed','payment.underpaid','payment.failed'].includes(e.type) || e.data.chain_id!==network.chainId) return send(400,{error:'Unsupported event'});
        db.prepare('INSERT OR IGNORE INTO receipts VALUES (?, ?, ?, ?)').run(e.id,e.data.intent_id,e.type,new Date().toISOString());
        return send(200,{received:true});
      }
      if(req.method==='GET' && (path==='/' || assets.has(path.slice(1)))){
        const n=path==='/'?'index.html':path.slice(1);
        return send(200,assets.get(n),n.endsWith('.js')?'text/javascript':n.endsWith('.css')?'text/css':n.endsWith('.svg')?'image/svg+xml':n.endsWith('.png')?'image/png':n.endsWith('.woff2')?'font/woff2':'text/html');
      }
      if(req.method==='GET' && path==='/api/config') return send(200,{configured,issues,amount:c.amount,recipient:c.recipient||null,chainId:network.chainId,networkName:c.networkName||'arc-mainnet',network});
      if(!configured) return send(503,{error:'Checkout is not configured. Check /api/config or run npm run doctor.'});
      if(req.method==='POST' && !acceptsOrigin(req.headers.origin,c.origin)) return send(403,{error:'Origin rejected. Open the demo at its configured PUBLIC_ORIGIN URL (local loopback aliases on the same port are supported). Restart the server after changing PUBLIC_ORIGIN.'});
      if(req.method==='POST' && path==='/api/intents'){
        const key=req.headers['idempotency-key'];
        if(!/^[a-zA-Z0-9_-]{16,128}$/.test(key||'')) return send(400,{error:'Idempotency-Key required'});
        const input=JSON.parse((await body(req)).toString()||'{}');
        if(Object.keys(input).length) return send(400,{error:'Only the fixed demo amount is accepted'});
        const b=await api(`checkout/buttons/${c.button}/`); validateNetwork(b.network,network);
        if(b.button?.amount!==c.amount || b.button?.asset!=='USDC') throw new Error('Checkout amount mismatch');
        return send(201,validateIntent(await api(`checkout/buttons/${c.button}/payment-intents/`,{method:'POST',body:{},key}),c));
      }
      const route=/^\/api\/intents\/([a-zA-Z0-9_-]{1,128})(\/transaction)?$/.exec(path);
      if(route){
        const [,id,transaction]=route;
        const current=validateIntent(await api(`payments/intents/${id}/`),c);
        if(!transaction && req.method==='GET'){
          const receipt=db.prepare('SELECT type, received FROM receipts WHERE intent = ? ORDER BY received DESC LIMIT 1').get(id)||null;
          return send(200,{...current,webhook:receipt});
        }
        if(transaction && req.method==='POST'){
          const input=JSON.parse((await body(req)).toString());
          if(!HASH.test(input.tx_hash||'')) return send(400,{error:'Invalid transaction hash'});
          return send(200,validateIntent(await api(`payments/intents/${id}/transaction/`,{method:'POST',body:{tx_hash:input.tx_hash}}),c));
        }
      }
      send(404,{error:'Not found'});
    }catch(e){send(e.status||502,{error:e.status?e.message:'Payment service unavailable or configuration mismatch. Preserve your reference; retry status before paying again.'});}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  server.on('close',()=>db.close());return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const e=process.env,c=loadConfig(e);
  for(const value of [c.origin,c.apiOrigin].filter(Boolean)){
    const u=new URL(value);
    if((u.protocol!=='https:' && !(u.protocol==='http:' && ['localhost','127.0.0.1'].includes(u.hostname))) || u.username || u.password || u.pathname!=='/' || u.search || u.hash) throw new Error('Use an HTTPS origin (localhost HTTP permitted)');
  }
  mkdirSync(new URL('../data/',import.meta.url),{recursive:true,mode:0o700});
  createDemo(c,{database:fileURLToPath(new URL('../data/receipts.sqlite',import.meta.url))}).listen(Number(e.PORT||3080),e.HOST||'127.0.0.1',()=>console.log('Chameleon demo listening'));
}
