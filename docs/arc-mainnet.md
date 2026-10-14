# Arc mainnet preflight

Official documentation reviewed October 11, 2026:

- [Network](https://docs.arc.io/arc/references/connect-to-arc): chain ID 5042 (`0x13b2`), RPC `https://rpc.mainnet.arc.io`, explorer `https://explorer.arc.io`.
- [Contracts](https://docs.arc.io/arc/references/contract-addresses): USDC interface `0x3600000000000000000000000000000000000000`, six ERC-20 decimals; native USDC gas accounting uses eighteen decimals.

The demo fixes these public network values. It does not read local production environment files or execute transfers during preparation.

Before setting MAINNET_READY=true:

1. Provision an isolated demo merchant, receiving wallet and checkout of at most 1 USDC. Fund the reviewer's wallet separately, including gas, only with explicit transfer authorization.
2. Configure the private gateway for `ARC_NETWORK=arc-mainnet`, verified RPC and official USDC configuration, with memo payments enabled. Set and review its confirmation policy explicitly. Check Memo contract deployment and ABI against official documentation and live code.
3. Query `eth_chainId` on the **gateway's actual RPC URL**, expecting `0x13b2`. Verify USDC code, symbol and decimals, and Memo bytecode. Do not substitute a check against a different public endpoint.
4. Resolve the audit finding: the inspected gateway verification path does not call `eth_chainId` to enforce RPC identity. Require a fail-closed gateway RPC identity check or a deployment health gate that prevents serving checkout when the configured RPC is not mainnet. The demo's API field checks alone cannot establish this fact.
5. Verify the gateway independently checks receipt success, recipient, token, amount, memo-to-intent binding, confirmation policy, and transaction uniqueness. Validate these with the deployed configuration.
6. Confirm expiry/recovery workers, webhook delivery/retries and PostgreSQL locking are operational. Local source and fixture tests are not deployment proof.
7. Authorize and perform a low-value end-to-end payment manually. Collect the actual intent, explorer transaction URL, verified status and signed webhook receipt. Include failure/expiry handling in the walkthrough.

Mainnet operation remains unverified until these steps succeed. No real payment has been executed as part of this work. Do not label test fixtures, an enabled flag, a rendered frontend, or a user-submitted transaction hash as mainnet evidence.
