// The server's POST /api/webhook demonstrates raw-body use and durable deduplication.
// Do not parse JSON before signature verification or trust the event header alone.
export { verifyWebhook } from '../demo/lib/webhook.mjs';
