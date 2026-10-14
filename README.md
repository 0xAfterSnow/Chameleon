# Chameleon

**A developer-first USDC payment gateway powered by Arc.**

Chameleon connects wallet transfers to merchant orders. A customer opens a checkout, approves a USDC payment in their wallet, and follows its verification status. The merchant receives a signed webhook when the gateway reports the payment outcome.

This repository contains the public checkout integration and webhook receiver. Chameleon's core payment verification and operational infrastructure remain proprietary.

## Demo and mainnet evidence

The project owner reports that the backend and demo are configured for **Arc mainnet**, with `MAINNET_READY=true`. Mainnet payments use real USDC, including gas.

| Reviewer resource | Status |
| --- | --- |
| Live checkout URL | Deployment URL to be added |
| Public repository URL | Project moved to a separate repository; URL to be added |
| Mainnet transaction | Verified explorer transaction link to be added |
| Merchant confirmation | Corresponding signed webhook receipt to be added |
| Builder profile | Public GitHub, X, or Farcaster link to be added |

Configuration readiness and completed payment evidence are separate. The links above have not yet been supplied for this documentation update.

## Try the checkout

1. Open the live checkout and confirm that it displays **Arc Mainnet**.
2. Create a payment intent. Review its amount, receiving address, reference and expiry.
3. Select a browser wallet and choose **Review in wallet & pay**. Keep enough mainnet USDC for the displayed payment and gas.
4. Approve the transaction in your wallet. The page follows the gateway's payment status; submitting a hash does not confirm payment.
5. Open the Arc explorer link and check the transaction. The merchant webhook receipt appears separately once this demo receives and verifies it.

No reviewer account is required. Supported browser wallets use EIP-6963 discovery or EIP-1193 injection, including a Core fallback. Mobile WalletConnect is not included.

Refreshing the same tab resumes its saved attempt. If wallet submission has an uncertain outcome, check wallet history and retain the payment reference before attempting another payment. Underpayments require merchant review.

## Why Arc

Arc lets customers use USDC for both payments and gas. Chameleon uses Arc transactions to connect a customer's payment to a checkout intent and provide a merchant-facing confirmation flow.

The integration targets chain **5042** and the USDC interface at `0x3600000000000000000000000000000000000000`. Payment amounts use six-decimal micro-USDC; native gas accounting uses eighteen decimals. See the official [network configuration](https://docs.arc.io/arc/references/connect-to-arc) and [contract reference](https://docs.arc.io/arc/references/contract-addresses).

## What this repository demonstrates

- Fixed-price payment intent creation through the existing Chameleon API.
- Wallet connection, network switching and customer-authorized transaction submission.
- Gateway-verified payment status and Arc transaction references.
- Raw-body webhook signature verification and persistent receipt deduplication.
- Idempotent creation requests and browser recovery after refresh.
- Fixed checkout configuration, amount restrictions and request rate limits.

The demo does not reproduce the private gateway or its reconciliation algorithms. It consumes public buyer endpoints without a merchant API key. The webhook signing secret remains server-side.

## Architecture

```text
Customer browser → demo server → Chameleon API → Arc RPC
                                      |
                              Signed payment webhook
                                      ↓
                         Demo receiver → receipt display
```

The demo server checks the configured network, asset, amount and recipient against API responses. The private gateway verifies the on-chain payment. Wallet approval, API confirmation and webhook receipt are distinct steps.

See [API contracts](docs/architecture.md) and the dated [implementation audit](docs/audit.md) for the verification boundary and operational limitations.

## Run locally

Use Node.js 24 (minimum 24.13.1). No third-party package installation is required.

```sh
# First-time setup only; preserve an existing .env.
cp .env.example .env
# Fill in the deployment values described below.
npm test
npm run build
npm run doctor
npm start
```

Open [localhost:3080](http://localhost:3080). To preview the page without payment configuration, run `npm start` alone. A configured mainnet checkout uses real funds even when the browser page runs locally.

The client is buildless; `npm run build` checks syntax. Node's built-in SQLite may emit an experimental-feature warning. Font and image assets are served locally.

## Environment

Store deployment values in the hosting provider's environment settings. Never commit `.env`, signing secrets, or wallet credentials.

| Variable | Mainnet configuration |
| --- | --- |
| `HOST` | `0.0.0.0` for hosting; `127.0.0.1` for local-only access |
| `PORT` | Hosting-assigned port, or `3080` |
| `PUBLIC_ORIGIN` | Exact demo HTTPS origin, without a path |
| `CHAMELEON_API_ORIGIN` | Backend HTTPS origin; omit `/api/v1` |
| `ARC_NETWORK` | `arc-mainnet` |
| `MAINNET_READY` | `true` for the owner's enabled mainnet configuration |
| `CHECKOUT_ENABLED` | Testnet-only switch; does not control mainnet |
| `CHAMELEON_BUTTON_ID` | Dedicated mainnet checkout button ID |
| `DEMO_RECIPIENT` | That checkout's expected receiving wallet address |
| `DEMO_AMOUNT_MICRO_USDC` | Exact checkout amount; maximum `1000000` (1 USDC). `100000` is 0.10 USDC |
| `WEBHOOK_SECRET` | Signing secret for this demo's dedicated webhook endpoint |

The example environment intentionally starts disabled so a fresh copy cannot accept payments accidentally. Existing deployment configuration need not be replaced with example defaults.

Allow `PUBLIC_ORIGIN` on the backend checkout button. Register `PUBLIC_ORIGIN/api/webhook` in Chameleon and configure its signing secret here. The backend must independently be configured for mainnet: changing the demo's readiness flag does not change the gateway network.

Run `npm run doctor` to check settings and the public checkout without creating a payment. Restart the server after environment changes. See [deployment](docs/deployment.md) and [mainnet verification](docs/arc-mainnet.md).

## Integration example

```js
// Keep this key for retries of the same purchase attempt.
const key = crypto.randomUUID();
const response = await fetch('/api/intents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
  body: '{}'
});
if (!response.ok) throw new Error('Checkout could not create the payment');
const intent = await response.json();
// Review the intent before asking the customer's wallet to sign.
```

Runnable examples are in `examples/`. The receiver validates `GoChameleon-Signature` against the exact request bytes before parsing the event, then records a deduplicated receipt.

## Development and publication

Local origin aliases, troubleshooting and optional testnet setup are documented in [local development](docs/local-development.md). Testnet activity is never mainnet evidence.

The [publication checklist](docs/publication.md) tracks reviewer links, transaction evidence, security checks and licensing. The project uses goChameleon's logo, emerald artwork, Mona Sans and IBM Plex Mono; see [asset provenance and font licenses](docs/brand-assets.md).

MIT is recommended for this demo's application code; approval remains pending. See [licensing](docs/licensing.md). This does not change ownership or licensing of the proprietary gateway.
