export const ARC = Object.freeze({ chainId:5042, chainHex:'0x13b2', usdc:'0x3600000000000000000000000000000000000000', explorer:'https://explorer.arc.io', rpc:'https://rpc.mainnet.arc.io' });
export const ARC_TESTNET = Object.freeze({...ARC, chainId:5042002, chainHex:'0x4cef52', explorer:'https://explorer.testnet.arc.io', rpc:'https://rpc.testnet.arc.io'});
export const networkFor = c => c.networkName === 'arc-testnet' ? ARC_TESTNET : ARC;
export function loadConfig(e=process.env) {
  const networkName=e.ARC_NETWORK || 'arc-mainnet';
  return {networkName,ready:networkName==='arc-testnet' ? e.CHECKOUT_ENABLED==='true' : e.MAINNET_READY==='true',origin:e.PUBLIC_ORIGIN||'http://localhost:3080',apiOrigin:e.CHAMELEON_API_ORIGIN,button:e.CHAMELEON_BUTTON_ID,recipient:e.DEMO_RECIPIENT,amount:Number(e.DEMO_AMOUNT_MICRO_USDC||1000000),webhookSecret:e.WEBHOOK_SECRET};
}
export const ID = /^[a-zA-Z0-9_-]{1,128}$/;
export const HASH = /^0x[0-9a-fA-F]{64}$/;
export function validateNetwork(n, expected=ARC) {
  if (n?.chain_id !== expected.chainId || n.asset?.address?.toLowerCase() !== ARC.usdc || n.asset?.decimals !== 6 || n.asset?.native_decimals !== 18) throw new Error('Arc network configuration mismatch');
}
export function validateIntent(i, c) {
  validateNetwork(i.checkout?.network, networkFor(c));
  if (!ID.test(i.id) || i.chain_id !== networkFor(c).chainId || i.asset !== 'USDC' || i.amount !== c.amount || i.pay_to_address?.toLowerCase() !== c.recipient.toLowerCase()) throw new Error('Payment configuration mismatch');
  if (!['pending','submitted','confirmed','underpaid','failed','expired'].includes(i.status)) throw new Error('Unknown payment status');
  return i;
}
export function createClient(c, fetcher = fetch) {
  return async function api(path, {method='GET', body, key} = {}) {
    const r = await fetcher(new URL(`/api/v1/${path}`, c.apiOrigin), {method, redirect:'error', signal:AbortSignal.timeout(12000), headers:{'Content-Type':'application/json',Origin:c.origin,...(key ? {'Idempotency-Key':key} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
    if (!r.ok) throw new Error(`Chameleon request failed (${r.status})`);
    return r.json();
  };
}

export function configurationIssues(c) {
  const issues = [];
  if(c.networkName && !['arc-mainnet','arc-testnet'].includes(c.networkName)) issues.push('ARC_NETWORK must be arc-mainnet or arc-testnet.');
  if (!c.ready) issues.push(c.networkName==='arc-testnet' ? 'CHECKOUT_ENABLED must be true to test the checkout.' : 'MAINNET_READY is false. Enable it only after completing the mainnet preflight.');
  if (!c.apiOrigin) issues.push('CHAMELEON_API_ORIGIN is missing.');
  if (!ID.test(c.button || '')) issues.push('CHAMELEON_BUTTON_ID must be a valid public checkout ID.');
  if (!/^0x[0-9a-fA-F]{40}$/.test(c.recipient || '')) issues.push('DEMO_RECIPIENT must be a valid receiving address.');
  const max=c.networkName==='arc-testnet' ? 5000000 : 1000000;
  if (!Number.isSafeInteger(c.amount) || c.amount <= 0 || c.amount > max) issues.push(`DEMO_AMOUNT_MICRO_USDC must be between 1 and ${max}. The dedicated checkout must use the same amount.`);
  return issues;
}
