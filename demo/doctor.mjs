import { configurationIssues, validateNetwork, loadConfig, networkFor } from './lib/api.mjs';
const e=process.env, c=loadConfig(e);
const issues=configurationIssues(c);
if(!e.WEBHOOK_SECRET) issues.push('WEBHOOK_SECRET is missing; signed webhook receipt cannot be demonstrated.');
try {
  const origin=new URL(c.origin), api=new URL(c.apiOrigin);
  for(const u of [origin,api]){
    if((u.protocol!=='https:' && !(u.protocol==='http:' && ['localhost','127.0.0.1'].includes(u.hostname))) || u.username || u.password || u.pathname!=='/' || u.search || u.hash) throw Error('Use HTTPS origins without paths or credentials (localhost HTTP is permitted).');
  }
  const response=await fetch(new URL(`/api/v1/checkout/buttons/${encodeURIComponent(c.button)}/`,api),{headers:{Origin:origin.origin},redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok) issues.push(`The public checkout endpoint returned HTTP ${response.status}. Check the API origin and button ID.`);
  else {
    const b=await response.json();
    console.log('Public checkout endpoint: reachable');
    try{validateNetwork(b.network,networkFor(c));}catch{issues.push(`The checkout does not match ${c.networkName} (expected chain ${networkFor(c).chainId}). Set ARC_NETWORK to match the backend; readiness flags do not change its network.`);}
    if(b.button?.amount!==c.amount) issues.push('The checkout price does not match DEMO_AMOUNT_MICRO_USDC.');
    if(b.button?.is_active===false) issues.push('The checkout button is inactive.');
    if(b.button?.asset!=='USDC') issues.push('The checkout asset must be USDC.');
  }
}catch{issues.push('Could not read the public checkout. Check API origin format, backend availability and network access.');}
if(issues.length){console.log('\nSetup issues:\n'+issues.map(x=>`- ${x}`).join('\n'));process.exitCode=1;}
else console.log('Local settings and public checkout checks passed. This does not verify the recipient, RPC identity, allowed origins, webhook delivery or a real payment. Complete the relevant deployment checks before accepting payments.');
console.log('\nAfter editing .env, restart npm start. Open the exact PUBLIC_ORIGIN URL. No payment was created or sent.');
