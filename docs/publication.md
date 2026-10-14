# Publication checklist

- [ ] Approve the MIT recommendation and copyright holder; add LICENSE to this demo only.
- [ ] Complete mainnet preflight, especially actual gateway RPC identity enforcement.
- [ ] Configure a dedicated demo merchant, fixed checkout, receiving wallet and webhook.
- [ ] Deploy with HTTPS, persistent receipts, gateway workers and edge rate limits.
- [ ] Supply the real live URL and public builder profile.
- [ ] Run one explicitly authorized real payment; record actual transaction and webhook evidence.
- [ ] Test wallet rejection, refresh after broadcast, expiry, underpayment and upstream outage in the deployed environment.
- [ ] Run tests/build on a fresh copy and review every file for secrets.
- [x] Move the demo to a separate repository (owner-reported).
- [x] Enable mainnet configuration (owner-reported).
- [ ] Verify the new repository excludes `.env`, `data`, caches and private source/history.
- [ ] Review the separate repository's Git history and staged changes before publication.
- [ ] Inspect the new repository history and run a secret scanner before changing visibility.

The owner reports the demo has moved to another repository and mainnet configuration is enabled. The public repository URL, live deployment URL and completed mainnet payment evidence have not yet been provided for this documentation update. Verify publication and operation using those actual resources.

## Submission description

Chameleon is a developer-first USDC payment gateway powered by Arc. Its public integration demonstrates fixed-price checkout, wallet-authorized USDC payments, backend-verified payment status, explorer references, and signed merchant webhooks. The public client integrates through documented buyer APIs while commercial verification and operational infrastructure remain proprietary.

Documentation status: mainnet configuration enabled per the owner; reviewer links and completed-payment evidence still need to be added to the README.
