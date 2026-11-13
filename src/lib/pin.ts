import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/** Compare two secrets without leaking which one was longer. */
export function secretsMatch(given: string, expected: string) {
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function pinMatches(pin: string, stored: string | null) {
  if (!stored || !pin) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const next = scryptSync(pin, salt, 32);
  const prev = Buffer.from(hash, 'hex');
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}
