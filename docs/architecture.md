# Public integration architecture

Browser → demo Node server → public Chameleon API → private verification infrastructure → Arc.

Private Chameleon webhook delivery → demo raw-body signature verifier → local receipt database → browser receipt display.

All demo code was written independently for public distribution. No private backend, dashboard or goChameleon widget source is bundled. Reuse occurs through existing API contracts. A small buildless browser client replaces copying the proprietary widget; it passes the API's unsigned transaction to the selected wallet and cannot sign without wallet approval.

| Operation | Existing upstream contract |
| --- | --- |
| Checkout bootstrap | GET `/api/v1/checkout/buttons/{button}/` |
| Intent creation | POST `/api/v1/checkout/buttons/{button}/payment-intents/`, `{}`, `Idempotency-Key` |
| Status and pending transaction | GET `/api/v1/payments/intents/{id}/` |
| Hash submission | POST `/api/v1/payments/intents/{id}/transaction/`, `{ "tx_hash": "0x…" }` |

Amounts are integer micro-USDC. Public responses include `id`, `status`, `amount`, `asset`, `chain_id`, `pay_to_address`, `expires_at`, `tx_hash`, and checkout network context. Pending responses provide `{to,data,value}` transaction instructions. The client does not construct or copy proprietary payment-matching logic.

Webhook contract: `GoChameleon-Signature: t=<unix-seconds>,v1=<hex-HMAC-SHA256>`. Signed input is timestamp, a dot, and the exact request bytes. Verification uses constant-time comparison and a five-minute clock tolerance. Event ID uniqueness provides durable duplicate suppression. SQLite stores only event ID, intent ID, type and receipt time, not merchant metadata or full payloads. A webhook does not overwrite API payment status.

Browser state stores intent ID, idempotency key and broadcast hash in sessionStorage. No secret is sent to the browser. The proxy uses bounded request bodies, timeouts, fixed routes, strict same-origin writes, a 1-USDC mainnet ceiling (5 test USDC in explicit testnet mode), response validation, static-file allowlisting, and per-process rate limits. Only use a trusted API origin: this client relies on the gateway's transaction payload and verification verdict.

Explicit `arc-testnet` mode uses chain 5042002, testnet wallet configuration and explorer URLs, with clear test-funds notices. It does not satisfy the mainnet evidence requirement. `arc-mainnet` remains the default and requires its own readiness flag.
