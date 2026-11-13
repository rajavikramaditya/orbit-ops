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

/** Wrong guesses allowed before payments stay closed. */
export const PIN_FAIL_LIMIT = 5;
/** How long payments stay closed after too many wrong guesses. */
export const PIN_LOCK_MS = 15 * 60 * 1000;

export type PinGate = { ok: boolean; locked: boolean; fails: number; lockedUntil: string | null };

/**
 * A missing PIN is not a guess. A wrong PIN counts. After the limit, further
 * guesses are ignored until the lock expires, including a guess that would
 * have been correct.
 */
export function judgePin(opts: {
  presented: string;
  storedHash: string | null;
  fails: number;
  lockedUntil: string | null;
  now: number;
}): PinGate {
  const fails = Number.isFinite(opts.fails) && opts.fails > 0 ? Math.floor(opts.fails) : 0;
  const lockedMs = opts.lockedUntil ? Date.parse(opts.lockedUntil) : NaN;
  const locked = Number.isFinite(lockedMs) && lockedMs > opts.now;
  if (!opts.presented || !opts.storedHash) {
    return { ok: false, locked, fails, lockedUntil: locked ? new Date(lockedMs).toISOString() : null };
  }
  if (locked) return { ok: false, locked: true, fails, lockedUntil: new Date(lockedMs).toISOString() };
  if (pinMatches(opts.presented, opts.storedHash)) {
    return { ok: true, locked: false, fails: 0, lockedUntil: null };
  }
  const next = fails + 1;
  if (next >= PIN_FAIL_LIMIT) {
    const until = new Date(opts.now + PIN_LOCK_MS).toISOString();
    return { ok: false, locked: true, fails: next, lockedUntil: until };
  }
  return { ok: false, locked: false, fails: next, lockedUntil: null };
}
