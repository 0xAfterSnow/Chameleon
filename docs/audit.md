# Implementation audit and security review

Source review date: October 11, 2026. Documentation status updated October 14, 2026: the owner reports mainnet configuration is enabled. Findings below describe the inspected source and historical local checks; they are not a new audit of the separate deployed repository. Configuration changes alone do not resolve source findings.

## Existing integration findings

Inspected the existing checkout routes, serializers and creation services; public payment views; Arc network/transaction adapter; settlement verification; event generation; webhook signing/delivery; settings and widget-facing payloads.

- Fixed-price public checkout creation is implemented with idempotency support. No general merchant-authenticated intent creation contract was assumed.
- Intent status, pending wallet payloads and hash submission are implemented. Public contracts omit merchant reference/metadata.
- Receipt verification checks receipt success, recipient and token transfer observations; settlement checks amount, memo binding, transaction uniqueness and configured confirmations.
- Signed webhook payloads and delivery are implemented, with timestamped HMAC over raw bytes. The demo uses the exact published header name and payload envelope.
- Checkout includes USDC ERC-20 and native decimal context. Default gateway network is testnet; mainnet is selectable deployment-wide.
- Configured confirmation count defaults to zero. Mainnet rollout needs an explicit finality policy.
- **Blocking finding:** the inspected adapter does not enforce RPC chain identity with `eth_chainId`. Serialized chain IDs reflect configuration; they are not proof of the RPC's actual network. Resolve at the gateway/deployment boundary before enabling public mainnet traffic.
- PostgreSQL row locking, gateway workers, RPC access, operational webhook delivery and real mainnet payment evidence were not established by inspecting source.

Safe public scope: buyer API requests, documented response shapes, wallet integration and merchant-side webhook signature verification. No private algorithms, production frontend/widget bundles, source maps, internal administrative endpoints, database contents, MPC/signing services or existing Git history were copied.

## New implementation and limitations

The demo is independently authored vanilla browser JavaScript plus a Node server with no third-party packages. The server caps payment amounts at 1 USDC on mainnet and 5 test USDC on testnet and fixes the button and receiving wallet through operator configuration. Mainnet mismatches fail closed. Browser signing uses only the trusted API's transaction payload; this does not replace backend verification.

SQLite persists minimal signed-webhook receipt facts and deduplicates event IDs. It is not a copy of the production schema. Receipt display is separate from the payment verdict. Keep the secret dedicated to this endpoint; protect and persist local data. A real money-moving merchant application needs business-event validation and durable fulfillment transactions beyond this display-only receiver.

Rate limits are single-process; configure edge limits and a global creation budget. The proxy cannot prevent direct abuse of the existing public gateway endpoints; gateway protections must remain enabled. The receiver uses raw bytes and five-minute signature freshness; host clock synchronization is required.

Wallet uncertainty is retained to block another automatic signing attempt after ambiguous send errors. Cleared/unavailable browser storage still limits refresh recovery. Real-wallet behavior, mobile wallets, accessibility across assistive technologies and full deployed expiry/recovery remain unverified.

## Validation record

- Twelve Node tests passed in the last local test run (including testnet isolation, configuration diagnostics and loopback-origin compatibility): signatures, wrong configuration, disabled checkout, public contract/idempotency, origin/amount restrictions, submitted status, webhook receipt/deduplication, rate limits.
- Syntax/build checks passed. This buildless client requires no bundler.
- Test upstream responses are explicitly fixtures in tests; they are not live payment evidence.
- Third-party dependency vulnerability audit: no third-party package dependencies to audit. The Node runtime and container base image still require normal patching and deployment image scanning; no current advisory database scan is claimed.
- Targeted credential/source review covers the standalone source and docs. Test-only secret strings are synthetic. `.env.example` contains placeholders; no production environment files were read or copied.
- During preparation, the parent Git ignore was verified and no Git history was copied. The owner has since moved the project to another repository; its current history and visibility have not been inspected here.
- Desktop (1440px) and mobile (390px) setup-state pages were rendered in headless Chrome and visually inspected. No real wallet interaction was exercised.
- Docker image build and live-mainnet checks were not performed.
