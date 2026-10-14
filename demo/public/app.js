const $=id=>document.getElementById(id), providers=[];
let network, storagePrefix='', intent, busy=false, timer, key, savedHash, uncertain=false;
const remember=(name,value)=>{try{value?sessionStorage.setItem(storagePrefix+name,value):sessionStorage.removeItem(storagePrefix+name);}catch{}};
function wallets(){
  if(!providers.length){$('wallet').replaceChildren(new Option('Install a browser wallet',''));return;}
  const selected=$('wallet').value;
  $('wallet').replaceChildren(...providers.map((p,i)=>new Option(p.name,String(i))));
  if(selected)$('wallet').value=selected;
}
window.addEventListener('eip6963:announceProvider',e=>{if(e.detail?.provider && !providers.some(p=>p.provider===e.detail.provider)){providers.push({name:e.detail.info?.name||'Browser wallet',provider:e.detail.provider});wallets();}});
window.dispatchEvent(new Event('eip6963:requestProvider'));
setTimeout(()=>{if(!providers.length && (window.avalanche||window.ethereum))providers.push({name:'Browser wallet',provider:window.avalanche||window.ethereum});wallets();},300);
async function api(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data;}
function render(){
  if(uncertain)$('message').textContent='Wallet outcome uncertain. Check wallet history and contact the merchant before another payment.';
  $('details').hidden=false;$('reference').textContent=intent.id;$('recipient').textContent=intent.pay_to_address;$('expires').textContent=new Date(intent.expires_at).toLocaleString();$('status').textContent=intent.status;
  $('webhook').textContent=intent.webhook?`${intent.webhook.type} · signature verified · ${new Date(intent.webhook.received).toLocaleString()}`:'Not received by this demo';
  $('create').hidden=true;$('refresh').hidden=false;
  $('pay').hidden=intent.status!=='pending'||Boolean(savedHash)||uncertain||Date.parse(intent.expires_at)<=Date.now();
  $('retry').hidden=!['failed','expired','confirmed'].includes(intent.status);
  const hash=intent.tx_hash||savedHash;
  if(/^0x[\da-fA-F]{64}$/.test(hash||'')){$('transaction').href=`${network.explorer}/tx/${hash}`;$('transaction').hidden=false;}
  clearTimeout(timer);
  if(['pending','submitted'].includes(intent.status)||(!intent.webhook&&['confirmed','underpaid','failed'].includes(intent.status)))timer=setTimeout(()=>run(refresh),10000);
}
async function refresh(){
  if(!intent)return;
  if(savedHash)await api(`/api/intents/${intent.id}/transaction`,{tx_hash:savedHash});
  intent=await api(`/api/intents/${intent.id}`);render();
}
async function run(action){if(busy)return;busy=true;$('message').textContent='';for(const id of ['create','pay','refresh','retry'])$(id).disabled=true;try{await action();}catch(e){$('message').textContent=e.message||'Wallet request failed. Preserve your reference and refresh status.';}finally{busy=false;for(const id of ['create','pay','refresh','retry'])$(id).disabled=false;}}
$('create').onclick=()=>run(async()=>{key ||= crypto.randomUUID();remember('arc-key',key);intent=await api('/api/intents',{});remember('arc-intent',intent.id);render();});
$('refresh').onclick=()=>run(refresh);
$('retry').onclick=()=>{for(const name of ['arc-key','arc-intent','arc-hash','arc-uncertain'])remember(name,null);location.reload();};
$('pay').onclick=()=>run(async()=>{
  await refresh();
  if(intent.status!=='pending'||savedHash||uncertain||Date.parse(intent.expires_at)<=Date.now())throw Error('This payment cannot be sent again. Refresh status.');
  const provider=providers[Number($('wallet').value)]?.provider;
  if(!provider)throw Error('Install and select an EIP-1193 browser wallet.');
  const accounts=await provider.request({method:'eth_requestAccounts'});
  try{await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:network.chainHex}]});}catch(e){if(e.code!==4902)throw e;await provider.request({method:'wallet_addEthereumChain',params:[{chainId:network.chainHex,chainName:network.chainId===5042002?'Arc Testnet':'Arc',nativeCurrency:{name:'USDC',symbol:'USDC',decimals:18},rpcUrls:[network.rpc],blockExplorerUrls:[network.explorer]}]});}
  if(BigInt(await provider.request({method:'eth_chainId'}))!==BigInt(network.chainId))throw Error('Switch your wallet to the selected Arc network.');
  if(Date.parse(intent.expires_at)<=Date.now())throw Error('Payment expired. Start a new attempt.');
  const t=intent.transaction;
  if(!t||!/^0x[\da-fA-F]{40}$/.test(t.to)||!/^0x[\da-fA-F]*$/.test(t.data)||!/^0x[\da-fA-F]+$/.test(t.value))throw Error('No valid transaction is available.');
  uncertain=true;remember('arc-uncertain','true');
  try{savedHash=await provider.request({method:'eth_sendTransaction',params:[{from:accounts[0],to:t.to,data:t.data,value:t.value}]});uncertain=false;remember('arc-uncertain',null);}catch(e){if(e.code===4001){uncertain=false;remember('arc-uncertain',null);}else{render();throw Error('Wallet outcome uncertain. Check wallet history and contact the merchant with your payment reference before trying another payment.');}throw e;}
  remember('arc-hash',savedHash);render();await refresh();
});
(async()=>{try{const c=await api('/api/config');$('amount').textContent=(c.amount/1e6).toFixed(2);network=c.network;storagePrefix=`${network.chainId}:`;
try{key=sessionStorage.getItem(storagePrefix+'arc-key');savedHash=sessionStorage.getItem(storagePrefix+'arc-hash');uncertain=sessionStorage.getItem(storagePrefix+'arc-uncertain')==='true';}catch{}
const testnet=c.networkName==='arc-testnet';
const label=testnet?'Arc Testnet':'Arc Mainnet';
document.title=`goChameleon · ${label} checkout`;
$('network-label').textContent=label;
$('network-fees').textContent=`${label} · network gas is additional`;
$('funds-notice').textContent=testnet?'Testnet only. Use test USDC for the payment and gas. This is not a real-money payment or mainnet evidence.':'Real funds are transferred when you approve in your wallet. Keep additional USDC available for gas.';
$('network-description').textContent=testnet?'Try the checkout with test USDC on Arc Testnet. Follow wallet approval, payment verification and merchant confirmation.':'Follow your USDC on Arc Mainnet from wallet approval to payment verification and merchant confirmation.';
$('availability').textContent=c.configured?`${label} · ${testnet?'test funds only':'real payment'}`:'Setup required · no live checkout configured';$('create').disabled=!c.configured;
if(!c.configured && c.issues?.length)$('message').textContent=c.issues.join(' ');
let id;try{id=sessionStorage.getItem(storagePrefix+'arc-intent');}catch{}
if(c.configured&&id&&/^[a-zA-Z0-9_-]{1,128}$/.test(id)){intent={id};await run(refresh);}
}catch(e){$('availability').textContent=e.message;}})();
