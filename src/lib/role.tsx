'use client';

import { useSyncExternalStore } from 'react';
import { loadData, type Role } from './store';
import { state } from './store-cache';
import { forgetAccessKey, lockOwner, remoteAwaitingFirstSave, unlockOwner } from './sync';
import { lookupMemberForLogin, memberPasswordMatches } from './role-pins';
import { writeSelfMemberId } from './attendance';
import { canEditMoney, canEditWork, canManageAttendance, canSelfAttend, canViewFees, canViewPii, canViewRevenue } from './permissions';

/** Tab-scoped role + unlock. Never put these in localStorage — that would escalate across tabs. */
const ROLE_KEY = 'orbit-ops-role';
const UNLOCK_KEY = 'orbit-ops-role-unlocked';
/** Also read by sync.ts for Team attendance headers — keep the string in sync. */
const MEMBER_KEY = 'orbit-ops-member-id';
const LEGACY_ROLE_KEY = 'orbit-ops-role';
const listeners = new Set<() => void>();

type Session = { role: Role; unlocked: boolean; memberId: string };

function readStoredRole(): Role {
  if (typeof window === 'undefined') return 'team';
  try {
    const r = sessionStorage.getItem(ROLE_KEY);
    if (r === 'owner' || r === 'manager' || r === 'team') return r;
  } catch { /* private mode */ }
  return 'team';
}

function readUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

function readMemberId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(MEMBER_KEY) || '';
  } catch {
    return '';
  }
}

/** Cached client snapshot — useSyncExternalStore requires Object.is-stable values. */
let clientSession: Session = { role: 'team', unlocked: false, memberId: '' };

function readSession(): Session {
  const role = readStoredRole();
  const unlocked = readUnlocked();
  const memberId = readMemberId();
  if (clientSession.role !== role || clientSession.unlocked !== unlocked || clientSession.memberId !== memberId) {
    clientSession = { role, unlocked, memberId };
  }
  return clientSession;
}

/** Stable server snapshot — a fresh object each call breaks useSyncExternalStore. */
const SERVER_SESSION: Session = { role: 'team', unlocked: false, memberId: '' };

function writeRole(r: Role) {
  try {
    sessionStorage.setItem(ROLE_KEY, r);
  } catch { /* private mode */ }
  // Drop any legacy shared role so another tab cannot inherit this unlock.
  try { localStorage.removeItem(LEGACY_ROLE_KEY); } catch { /* */ }
}

function writeUnlocked(on: boolean) {
  try {
    if (on) sessionStorage.setItem(UNLOCK_KEY, '1');
    else sessionStorage.removeItem(UNLOCK_KEY);
  } catch { /* private mode */ }
}

function writeMemberId(id: string) {
  try {
    if (id) sessionStorage.setItem(MEMBER_KEY, id);
    else sessionStorage.removeItem(MEMBER_KEY);
  } catch { /* private mode */ }
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export type UnlockResult =
  | 'ok'
  | 'wrong-pin'
  | 'locked'
  | 'pin-required'
  | 'set-pin-required'
  | 'name-required'
  | 'unknown-name'
  | 'ambiguous-name';

/**
 * True only when Owner may create the first PIN from the login form.
 * Never true for Manager/Team — callers must also gate on role === 'owner'.
 * An existing local Owner PIN is never cleared or reset just because remote is empty.
 */
export function ownerNeedsFirstPin(): boolean {
  const s = loadData().settings;
  // Local plaintext PIN or a known-set flag always wins — never offer bootstrap reset.
  if (s.ownerPin || s.ownerPinSet === true) return false;
  if (state.remote) {
    if (s.ownerPinSet === false) return true;
    // Empty remote with no local PIN yet: first Owner may bootstrap once.
    if (remoteAwaitingFirstSave()) return true;
    return false;
  }
  return true;
}

function bindSession(role: Role, memberId: string) {
  writeRole(role);
  writeMemberId(memberId);
  // Owner/Manager: optional shared mark-as preference for attendance UI.
  // Team: never write shared localStorage — API headers use this tab’s session id only.
  if (role !== 'team') writeSelfMemberId(memberId);
  writeUnlocked(true);
  emit();
}

/**
 * Single-page login: role + first name + password.
 * First name must match a unique roster person whose MemberRole maps to `next`.
 * Owner password is the money PIN. Manager/Team use per-member passwordHash or
 * the legacy role defaults (8423095693 / 246810).
 */
export async function unlockWithIdentity(
  next: Role,
  firstName: string,
  password: string,
  passwordConfirm?: string,
): Promise<UnlockResult> {
  const name = firstName.trim();
  if (!name) return 'name-required';
  const trimmed = password.trim();
  if (!trimmed) return 'pin-required';

  const data = loadData();
  const lookup = lookupMemberForLogin(data.team, next, name);
  if (lookup.status === 'ambiguous') return 'ambiguous-name';
  if (lookup.status !== 'ok') return 'unknown-name';
  const member = lookup.member;

  if (next === 'manager' || next === 'team') {
    if (!(await memberPasswordMatches(member, trimmed, data.settings))) return 'wrong-pin';
    lockOwner();
    bindSession(next, member.id);
    return 'ok';
  }

  // Owner — money PIN path (separate from per-member hashes).
  const settings = data.settings;
  const hasPin = !!(settings.ownerPin || settings.ownerPinSet);

  if (!hasPin) {
    if (state.remote && passwordConfirm === undefined) {
      const ok = await unlockOwner(trimmed);
      if (ok === 'ok') {
        bindSession('owner', member.id);
        return 'ok';
      }
      if (ok === 'locked') return 'locked';
      if (ownerNeedsFirstPin()) return 'set-pin-required';
      return 'wrong-pin';
    }

    if (!ownerNeedsFirstPin()) return 'wrong-pin';
    if (trimmed.length < 4) return 'pin-required';
    if (passwordConfirm === undefined) return 'set-pin-required';
    if (passwordConfirm.trim() !== trimmed) return 'wrong-pin';
    writeRole('owner');
    writeMemberId(member.id);
    const { update } = await import('./store');
    update(d => { d.settings.ownerPin = trimmed; }, 'bootstrap');
    if (state.remote) {
      const ok = await unlockOwner(trimmed);
      if (ok === 'locked') return 'locked';
      if (ok !== 'ok') state.ownerPin = trimmed;
    } else {
      state.ownerPin = trimmed;
    }
    writeSelfMemberId(member.id);
    writeUnlocked(true);
    emit();
    return 'ok';
  }

  if (settings.ownerPinSet && !settings.ownerPin) {
    const ok = await unlockOwner(trimmed);
    if (ok === 'locked') return 'locked';
    if (ok !== 'ok') return 'wrong-pin';
  } else if (settings.ownerPin) {
    if (trimmed !== settings.ownerPin) return 'wrong-pin';
    state.ownerPin = trimmed;
  } else {
    return 'pin-required';
  }

  bindSession('owner', member.id);
  return 'ok';
}

/** @deprecated Prefer unlockWithIdentity — kept for any leftover callers. */
export async function unlockRole(next: Role, pin: string, pinConfirm?: string): Promise<UnlockResult> {
  // Without a first name this cannot complete the new model.
  void next; void pin; void pinConfirm;
  return 'name-required';
}

/** Clear the unlocked session and return to the single login page (keep access key). */
export function lockRole() {
  writeUnlocked(false);
  writeMemberId('');
  lockOwner();
  emit();
}

/**
 * Leave the workspace entirely: clear unlock + access key → single login page
 * with the team access key field visible again.
 */
export function switchAccount() {
  writeUnlocked(false);
  writeMemberId('');
  state.ownerPin = '';
  forgetAccessKey();
  emit();
}

/**
 * Switch Role / log out: return to the same single login page.
 * Keeps the team access key when present so the form only needs role + name + password.
 */
export function leaveToLogin() {
  lockRole();
}

/** @deprecated Prefer unlockWithIdentity. */
export type SwitchResult = UnlockResult;

export function switchRole(_next: Role, _pin?: string): SwitchResult {
  return 'pin-required';
}

export function useRole() {
  const session = useSyncExternalStore(subscribe, readSession, () => SERVER_SESSION);
  const role = session.unlocked ? session.role : null;
  return {
    role: session.role,
    unlocked: session.unlocked,
    memberId: session.unlocked ? session.memberId : '',
    /** Active role only when unlocked; otherwise null. */
    activeRole: role,
    isOwner: session.unlocked && session.role === 'owner',
    isManager: session.unlocked && session.role === 'manager',
    isTeam: session.unlocked && session.role === 'team',
    canEdit: session.unlocked && canEditWork(session.role),
    canMoney: session.unlocked && canEditMoney(session.role),
    canRevenue: session.unlocked && canViewRevenue(session.role),
    canPii: session.unlocked && canViewPii(session.role),
    canFees: session.unlocked && canViewFees(session.role),
    canManageAttendance: session.unlocked && canManageAttendance(session.role),
    canSelfAttend: session.unlocked && canSelfAttend(session.role),
    unlockWithIdentity,
    unlockRole,
    lockRole,
    switchAccount,
    leaveToLogin,
    switchRole,
  };
}

export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', manager: 'Manager', team: 'Team' };
