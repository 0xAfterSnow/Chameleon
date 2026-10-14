# Chameleon

A developer-first USDC payment gateway powered by Arc.

Merchants need a reliable way to connect a wallet transfer to an order and receive a trustworthy payment notification. This independently authored public client demonstrates the Chameleon checkout API, wallet signing, API status verification, transaction references, and signed webhook receipt.

**Status:** implementation prepared; deployment and a real mainnet payment have not been verified for this demo. No live demo URL, transaction evidence, or public builder profile has been supplied. This is not yet a completed mainnet grant submission.

The public repository demonstrates Chameleon's Arc integration. Its core production infrastructure remains proprietary. It contains no gateway source, reconciliation implementation, merchant credentials, or existing repository history.

## Why Arc

Arc uses USDC for gas and payments, reducing the need for a separate gas asset. Official [network configuration](https://docs.arc.io/arc/references/connect-to-arc) and [contract addresses](https://docs.arc.io/arc/references/contract-addresses) were checked on October 11, 2026. Mainnet mode accepts chain 5042 and the official USDC interface. Explicit testnet mode accepts chain 5042002 and labels every payment as a test; neither mode accepts the other network.

## Run locally

Use a supported, patched Node.js 24 release (minimum 24.13.1). There are no third-party package dependencies and no install step.

```sh
cp .env.example .env
npm test
npm run build
npm start
```

Open http://localhost:3080. To preview the branding only, simply run `npm start`; creating `.env` is optional. No private backend is required to view the page. Without configuration, the page displays setup required and cannot create payments. `npm run build` performs syntax checks; the client is buildless and does not generate source maps. Node's built-in SQLite may print an experimental-feature warning.

Configure a dedicated demonstration merchant, settlement wallet, and fixed-price checkout through your existing private Chameleon deployment. Do not use a production merchant wallet. Configure that button's allowed origin to match `PUBLIC_ORIGIN`, and register its webhook endpoint at `PUBLIC_ORIGIN/api/webhook`.

| Variable | Purpose |
| --- | --- |
| `PORT`, `HOST` | Local defaults 3080 and 127.0.0.1; container uses 0.0.0.0 |
| `PUBLIC_ORIGIN` | Exact browser origin, HTTPS when deployed |
| `CHAMELEON_API_ORIGIN` | Trusted Chameleon API origin, no path or embedded credentials |
| `CHAMELEON_BUTTON_ID` | Dedicated public checkout ID |
| `DEMO_RECIPIENT` | Dedicated expected receiving address |
| `DEMO_AMOUNT_MICRO_USDC` | Positive integer micro-USDC: at most 1000000 on mainnet or 5000000 on testnet |
| `ARC_NETWORK` | `arc-mainnet` (default) or explicit `arc-testnet` |
| `CHECKOUT_ENABLED` | Enable testnet checkout with `true`; does not enable mainnet |
| `MAINNET_READY` | Default false; enable after mainnet preflight |
| `WEBHOOK_SECRET` | Secret for this demo's webhook endpoint only; server-side |

No merchant API key is needed: the existing buyer endpoints are public. The proxy restricts requests to the configured button and checks returned chain, asset, price and recipient. It never forwards privileged endpoints.

## Reviewer walkthrough

1. Open the configured deployment and create an intent.
2. Review the amount, receiving address, expiration and reference.
3. Select an injected browser wallet (EIP-6963 discovery; Core/legacy EIP-1193 fallback), then choose **Review in wallet & pay**. Mobile WalletConnect is not included.
4. Approve a real payment only when ready to spend the displayed amount plus USDC gas.
5. Observe pending/submitted/confirmed or an explicit failure state. Confirmation is always supplied by the gateway, never inferred from a hash.
6. Follow the explorer link. Observe the signed webhook receipt separately; confirmation does not fabricate a webhook.
7. Reload to resume the same attempt in this browser tab. Use refresh after a transport failure. Underpayment requires merchant review; never send a second full payment blindly.

The client retains a transaction hash after broadcast and retries submission. Browser storage disabled or cleared can prevent recovery; record the displayed reference. An ambiguous wallet RPC error may mean a transaction was broadcast: inspect wallet history and contact the merchant before retrying.

## Integration example

```js
const response = await fetch('/api/intents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
  body: '{}'
});
const intent = await response.json();
// Retain the same key for retries. Review the intent before signing.
```

See [API architecture](docs/architecture.md), [mainnet preflight](docs/arc-mainnet.md), [deployment](docs/deployment.md), [audit and security findings](docs/audit.md), and [publication checklist](docs/publication.md). Runnable examples live in `examples/`.

## Evidence and builder

- Live deployment: not supplied or deployed.
- Verified mainnet transaction: not yet collected.
- Webhook delivery evidence: not yet collected from a live gateway.
- Public builder profile: owner to supply before publication.

## License

MIT is recommended for this standalone integration code only. Approval is pending; no open-source license grant has been applied. See [licensing recommendation](docs/licensing.md). No change is made to the proprietary project's licensing.

## Brand assets

The demo includes the product’s Mona Sans and IBM Plex Mono fonts, goChameleon logo, and emerald artwork. They are self-hosted and travel with this folder. See [asset provenance and font licenses](docs/brand-assets.md).

## Troubleshooting environment setup

Run `npm run doctor` to check local settings and read the public checkout configuration without creating a payment or printing credentials. Restart `npm start` after changes to `.env`, and open the exact `PUBLIC_ORIGIN` URL.

`MAINNET_READY=false` intentionally disables payments. Setting it to true does not switch your gateway from testnet to mainnet. The dedicated checkout must serve chain 5042 and its price must exactly match `DEMO_AMOUNT_MICRO_USDC`, which is capped at 1000000 (1 USDC). Arc testnet (5042002) cannot be presented as mainnet evidence.


### Local testnet testing

To use an existing Arc testnet checkout, configure:

```dotenv
ARC_NETWORK=arc-testnet
CHECKOUT_ENABLED=true
MAINNET_READY=false
DEMO_AMOUNT_MICRO_USDC=2000000
```

The amount must match your dedicated checkout (this example is 2 test USDC). Keep the existing API origin, button ID, recipient and webhook secret. Run `npm run doctor`, restart `npm start`, and visit the exact `PUBLIC_ORIGIN`. The page, wallet switching and explorer use Arc Testnet. Testnet permits up to 5 test USDC; mainnet retains the 1-USDC ceiling. No testnet result is mainnet grant evidence. Browser recovery is scoped by network.

Local browser URLs `localhost`, `127.0.0.1`, and `[::1]` are accepted as equivalent origins on the same protocol and port (provided the server is reachable there). Other origins remain blocked. The proxy always uses the configured `PUBLIC_ORIGIN` for the upstream checkout allowlist.
