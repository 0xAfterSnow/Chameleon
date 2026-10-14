# Local development and troubleshooting

The owner's deployment is configured for mainnet. Development testnet mode is optional and separate from the submission deployment.

## Environment diagnostics

Run `npm run doctor` to check environment settings and read the public checkout configuration. It does not create a payment, verify a completed transfer, or print credentials. Restart `npm start` after changes to `.env`.

In mainnet mode, `MAINNET_READY=true` enables checkout only when the remaining local settings pass validation. The backend must also serve mainnet chain 5042. The fixed price must match `DEMO_AMOUNT_MICRO_USDC` and remain within the 1-USDC mainnet limit.

`DEMO_RECIPIENT` is a public wallet address beginning with `0x`, not a wallet name. `CHAMELEON_API_ORIGIN` is the backend origin without `/api/v1`. Configure the button's allowed origins to include the demo's `PUBLIC_ORIGIN`.

The browser may use `localhost`, `127.0.0.1` or `[::1]` on the same protocol and port as a configured loopback origin, provided the server is reachable there. Other origins remain blocked. Upstream requests always use the configured `PUBLIC_ORIGIN`.

## Optional testnet mode

Use an isolated testnet backend and checkout:

```dotenv
ARC_NETWORK=arc-testnet
CHECKOUT_ENABLED=true
MAINNET_READY=false
DEMO_AMOUNT_MICRO_USDC=2000000
```

The example amount is 2 test USDC; it must match the testnet checkout. Testnet permits up to 5 test USDC. Configure its API origin, button, recipient and webhook secret separately. Wallet switching, explorer links and the page explicitly identify Arc Testnet (5042002). Saved browser recovery state is scoped by network.

Do not use testnet receipts as mainnet evidence or switch a database containing active testnet intents to mainnet RPC. For a mainnet submission, use the deployment configuration in the README.
