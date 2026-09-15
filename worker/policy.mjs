// Only operator-configured origins are reachable. This is not a public URL scanner.
export function allowedURL(raw, origins) {
 try { const u = new URL(raw); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password && origins.has(u.origin); }
 catch { return false; }
}
export function nextState(attempts) { return attempts >= 3 ? 'failed' : 'queued'; }
export function validID(id) { return /^[a-f0-9]{32}$/.test(id); }
