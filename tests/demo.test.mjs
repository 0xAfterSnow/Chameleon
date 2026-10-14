import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createDemo } from '../demo/server.mjs';
import { ARC, validateIntent } from '../demo/lib/api.mjs';
import { verifyWebhook } from '../demo/lib/webhook.mjs';
const c={origin:'http://localhost:3080',apiOrigin:'https://api.example.invalid',button:'btn_demo',recipient:`0x${'1'.repeat(40)}`,amount:1000000,ready:true,webhookSecret:'fixture-only-secret'};
const network={chain_id:5042,asset:{address:ARC.usdc,decimals:6,native_decimals:18}};
const intent={id:'pi_fixture',checkout:{network},chain_id:5042,asset:'USDC',amount:1000000,pay_to_address:c.recipient,status:'pending',expires_at:'2099-01-01T00:00:00Z'};
const sign=(raw,t=Math.floor(Date.now()/1000))=>`t=${t},v1=${createHmac('sha256',c.webhookSecret).update(`${t}.`).update(raw).digest('hex')}`;
async function server(t,config=c,fetcher=async()=>Response.json(intent)){
  const s=createDemo(config,{fetcher});await new Promise(r=>s.listen(0,'127.0.0.1',r));
  t.after(()=>new Promise(r=>s.close(r)));return `http://127.0.0.1:${s.address().port}`;
}
test('signature requires exact bytes, fresh timestamp and matching secret',()=>{
 const raw=Buffer.from('{"x":1}');const h=sign(raw);
 assert.equal(verifyWebhook(raw,h,c.webhookSecret),true);
 assert.equal(verifyWebhook(Buffer.from('{"x":2}'),h,c.webhookSecret),false);
 assert.equal(verifyWebhook(raw,sign(raw,1),c.webhookSecret),false);
 assert.equal(verifyWebhook(raw,h,'wrong'),false);
 assert.equal(verifyWebhook(raw,'t=1,v1=xx',c.webhookSecret),false);
});
test('reject wrong network, token, recipient, amount and status',()=>{
 for(const i of [{...intent,chain_id:5042002},{...intent,amount:2000000},{...intent,pay_to_address:`0x${'2'.repeat(40)}`},{...intent,status:'success'},{...intent,checkout:{network:{...network,asset:{...network.asset,address:c.recipient}}}}])assert.throws(()=>validateIntent(i,c));
});
test('unconfigured app serves UI and health but cannot create payments',async t=>{
 const url=await server(t,{...c,ready:false});
 assert.equal((await fetch(url)).status,200);assert.equal((await fetch(`${url}/healthz`)).status,200);
 assert.equal((await fetch(`${url}/api/intents`,{method:'POST'})).status,503);
 assert.equal((await fetch(`${url}/.env`)).status,503);
});
test('creation uses fixed public endpoint and preserves idempotency',async t=>{
 const calls=[];const url=await server(t,c,async(url,opts)=>{calls.push([String(url),opts]);return Response.json(calls.length===1?{network,button:{amount:c.amount,asset:'USDC'}}:intent);});
 const r=await fetch(`${url}/api/intents`,{method:'POST',headers:{Origin:c.origin,'Idempotency-Key':'fixture-idempotency-123'},body:'{}'});
 assert.equal(r.status,201);assert.equal((await r.json()).status,'pending');
 assert.equal(calls[1][0],'https://api.example.invalid/api/v1/checkout/buttons/btn_demo/payment-intents/');
 assert.equal(calls[1][1].headers['Idempotency-Key'],'fixture-idempotency-123');
 assert.equal(calls[1][1].headers.Authorization,undefined);
});
test('origin and client amount injection are rejected before upstream calls',async t=>{
 const url=await server(t,c,()=>{throw Error('Must not call upstream');});
 assert.equal((await fetch(`${url}/api/intents`,{method:'POST',headers:{Origin:'https://evil.invalid'}})).status,403);
 assert.equal((await fetch(`${url}/api/intents`,{method:'POST',headers:{Origin:c.origin,'Idempotency-Key':'fixture-idempotency-123'},body:'{"amount":1}'})).status,400);
});
test('a submitted hash alone does not become confirmed',async t=>{
 const url=await server(t,c,async()=>Response.json({...intent,status:'submitted'}));
 const r=await fetch(`${url}/api/intents/pi_fixture/transaction`,{method:'POST',headers:{Origin:c.origin},body:JSON.stringify({tx_hash:`0x${'a'.repeat(64)}`})});
 assert.equal(r.status,200);assert.equal((await r.json()).status,'submitted');
});
test('webhook signature rejection, durable deduplication and receipt display',async t=>{
 const url=await server(t);const raw=JSON.stringify({id:'evt_fixture',type:'payment.confirmed',data:{intent_id:intent.id,chain_id:5042}});
 assert.equal((await fetch(`${url}/api/webhook`,{method:'POST',body:raw})).status,401);
 for(let i=0;i<2;i++)assert.equal((await fetch(`${url}/api/webhook`,{method:'POST',headers:{'GoChameleon-Signature':sign(raw)},body:raw})).status,200);
 const data=await (await fetch(`${url}/api/intents/${intent.id}`)).json();
 assert.equal(data.webhook.type,'payment.confirmed');assert.equal(data.status,'pending');
});
test('limits bound request volume',async t=>{const url=await server(t);let r;for(let i=0;i<91;i++)r=await fetch(`${url}/api/config`);assert.equal(r.status,429);});

test('configuration response explains disabled readiness and excessive amount without secrets',async t=>{
 const url=await server(t,{...c,ready:false,amount:2000000});
 const r=await (await fetch(`${url}/api/config`)).json();
 assert.equal(r.configured,false);
 assert.ok(r.issues.some(x=>x.includes('MAINNET_READY')));
 assert.ok(r.issues.some(x=>x.includes('DEMO_AMOUNT_MICRO_USDC')));
 assert.equal(JSON.stringify(r).includes(c.webhookSecret),false);
});

test('testnet is explicit, allows 2 test USDC and rejects mainnet responses',async t=>{
 const config={...c,networkName:'arc-testnet',amount:2000000};
 const testIntent={...intent,amount:2000000,chain_id:5042002,checkout:{network:{...network,chain_id:5042002}}};
 assert.equal(validateIntent(testIntent,config).chain_id,5042002);
 assert.throws(()=>validateIntent({...intent,amount:2000000},config));
 assert.throws(()=>validateIntent(testIntent,{...c,amount:2000000}));
 const url=await server(t,config);const result=await (await fetch(`${url}/api/config`)).json();
 assert.equal(result.configured,true);assert.equal(result.networkName,'arc-testnet');assert.equal(result.network.chainId,5042002);
 assert.equal(result.network.explorer,'https://explorer.testnet.arc.io');
});

test('origin checks accept equivalent local URLs but reject other sites and ports',async()=>{
 const {acceptsOrigin}=await import('../demo/lib/origin.mjs');
 for(const origin of ['http://localhost:3080','http://127.0.0.1:3080','http://[::1]:3080']) assert.equal(acceptsOrigin(origin,c.origin),true);
 assert.equal(acceptsOrigin('http://localhost:3080','http://localhost:3080/'),true);
 for(const origin of [undefined,'null','http://localhost:3081','https://localhost:3080','https://evil.invalid','http://localhost.evil.invalid:3080','http://localhost:3080@evil.invalid','http://localhost:3080/path']) assert.equal(acceptsOrigin(origin,c.origin),false);
 assert.equal(acceptsOrigin('http://127.0.0.1:3080','https://demo.example.com'),false);
 assert.equal(acceptsOrigin('https://demo.example.com','https://demo.example.com'),true);
 assert.equal(acceptsOrigin('https://other.example.com','https://demo.example.com'),false);
});

test('loopback browser alias can create an intent while upstream gets configured origin',async t=>{
 const calls=[];
 const url=await server(t,c,async(url,opts)=>{calls.push(opts);return Response.json(calls.length===1?{network,button:{amount:c.amount,asset:'USDC'}}:intent);});
 const r=await fetch(`${url}/api/intents`,{method:'POST',headers:{Origin:'http://127.0.0.1:3080','Idempotency-Key':'origin-alias-fixture-123'},body:'{}'});
 assert.equal(r.status,201);
 assert.ok(calls.every(call=>call.headers.Origin===c.origin));
});
