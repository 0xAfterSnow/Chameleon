// Run against the local demo proxy, not a privileged merchant endpoint.
const origin=process.env.PUBLIC_ORIGIN || 'http://localhost:3080';
const response=await fetch(`${origin}/api/intents`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':process.env.DEMO_IDEMPOTENCY_KEY || crypto.randomUUID()},body:'{}'});
if(!response.ok)throw new Error(`Creation failed: ${response.status}`);
console.log(await response.json());
