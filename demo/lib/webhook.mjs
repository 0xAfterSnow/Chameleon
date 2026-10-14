import { createHmac, timingSafeEqual } from 'node:crypto';
export function verifyWebhook(raw, header, secret, now = Date.now()) {
  const match = /^t=(\d{1,12}),v1=([a-f0-9]{64})$/.exec(header || '');
  if (!secret || !match || Math.abs(now / 1000 - Number(match[1])) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${match[1]}.`).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(match[2], 'hex'));
}
