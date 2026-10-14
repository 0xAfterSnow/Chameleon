const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);

// Local aliases are equivalent only on the same protocol and port.
// Deployed origins remain exact; never derive trust from Host or forwarded headers.
export function acceptsOrigin(received, configured) {
  try {
    const source = new URL(received);
    const target = new URL(configured);
    if (!['http:', 'https:'].includes(source.protocol) || source.username || source.password || source.pathname !== '/' || source.search || source.hash) return false;
    if (source.origin === target.origin) return true;
    return loopback.has(source.hostname) && loopback.has(target.hostname)
      && source.protocol === target.protocol && source.port === target.port;
  } catch { return false; }
}
