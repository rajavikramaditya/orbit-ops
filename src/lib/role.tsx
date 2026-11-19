'use client';

import { useSyncExternalStore } from 'react';
import { loadData, type Role } from './store';
import { state } from './store-cache';
import { lockOwner, unlockOwner } from './sync';
import { managerPinMatches, teamPinMatches } from './role-pins';
import { canEditMoney, canEditWork, canViewFees, canViewPii, canViewRevenue } from './permissions';

/** Tab-scoped role + unlock. Never put these in localStorage — that would escalate across tabs. */
const ROLE_KEY = 'orbit-ops-role';
const UNLOCK_KEY = 'orbit-ops-role-unlocked';
const LEGACY_ROLE_KEY = 'orbit-ops-role';
const listeners = new Set<() => void>();

type Session = { role: Role; unlocked: boolean };

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

/** Cached client snapshot — useSyncExternalStore requires Object.is-stable values. */
let clientSession: Session = { role: 'team', unlocked: false };

function readSession(): Session {
  const role = readStoredRole();
  const unlocked = readUnlocked();
  if (clientSession.role !== role || clientSession.unlocked !== unlocked) {
    clientSession = { role, unlocked };
  }
  return clientSession;
}

/** Stable server snapshot — a fresh object each call breaks useSyncExternalStore. */
const SERVER_SESSION: Session = { role: 'team', unlocked: false };

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

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export type UnlockResult = 'ok' | 'wrong-pin' | 'locked' | 'pin-required' | 'set-pin-required';

/**
 * Unlock a role for this tab. Every role needs its PIN before the view is usable.
 * Leaving a role (Switch Role) clears unlock and locks Owner money.
 */
export async function unlockRole(next: Role, pin: string, pinConfirm?: string): Promise<UnlockResult> {
  const trimmed = pin.trim();
  if (!trimmed) return 'pin-required';

  if (next === 'manager') {
    if (!(await managerPinMatches(trimmed))) return 'wrong-pin';
    lockOwner();
    writeRole('manager');
    writeUnlocked(true);
    emit();
    return 'ok';
  }

  if (next === 'team') {
    const hash = loadData().settings.teamPinHash;
    if (!(await teamPinMatches(trimmed, hash))) return 'wrong-pin';
    lockOwner();
    writeRole('team');
    writeUnlocked(true);
    emit();
    return 'ok';
  }

  // Owner — write role before any save so PUT headers declare Owner for first-PIN bootstrap.
  const settings = loadData().settings;
  const hasPin = !!(settings.ownerPin || settings.ownerPinSet);

  if (!hasPin) {
    if (trimmed.length < 4) return 'pin-required';
    if (pinConfirm === undefined) return 'set-pin-required';
    if (pinConfirm.trim() !== trimmed) return 'wrong-pin';
    writeRole('owner');
    const { update } = await import('./store');
    update(d => { d.settings.ownerPin = trimmed; }, 'bootstrap');
    if (state.remote) {
      const ok = await unlockOwner(trimmed);
      if (ok === 'locked') return 'locked';
      if (ok !== 'ok') {
        state.ownerPin = trimmed;
      }
    } else {
      state.ownerPin = trimmed;
    }
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

  writeRole('owner');
  writeUnlocked(true);
  emit();
  return 'ok';
}

/** Clear the unlocked session and return to the role gate. */
export function lockRole() {
  writeUnlocked(false);
  lockOwner();
  emit();
}

/** @deprecated Prefer unlockRole — kept for any leftover callers. */
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
    unlockRole,
    lockRole,
    switchRole,
  };
}

export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', manager: 'Manager', team: 'Team' };

export const ROLE_BLURB: Record<Role, string> = {
  owner: 'Everything, including payments, expenses and revenue',
  manager: 'Clients, requests, content and tasks — not revenue',
  team: 'Read-only progress. No contact details or edits.',
};
