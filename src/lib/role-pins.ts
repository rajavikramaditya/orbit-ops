/**
 * Role PIN helpers. Manager and Team PINs are verified as SHA-256 digests so
 * plaintext never needs to sit in client-readable source. Owner money PIN stays
 * on the existing scrypt / server path in pin.ts + /api/state.
 */

/** SHA-256 hex of `orbit-ops:manager:8423095693` — Manager PIN is fixed. */
export const MANAGER_PIN_HASH =
  '568017e82f3903c9d14f4510dc61c012d31d5ea543a6d6d447c3e2943854b8cc';

/**
 * SHA-256 hex of `orbit-ops:team:246810`.
 * Default Team PIN is 246810; Owner can replace it in Settings (stored as hash).
 */
export const DEFAULT_TEAM_PIN_HASH =
  'a5f05f61eefb2ea9e1c70cdb9c2e3c1002dcbb3ca215312733ab5ab072e1f6e2';

function toHex(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(message: string) {
  // Web Crypto only — safe in the browser bundle (no Node `crypto` import).
  const subtle = globalThis.crypto?.subtle;
  if (!subtle?.digest) throw new Error('Web Crypto is required to verify role PINs');
  const data = new TextEncoder().encode(message);
  return toHex(await subtle.digest('SHA-256', data));
}

export function managerPinMessage(pin: string) {
  return `orbit-ops:manager:${pin.trim()}`;
}

export function teamPinMessage(pin: string) {
  return `orbit-ops:team:${pin.trim()}`;
}

export async function hashManagerPin(pin: string) {
  return sha256Hex(managerPinMessage(pin));
}

export async function hashTeamPin(pin: string) {
  return sha256Hex(teamPinMessage(pin));
}

export async function managerPinMatches(pin: string) {
  if (!pin.trim()) return false;
  const digest = await hashManagerPin(pin);
  return digest === MANAGER_PIN_HASH;
}

export async function teamPinMatches(pin: string, storedHash?: string | null) {
  if (!pin.trim()) return false;
  const expected = (storedHash && storedHash.length === 64) ? storedHash : DEFAULT_TEAM_PIN_HASH;
  const digest = await hashTeamPin(pin);
  return digest === expected;
}
