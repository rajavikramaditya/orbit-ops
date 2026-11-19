/**
 * Login password helpers. Manager/Team legacy role PINs and per-member
 * password hashes are verified as SHA-256 digests so plaintext never needs to
 * sit in client-readable source. Owner money PIN stays on the existing scrypt /
 * server path in pin.ts + /api/state.
 */

import type { Member, MemberRole, Role, Settings } from './store';

/** SHA-256 hex of `orbit-ops:manager:8423095693` — legacy Manager default password. */
export const MANAGER_PIN_HASH =
  '568017e82f3903c9d14f4510dc61c012d31d5ea543a6d6d447c3e2943854b8cc';

/**
 * SHA-256 hex of `orbit-ops:team:246810`.
 * Legacy Team default password is 246810; Owner can replace it in Settings
 * (stored as hash) or set a per-member password on the Team page.
 */
export const DEFAULT_TEAM_PIN_HASH =
  'a5f05f61eefb2ea9e1c70cdb9c2e3c1002dcbb3ca215312733ab5ab072e1f6e2';

/** Documented legacy defaults (never ship new plaintext into UI copy). */
export const LEGACY_MANAGER_PASSWORD = '8423095693';
export const LEGACY_TEAM_PASSWORD = '246810';

function toHex(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(message: string) {
  // Web Crypto only — safe in the browser bundle (no Node `crypto` import).
  const subtle = globalThis.crypto?.subtle;
  if (!subtle?.digest) throw new Error('Web Crypto is required to verify login passwords');
  const data = new TextEncoder().encode(message);
  return toHex(await subtle.digest('SHA-256', data));
}

export function managerPinMessage(pin: string) {
  return `orbit-ops:manager:${pin.trim()}`;
}

export function teamPinMessage(pin: string) {
  return `orbit-ops:team:${pin.trim()}`;
}

export function memberPasswordMessage(memberId: string, password: string) {
  return `orbit-ops:member:${memberId}:${password.trim()}`;
}

export async function hashManagerPin(pin: string) {
  return sha256Hex(managerPinMessage(pin));
}

export async function hashTeamPin(pin: string) {
  return sha256Hex(teamPinMessage(pin));
}

export async function hashMemberPassword(memberId: string, password: string) {
  return sha256Hex(memberPasswordMessage(memberId, password));
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

/** Map roster MemberRole → device login role. */
export function deviceRoleForMemberRole(role: MemberRole): Role {
  if (role === 'Owner') return 'owner';
  if (role === 'Manager') return 'manager';
  return 'team';
}

export function firstNameOf(fullName: string) {
  return fullName.trim().split(/\s+/)[0]?.toLowerCase() || '';
}

/**
 * Find the unique roster member for a login attempt.
 * Match is first-name only (case-insensitive) among people whose roster role
 * maps to the selected device role.
 */
export function findMemberForLogin(team: Member[], role: Role, firstName: string): Member | null {
  const want = firstNameOf(firstName);
  if (!want) return null;
  const matches = team.filter(
    m => deviceRoleForMemberRole(m.role) === role && firstNameOf(m.name) === want,
  );
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Verify a member's login password.
 * Prefer per-member `passwordHash` when set; otherwise fall back to the legacy
 * role defaults (Manager 8423095693, Team 246810 / settings.teamPinHash).
 * Owner money PIN is verified separately by the caller.
 */
export async function memberPasswordMatches(
  member: Member,
  password: string,
  settings: Pick<Settings, 'teamPinHash'>,
): Promise<boolean> {
  const trimmed = password.trim();
  if (!trimmed) return false;
  if (member.passwordHash && member.passwordHash.length === 64) {
    return (await hashMemberPassword(member.id, trimmed)) === member.passwordHash;
  }
  if (member.role === 'Manager') return managerPinMatches(trimmed);
  if (member.role === 'Owner') return false; // Owner uses money PIN path
  return teamPinMatches(trimmed, settings.teamPinHash);
}
