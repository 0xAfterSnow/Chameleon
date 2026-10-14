# Deployment

Run a single Node 24 process behind an HTTPS reverse proxy. Use a dedicated gateway/demo merchant and configure the environment described in README. No deployment has been performed.

Build check: `npm run build`. Tests: `npm test`. Start: `npm start`. Container: `docker build -t chameleon-arc-demo .`; inject configuration at runtime and persist `/app/data` on a volume writable by UID 1000. Do not bake `.env` into images. The Dockerfile is provided but has not been built in this preparation session.

`GET /healthz` checks process liveness only. `GET /api/config` reports local configuration readiness, not upstream RPC or payment health. Exercise the mainnet preflight separately before allowing traffic. MAINNET_READY=false keeps creation disabled.

At the reverse proxy, enforce a small body limit, timeouts and per-client limits (suggested: 5 creations/minute, 30 reads/minute); add a deployment-wide creation budget. Origin restrictions are not bot authentication. The built-in limit is 90 requests/minute/socket IP and 600/minute/process. It ignores forwarded IP headers; behind a proxy, all requests may share one limit. Distributed deployments need shared rate limiting and shared durable webhook storage. Reserve capacity for webhook deliveries at the edge.

Persist the receipt database and synchronize server time. Monitor disk growth, webhook failures and gateway RPC errors. Back up or rotate receipt data under an explicit retention policy. Do not delete duplicate IDs inside the provider's replay window if adding fulfillment side effects. This demo records receipts only and does not fulfill orders.

Configure the dedicated webhook secret via the hosting secret manager; register `/api/webhook` in Chameleon. Keep the private gateway's own PostgreSQL, Redis, workers and expiry/recovery jobs running. No reviewer registration is necessary.
