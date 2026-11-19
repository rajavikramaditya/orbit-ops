import type { Role } from './store';

/** Operational edits: clients, tasks, requests, content, team roster, company name. */
export function canEditWork(role: Role | null | undefined) {
  return role === 'owner' || role === 'manager';
}

/** Payments, expenses, revenue totals, Owner PIN / danger zone. */
export function canEditMoney(role: Role | null | undefined) {
  return role === 'owner';
}

export function canViewRevenue(role: Role | null | undefined) {
  return role === 'owner';
}

/** Phone, contact name, Instagram, member phones. */
export function canViewPii(role: Role | null | undefined) {
  return role === 'owner' || role === 'manager';
}

/** Monthly fee and similar commercial fields (not payment ledgers). */
export function canViewFees(role: Role | null | undefined) {
  return role === 'owner' || role === 'manager';
}

export function canManagePins(role: Role | null | undefined) {
  return role === 'owner';
}

/** View everyone’s attendance history and correct / mark any member. */
export function canManageAttendance(role: Role | null | undefined) {
  return role === 'owner' || role === 'manager';
}

/**
 * Mark own attendance for today (check-in / check-out).
 * Team’s only write exception; Owner/Manager can also self-mark this way.
 */
export function canSelfAttend(role: Role | null | undefined) {
  return role === 'owner' || role === 'manager' || role === 'team';
}

export type MutationKind = 'work' | 'money' | 'owner-settings' | 'attendance-self';

export function canMutate(role: Role | null | undefined, kind: MutationKind) {
  if (kind === 'money' || kind === 'owner-settings') return canEditMoney(role);
  if (kind === 'attendance-self') return canSelfAttend(role);
  return canEditWork(role);
}
