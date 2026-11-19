'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, LogIn, LogOut, Pencil } from 'lucide-react';
import {
  useStore,
  update,
  uid,
  today,
  currentMonth,
  fmtDate,
  type AttendanceEntry,
  type AttendanceStatus,
  type Member,
} from '@/lib/store';
import { useRole, ROLE_LABEL } from '@/lib/role';
import { useToast } from '@/components/toast';
import {
  PageHeader,
  Card,
  Button,
  Field,
  Input,
  Select,
  Segmented,
  EmptyState,
  Sheet,
  Badge,
  Avatar,
  SectionTitle,
} from '@/components/ui';
import {
  ATTENDANCE_STATUSES,
  STATUS_LABEL,
  LATE_AFTER,
  applyCheckIn,
  applyCheckOut,
  entryFor,
  entriesOn,
  entriesInMonth,
  formatTime,
  monthDays,
  monthLabelLong,
  readSelfMemberId,
  shiftMonth,
  statusTone,
  summarizeDay,
  weekdayIndex,
  writeSelfMemberId,
} from '@/lib/attendance';
import { cn } from '@/lib/utils';

type Tab = 'today' | 'month';

export default function AttendancePage() {
  const data = useStore();
  const { canManageAttendance, canSelfAttend, isTeam, role, memberId } = useRole();
  const toast = useToast();
  const day = today();
  const [tab, setTab] = useState<Tab>('today');
  const [month, setMonth] = useState(currentMonth());
  const [personFilter, setPersonFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selfId, setSelfId] = useState('');
  const [editing, setEditing] = useState<{ member: Member; date: string } | null>(null);
  const [form, setForm] = useState<{ status: AttendanceStatus; checkIn: string; checkOut: string; note: string }>({
    status: 'present',
    checkIn: '',
    checkOut: '',
    note: '',
  });

  useEffect(() => {
    // Prefer the person who signed in (session memberId). Team cannot pick someone else.
    const fromSession = memberId && data.team.some(m => m.id === memberId) ? memberId : '';
    const fromStore = readSelfMemberId();
    const id = fromSession || (fromStore && data.team.some(m => m.id === fromStore) ? fromStore : '');
    if (id) {
      setSelfId(id);
      writeSelfMemberId(id);
    }
  }, [data.team, memberId]);

  const pickSelf = (id: string) => {
    if (isTeam) return; // Team identity is fixed at login
    setSelfId(id);
    writeSelfMemberId(id);
  };

  const self = data.team.find(m => m.id === selfId);
  const todayRows = entriesOn(data.attendance, day);
  const todaySummary = summarizeDay(todayRows);
  const unmarked = data.team.filter(m => !entryFor(data.attendance, m.id, day));

  const markedByLabel = ROLE_LABEL[role] || role;

  const checkIn = () => {
    if (!canSelfAttend || !self) {
      toast(isTeam ? 'Choose who you are first' : 'Pick a team member');
      return;
    }
    update(d => {
      if (!d.attendance) d.attendance = [];
      applyCheckIn(d.attendance, self, isTeam ? self.name : markedByLabel);
    }, isTeam ? 'attendance-self' : 'work');
    toast(`Checked in · ${self.name}`);
  };

  const checkOut = () => {
    if (!canSelfAttend || !self) {
      toast(isTeam ? 'Choose who you are first' : 'Pick a team member');
      return;
    }
    const existing = entryFor(data.attendance, self.id, day);
    if (!existing?.checkIn && existing?.status !== 'present' && existing?.status !== 'late' && existing?.status !== 'half-day') {
      toast('Check in first');
      return;
    }
    update(d => {
      if (!d.attendance) d.attendance = [];
      applyCheckOut(d.attendance, self, isTeam ? self.name : markedByLabel);
    }, isTeam ? 'attendance-self' : 'work');
    toast(`Checked out · ${self.name}`);
  };

  const openEdit = (member: Member, date: string) => {
    if (!canManageAttendance) return;
    const e = entryFor(data.attendance, member.id, date);
    setForm({
      status: e?.status || 'present',
      checkIn: e?.checkIn ? e.checkIn.slice(11, 16) : '',
      checkOut: e?.checkOut ? e.checkOut.slice(11, 16) : '',
      note: e?.note || '',
    });
    setEditing({ member, date });
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageAttendance || !editing) return;
    const { member, date } = editing;
    update(d => {
      if (!d.attendance) d.attendance = [];
      let row = d.attendance.find(x => x.memberId === member.id && x.date === date);
      const toIso = (hm: string) => (hm ? `${date}T${hm}:00` : undefined);
      if (!row) {
        row = {
          id: uid(),
          memberId: member.id,
          memberName: member.name,
          date,
          status: form.status,
          checkIn: toIso(form.checkIn),
          checkOut: toIso(form.checkOut),
          note: form.note.trim() || undefined,
          markedBy: markedByLabel,
          updatedAt: new Date().toISOString(),
        };
        d.attendance.push(row);
      } else {
        row.status = form.status;
        row.memberName = member.name;
        row.checkIn = form.status === 'absent' ? undefined : toIso(form.checkIn);
        row.checkOut = form.status === 'absent' ? undefined : toIso(form.checkOut);
        row.note = form.note.trim() || undefined;
        row.markedBy = markedByLabel;
        row.updatedAt = new Date().toISOString();
      }
    });
    toast(`Saved · ${member.name}`);
    setEditing(null);
  };

  const clearEntry = () => {
    if (!canManageAttendance || !editing) return;
    if (!confirm(`Clear attendance for ${editing.member.name} on ${fmtDate(editing.date)}?`)) return;
    update(d => {
      d.attendance = (d.attendance || []).filter(x => !(x.memberId === editing.member.id && x.date === editing.date));
    });
    toast('Cleared');
    setEditing(null);
  };

  const monthEntries = useMemo(() => {
    let list = entriesInMonth(data.attendance, month);
    if (personFilter) list = list.filter(e => e.memberId === personFilter);
    if (dateFilter) list = list.filter(e => e.date === dateFilter);
    return list.slice().sort((a, b) => b.date.localeCompare(a.date) || a.memberName.localeCompare(b.memberName));
  }, [data.attendance, month, personFilter, dateFilter]);

  const days = monthDays(month);
  const pad = days.length ? weekdayIndex(days[0]) : 0;
  const selfEntry = self ? entryFor(data.attendance, self.id, day) : undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader
        title="Attendance"
        subtitle={
          isTeam
            ? 'Check in and out for yourself today'
            : `Team check-in · late after ${String(LATE_AFTER.hour).padStart(2, '0')}:${String(LATE_AFTER.minute).padStart(2, '0')}`
        }
      >
        {canManageAttendance && (
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'month', label: 'Month' },
            ]}
          />
        )}
      </PageHeader>

      {data.team.length === 0 && (
        <EmptyState title="No team members" hint="Add people on the Team page before tracking attendance." />
      )}

      {tab === 'today' && data.team.length > 0 && (
        <>
          {canManageAttendance && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="Present" value={todaySummary.present} tone="green" />
              <MiniStat label="Late" value={todaySummary.late} tone="amber" />
              <MiniStat label="Half day" value={todaySummary.half} tone="amber" />
              <MiniStat label="Absent" value={todaySummary.absent} tone="red" />
            </div>
          )}

          <Card className="p-4 space-y-4">
            <SectionTitle>Your check-in</SectionTitle>
            {isTeam ? (
              self ? (
                <p className="text-xs text-muted-foreground -mt-2">Signed in as {self.name}. You can only mark your own attendance for today.</p>
              ) : (
                <p className="text-xs text-muted-foreground -mt-2">Your login name is not on the team roster. Ask a Manager to add you.</p>
              )
            ) : (
              <Field label="Mark as">
                <Select value={selfId} onChange={e => pickSelf(e.target.value)}>
                  <option value="">Select team member…</option>
                  {data.team.map(m => (
                    <option key={m.id} value={m.id}>{m.name} · {m.role}</option>
                  ))}
                </Select>
              </Field>
            )}
            {self && (
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name={self.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{self.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selfEntry
                      ? `${STATUS_LABEL[selfEntry.status]}${selfEntry.checkIn ? ` · in ${formatTime(selfEntry.checkIn)}` : ''}${selfEntry.checkOut ? ` · out ${formatTime(selfEntry.checkOut)}` : ''}`
                      : 'Not marked yet today'}
                  </p>
                </div>
                {canSelfAttend && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!!selfEntry?.checkIn || selfEntry?.status === 'absent'}
                      onClick={checkIn}
                    >
                      <LogIn className="h-3.5 w-3.5" /> Check in
                    </Button>
                    <Button
                      size="sm"
                      disabled={!selfEntry?.checkIn || !!selfEntry?.checkOut || selfEntry?.status === 'absent'}
                      onClick={checkOut}
                    >
                      <LogOut className="h-3.5 w-3.5" /> Check out
                    </Button>
                  </div>
                )}
              </div>
            )}
            {isTeam && (
              <p className="text-[11px] text-muted-foreground">
                Ask a Manager to correct history or mark absent / half-day.
              </p>
            )}
          </Card>

          {canManageAttendance && (
            <div>
              <SectionTitle right={unmarked.length ? <span className="text-xs text-muted-foreground">{unmarked.length} not marked</span> : undefined}>
                Everyone today
              </SectionTitle>
              <Card>
                {data.team.map(m => {
                  const e = entryFor(data.attendance, m.id, day);
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
                      <Avatar name={m.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {e
                            ? `${e.checkIn ? `In ${formatTime(e.checkIn)}` : '—'}${e.checkOut ? ` · Out ${formatTime(e.checkOut)}` : ''}`
                            : 'Not marked'}
                        </p>
                      </div>
                      {e ? (
                        <Badge tone={statusTone(e.status)}>{STATUS_LABEL[e.status]}</Badge>
                      ) : (
                        <Badge>Open</Badge>
                      )}
                      <button
                        type="button"
                        aria-label={`Edit ${m.name}`}
                        onClick={() => openEdit(m, day)}
                        className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}
        </>
      )}

      {tab === 'month' && data.team.length > 0 && (
        canManageAttendance ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <Button size="sm" variant="ghost" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm font-medium">{monthLabelLong(month)}</p>
              <Button size="sm" variant="ghost" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Person">
                <Select value={personFilter} onChange={e => setPersonFilter(e.target.value)}>
                  <option value="">Everyone</option>
                  {data.team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
              <Field label="Date">
                <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
              </Field>
            </div>

            <Card className="p-3">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: pad }).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map(d => {
                  const rows = entriesOn(data.attendance, d).filter(e => !personFilter || e.memberId === personFilter);
                  const s = summarizeDay(rows);
                  const isToday = d === day;
                  const tone = s.absent > 0 ? 'bg-red-soft' : s.late + s.half > 0 ? 'bg-amber-soft' : s.present > 0 ? 'bg-green-soft' : 'bg-muted/40';
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDateFilter(dateFilter === d ? '' : d)}
                      className={cn(
                        'aspect-square rounded-xl text-xs flex flex-col items-center justify-center gap-0.5 transition-colors',
                        tone,
                        isToday && 'ring-1 ring-foreground',
                        dateFilter === d && 'ring-2 ring-brand',
                      )}
                    >
                      <span className="font-medium tabular-nums">{Number(d.slice(8))}</span>
                      {s.marked > 0 && <span className="text-[9px] tabular-nums text-muted-foreground">{s.marked}</span>}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              {monthEntries.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No attendance recorded for this filter.</div>
              ) : (
                monthEntries.map(e => (
                  <HistoryRow
                    key={e.id}
                    entry={e}
                    canEdit={canManageAttendance}
                    onEdit={() => {
                      const m = data.team.find(t => t.id === e.memberId);
                      if (m) openEdit(m, e.date);
                    }}
                  />
                ))
              )}
            </Card>
          </>
        ) : (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Month history is for Managers and Owners. You can check in and out on the Today tab.
          </Card>
        )
      )}

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.member.name} · ${fmtDate(editing.date)}` : 'Edit'}
        footer={
          <>
            <Button variant="danger" onClick={clearEntry}>Clear</Button>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="att-form" type="submit" variant="primary">Save</Button>
          </>
        }
      >
        <form id="att-form" onSubmit={saveEdit} className="space-y-3">
          <Field label="Status">
            <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as AttendanceStatus })}>
              {ATTENDANCE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </Field>
          {form.status !== 'absent' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Check in">
                <Input type="time" value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} />
              </Field>
              <Field label="Check out">
                <Input type="time" value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} />
              </Field>
            </div>
          )}
          <Field label="Note">
            <Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Optional" maxLength={200} />
          </Field>
        </form>
      </Sheet>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: 'green' | 'amber' | 'red' }) {
  return (
    <Card className="p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn(
        'text-xl font-semibold tabular-nums mt-0.5',
        tone === 'green' && 'text-green',
        tone === 'amber' && 'text-amber',
        tone === 'red' && 'text-red',
      )}>{value}</p>
    </Card>
  );
}

function HistoryRow({ entry, canEdit, onEdit }: { entry: AttendanceEntry; canEdit: boolean; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
      <Avatar name={entry.memberName} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{entry.memberName}</p>
        <p className="text-[11px] text-muted-foreground">
          {fmtDate(entry.date, { day: 'numeric', month: 'short', weekday: 'short' })}
          {entry.checkIn ? ` · in ${formatTime(entry.checkIn)}` : ''}
          {entry.checkOut ? ` · out ${formatTime(entry.checkOut)}` : ''}
        </p>
      </div>
      <Badge tone={statusTone(entry.status)}>{STATUS_LABEL[entry.status]}</Badge>
      {canEdit && (
        <button type="button" aria-label="Edit" onClick={onEdit} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
