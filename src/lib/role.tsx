'use client';

import { useSyncExternalStore } from 'react';
import { loadData, type Role } from './store';
import { state } from './store-cache';
import { lockOwner } from './sync';

const ROLE_KEY = 'orbit-ops-role';
const listeners = new Set<() => void>();

function readRole(): Role {
  if (typeof window === 'undefined') return 'team';
  const r = localStorage.getItem(ROLE_KEY);
  if (r === 'owner' || r === 'manager' || r === 'team') return r;
  // First visit on this device: owner only if no PIN protects it.
  const settings = loadData().settings;
  return (settings.ownerPin || settings.ownerPinSet) ? 'team' : 'owner';
}

function write(r: Role) {
  localStorage.setItem(ROLE_KEY, r);
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === ROLE_KEY && cb();
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
}

export type SwitchResult = 'ok' | 'pin-required' | 'wrong-pin';

/**
 * Switch role. Moving to Owner requires the PIN from Settings when one is set.
 * Moving away from Owner never needs a PIN.
 */
export function switchRole(next: Role, pin?: string): SwitchResult {
  const current = readRole();
  if (next === 'owner' && current !== 'owner') {
    const settings = loadData().settings;
    if (settings.ownerPin) {
      if (pin === undefined) return 'pin-required';
      if (pin !== settings.ownerPin) return 'wrong-pin';
    } else if (settings.ownerPinSet && !state.ownerPin) {
      return 'pin-required';
    }
  }
  write(next);
  if (next !== 'owner') lockOwner();
  return 'ok';
}

export function useRole() {
  const role = useSyncExternalStore(subscribe, readRole, () => 'team' as Role);
  return { role, isOwner: role === 'owner', switchRole };
}

export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', manager: 'Manager', team: 'Team' };
