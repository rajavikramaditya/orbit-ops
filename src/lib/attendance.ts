/**
 * Attendance helpers. Entries live on the shared AppData document (Neon `/api/state`).
 * Team may only check in/out for themselves for today; Owner/Manager manage everyone.
 * This module is safe to import from API routes (no `use client`).
 */

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day';

export interface AttendanceEntry {
  id: string;
  memberId: string;
  /** Snapshot of the member name when marked (survives renames in history views). */
  memberName: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  note?: string;
  markedBy: string;
  updatedAt: string;
}

export const SELF_MEMBER_KEY = 'orbit-ops-attendance-self';

/** Local wall-clock hour:minute after which a first check-in counts as late. */
export const LATE_AFTER = { hour: 10, minute: 30 } as const;

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'late', 'half-day', 'absent'];

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  'half-day': 'Half day',
  absent: 'Absent',
};

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function statusTone(status: AttendanceStatus | undefined): 'green' | 'amber' | 'red' | 'neutral' {
  if (status === 'present') return 'green';
  if (status === 'late' || status === 'half-day') return 'amber';
  if (status === 'absent') return 'red';
  return 'neutral';
}

export function readSelfMemberId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(SELF_MEMBER_KEY) || '';
  } catch {
    return '';
  }
}

export function writeSelfMemberId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    if (id) localStorage.setItem(SELF_MEMBER_KEY, id);
    else localStorage.removeItem(SELF_MEMBER_KEY);
  } catch { /* private mode */ }
}

export function entryFor(entries: AttendanceEntry[] | undefined, memberId: string, date: string) {
  return (entries || []).find(e => e.memberId === memberId && e.date === date);
}

export function entriesOn(entries: AttendanceEntry[] | undefined, date: string) {
  return (entries || []).filter(e => e.date === date);
}

export function entriesInMonth(entries: AttendanceEntry[] | undefined, ym: string) {
  return (entries || []).filter(e => e.date.startsWith(ym));
}

export function isLateCheckIn(iso = new Date().toISOString()) {
  const d = new Date(iso);
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins > LATE_AFTER.hour * 60 + LATE_AFTER.minute;
}

export function formatTime(iso: string | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function monthDays(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const days: string[] = [];
  for (let d = 1; d <= last; d++) {
    days.push(`${ym}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

export function monthLabelLong(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function weekdayIndex(date: string) {
  const dow = new Date(date + 'T00:00:00').getDay();
  return dow === 0 ? 6 : dow - 1;
}

export type DaySummary = {
  present: number;
  late: number;
  half: number;
  absent: number;
  marked: number;
};

export function summarizeDay(entries: AttendanceEntry[]): DaySummary {
  return {
    present: entries.filter(e => e.status === 'present').length,
    late: entries.filter(e => e.status === 'late').length,
    half: entries.filter(e => e.status === 'half-day').length,
    absent: entries.filter(e => e.status === 'absent').length,
    marked: entries.length,
  };
}

type Person = { id: string; name: string };

/** Upsert today's self check-in. Returns the new/updated entry. */
export function applyCheckIn(
  list: AttendanceEntry[],
  member: Person,
  markedBy: string,
  now = new Date(),
): AttendanceEntry {
  const date = dayKey(now);
  const at = now.toISOString();
  const late = isLateCheckIn(at);
  const existing = list.find(e => e.memberId === member.id && e.date === date);
  if (existing) {
    if (!existing.checkIn) existing.checkIn = at;
    if (existing.status === 'absent' || !existing.status) {
      existing.status = late ? 'late' : 'present';
    }
    existing.memberName = member.name;
    existing.updatedAt = at;
    existing.markedBy = markedBy;
    return existing;
  }
  const entry: AttendanceEntry = {
    id: newId(),
    memberId: member.id,
    memberName: member.name,
    date,
    status: late ? 'late' : 'present',
    checkIn: at,
    markedBy,
    updatedAt: at,
  };
  list.push(entry);
  return entry;
}

/** Set check-out on today's entry; creates a present row if somehow missing. */
export function applyCheckOut(
  list: AttendanceEntry[],
  member: Person,
  markedBy: string,
  now = new Date(),
): AttendanceEntry {
  const date = dayKey(now);
  const at = now.toISOString();
  let existing = list.find(e => e.memberId === member.id && e.date === date);
  if (!existing) {
    existing = {
      id: newId(),
      memberId: member.id,
      memberName: member.name,
      date,
      status: 'present',
      checkIn: at,
      checkOut: at,
      markedBy,
      updatedAt: at,
    };
    list.push(existing);
    return existing;
  }
  if (existing.status === 'absent') {
    existing.status = 'present';
    if (!existing.checkIn) existing.checkIn = at;
  }
  existing.checkOut = at;
  existing.memberName = member.name;
  existing.updatedAt = at;
  existing.markedBy = markedBy;
  return existing;
}

/**
 * Server-side: allow Team to change only today's attendance for one memberId.
 * Other document fields are ignored; historical rows stay as stored.
 */
export function mergeTeamSelfAttendance(
  storedAttendance: AttendanceEntry[] | undefined,
  incomingAttendance: AttendanceEntry[] | undefined,
  memberId: string,
  day = dayKey(),
): { ok: true; attendance: AttendanceEntry[] } | { ok: false; reason: string } {
  if (!memberId) return { ok: false, reason: 'member' };
  const stored = Array.isArray(storedAttendance) ? storedAttendance.map(e => ({ ...e })) : [];
  const incoming = Array.isArray(incomingAttendance) ? incomingAttendance : [];

  const storedToday = stored.filter(e => e.memberId === memberId && e.date === day);
  const incomingToday = incoming.filter(e => e.memberId === memberId && e.date === day);
  if (incomingToday.length > 1) return { ok: false, reason: 'duplicate' };
  if (incomingToday.length === 0 && storedToday.length === 0) {
    return { ok: true, attendance: stored };
  }
  if (incomingToday.length === 0) return { ok: false, reason: 'delete' };

  const next = incomingToday[0];
  if (next.memberId !== memberId || next.date !== day) return { ok: false, reason: 'scope' };
  if (!ATTENDANCE_STATUSES.includes(next.status)) return { ok: false, reason: 'status' };
  // Team cannot mark themselves absent via this path (Manager/Owner do that).
  if (next.status === 'absent') return { ok: false, reason: 'absent' };

  const otherIncoming = incoming.filter(e => !(e.memberId === memberId && e.date === day));
  for (const e of otherIncoming) {
    const match = stored.find(s => s.id === e.id);
    if (!match) return { ok: false, reason: 'other-new' };
    if (JSON.stringify(match) !== JSON.stringify(e)) return { ok: false, reason: 'other-edit' };
  }

  const rest = stored.filter(e => !(e.memberId === memberId && e.date === day));
  const prev = storedToday[0];
  const cleaned: AttendanceEntry = {
    id: prev?.id || next.id || newId(),
    memberId,
    memberName: next.memberName || prev?.memberName || '',
    date: day,
    status: next.status === 'half-day' ? 'half-day' : next.status === 'late' ? 'late' : 'present',
    checkIn: next.checkIn || prev?.checkIn,
    checkOut: next.checkOut || prev?.checkOut,
    note: typeof next.note === 'string' ? next.note.slice(0, 200) : prev?.note,
    markedBy: next.markedBy || 'team',
    updatedAt: next.updatedAt || new Date().toISOString(),
  };
  if (prev?.checkIn) cleaned.checkIn = prev.checkIn;
  if (prev?.checkOut && cleaned.checkOut && cleaned.checkOut < prev.checkOut) {
    cleaned.checkOut = prev.checkOut;
  }

  return { ok: true, attendance: [...rest, cleaned] };
}
