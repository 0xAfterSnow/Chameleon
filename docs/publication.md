# Publication checklist

- [ ] Approve the MIT recommendation and copyright holder; add LICENSE to this demo only.
- [ ] Complete mainnet preflight, especially actual gateway RPC identity enforcement.
- [ ] Configure a dedicated demo merchant, fixed checkout, receiving wallet and webhook.
- [ ] Deploy with HTTPS, persistent receipts, gateway workers and edge rate limits.
- [ ] Supply the real live URL and public builder profile.
- [ ] Run one explicitly authorized real payment; record actual transaction and webhook evidence.
- [ ] Test wallet rejection, refresh after broadcast, expiry, underpayment and upstream outage in the deployed environment.
- [ ] Run tests/build on a fresh copy and review every file for secrets.
- [ ] Copy only this directory's source/docs and dotfiles into the new repository. Exclude `.env`, `data`, caches and any `.git` directory.
- [ ] Initialize fresh Git history manually; review `git status` and staged diff before committing/pushing.
- [ ] Inspect the new repository history and run a secret scanner before changing visibility.

Nothing has been pushed or deployed. This folder has no Git repository of its own and inherits no copied history. The parent ignores the entire directory; force-adding it would override that protection.

## Submission description

Chameleon is a developer-first USDC payment gateway powered by Arc. Its public integration demonstrates fixed-price checkout, wallet-authorized USDC payments, backend-verified payment status, explorer references, and signed merchant webhooks. The public client integrates through documented buyer APIs while commercial verification and operational infrastructure remain proprietary.

Current submission status: implementation prepared; live deployment and mainnet transaction evidence pending. Replace this status only after collecting verifiable evidence.
