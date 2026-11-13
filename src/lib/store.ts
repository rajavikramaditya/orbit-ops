'use client';

import { useSyncExternalStore } from 'react';

export type Health = 'green' | 'amber' | 'red';
export type Role = 'owner' | 'manager' | 'team';
export type Priority = 'P1' | 'P2' | 'P3';

export interface Payment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Expense {
  id: string;
  amount: number;
  date: string;
  category: string;
  note?: string;
}

export interface Activity {
  id: string;
  clientId: string;
  text: string;
  at: string;
}

export interface CycleRecord {
  month: string; // YYYY-MM
  posted: number;
  promised: number;
}

export interface Client {
  id: string;
  name: string;
  status: 'Onboarding' | 'Active' | 'Paused' | 'Churned';
  package: string;
  videosPromised: number;
  videosPosted: number;
  lastActivityAt: string;
  health: Health;
  owner: string;
  industry: string;
  city: string;
  notes: string;
  onboardedOn: string;
  logo?: string;
  monthlyFee?: number;
  contactName?: string;
  phone?: string;
  instagram?: string;
  cycleMonth?: string;
  /** Day of the month (1–28) this client's delivery cycle starts. Pendency is counted from here, not from the 1st. */
  cycleStartDay?: number;
  history?: CycleRecord[];
  payments?: Payment[];
  expenses?: Expense[];
  activity?: Activity[];
}

export interface Task {
  id: string;
  clientId?: string;
  title: string;
  assignee: string;
  priority: Priority;
  due: string;
  status: 'todo' | 'in-progress' | 'waiting' | 'done';
  createdAt: string;
  doneAt?: string;
  sourceRequestId?: string;
}

export interface RequestItem {
  id: string;
  clientId: string;
  body: string;
  channel: 'call' | 'whatsapp' | 'meeting' | 'other';
  receivedAt: string;
  loggedBy: string;
  status: 'new' | 'triaged' | 'in-progress' | 'done';
  priority?: Priority;
  assignee?: string;
  due?: string;
  linkedTaskId?: string;
  linkedContentId?: string;
}

export const STAGES = ['idea', 'planned', 'shot', 'editing', 'ready', 'approved', 'scheduled', 'posted'] as const;
export type Stage = (typeof STAGES)[number];

export interface ContentItem {
  id: string;
  clientId: string;
  title: string;
  stage: Stage;
  assignee: string;
  due?: string;
  createdAt: string;
  postedAt?: string;
  sourceRequestId?: string;
}

export type MemberRole = 'Owner' | 'Manager' | 'Editor' | 'Shooter' | 'Designer';

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  focus: string;
  phone?: string;
}

export interface Settings {
  companyName: string;
  ownerPin?: string;
  currency: string;
}

export interface AppData {
  version: 3;
  clients: Client[];
  tasks: Task[];
  requests: RequestItem[];
  content: ContentItem[];
  team: Member[];
  settings: Settings;
}

const KEY = 'orbit-ops-data-v2';
const LEGACY_KEYS: string[] = [];
const LEGACY_TEAM_KEY = 'orbit-ops-team';

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const today = () => new Date().toISOString().slice(0, 10);
export const currentMonth = () => today().slice(0, 7);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

const seedTeam = (): Member[] => [
  { id: 'm1', name: 'Vikram', role: 'Owner', focus: 'Strategy, clients, revenue' },
  { id: 'm2', name: 'Ram Soni', role: 'Manager', focus: 'Automotive clients' },
  { id: 'm3', name: 'Tanvi', role: 'Manager', focus: 'Beauty, education, design' },
  { id: 'm4', name: 'Shahil', role: 'Manager', focus: 'Automotive, events' },
  { id: 'm5', name: 'Vikas Rathore', role: 'Manager', focus: 'Electricals' },
  { id: 'm6', name: 'Prathmes', role: 'Editor', focus: 'Editing, reels' },
];

const seed = (): AppData => ({
  version: 3,
  clients: [
    { id: '1', name: 'Mahindra Dhruvtara', status: 'Active', package: '12 videos / month', videosPromised: 12, videosPosted: 7, lastActivityAt: daysAgo(2), health: 'amber', owner: 'Ram Soni', industry: 'Automotive', city: 'Orai', notes: 'Highest-rated dealership. 4.9 stars from 4000+ reviews.', onboardedOn: '2024-06-15', monthlyFee: 25000 },
    { id: '2', name: 'Royal Enfield Dhruv Tara', status: 'Active', package: '8 videos / month', videosPromised: 8, videosPosted: 6, lastActivityAt: daysAgo(3), health: 'green', owner: 'Shahil', industry: 'Automotive', city: 'Orai', notes: 'Launch coverage and delivery videos.', onboardedOn: '2024-08-01', monthlyFee: 18000 },
    { id: '3', name: 'Sattya Suzuki', status: 'Active', package: '8 videos / month', videosPromised: 8, videosPosted: 4, lastActivityAt: daysAgo(4), health: 'green', owner: 'Ram Soni', industry: 'Automotive', city: 'Orai', notes: 'Access 125 campaign and scooter launches.', onboardedOn: '2024-09-10', monthlyFee: 15000 },
    { id: '4', name: 'Hindustan Motors', status: 'Onboarding', package: '8 videos / month', videosPromised: 8, videosPosted: 0, lastActivityAt: daysAgo(0), health: 'green', owner: 'Ram Soni', industry: 'Automotive', city: 'Konch', notes: 'E-rickshaw dealer. First shoot scheduled.', onboardedOn: '2026-10-28', monthlyFee: 12000 },
    { id: '5', name: 'Sparkle Makeover', status: 'Active', package: '8 videos / month', videosPromised: 8, videosPosted: 5, lastActivityAt: daysAgo(1), health: 'green', owner: 'Tanvi', industry: 'Beauty', city: 'Orai', notes: 'Largest beauty account in Orai. 18k+ Instagram followers.', onboardedOn: '2024-03-10', monthlyFee: 20000 },
    { id: '6', name: 'Blush & Blu', status: 'Active', package: '8 videos / month', videosPromised: 8, videosPosted: 3, lastActivityAt: daysAgo(6), health: 'amber', owner: 'Tanvi', industry: 'Beauty', city: 'Orai', notes: 'Bridal makeup, hair, nails. ~3000 followers.', onboardedOn: '2025-01-15', monthlyFee: 15000 },
    { id: '7', name: 'Kidzee Orai', status: 'Active', package: '8 videos / month', videosPromised: 8, videosPosted: 3, lastActivityAt: daysAgo(4), health: 'amber', owner: 'Tanvi', industry: 'Education', city: 'Orai', notes: 'Admissions campaign seasonal.', onboardedOn: '2025-02-14', monthlyFee: 12000 },
    { id: '8', name: 'Jagannath Modular', status: 'Active', package: '12 videos / month', videosPromised: 12, videosPosted: 5, lastActivityAt: daysAgo(3), health: 'green', owner: 'Shahil', industry: 'Interiors', city: 'Orai', notes: 'Modular kitchen, wardrobe, doors. High-value enquiries.', onboardedOn: '2024-11-20', monthlyFee: 22000 },
    { id: '9', name: 'Havells Galaxy', status: 'Active', package: '12 videos / month', videosPromised: 12, videosPosted: 4, lastActivityAt: daysAgo(5), health: 'red', owner: 'Vikas Rathore', industry: 'Electricals', city: 'Orai', notes: 'Purwar Electricals. Building Google reviews.', onboardedOn: '2025-01-20', monthlyFee: 18000 },
    { id: '10', name: 'The Taj Band', status: 'Active', package: '8 videos / month', videosPromised: 8, videosPosted: 2, lastActivityAt: daysAgo(8), health: 'red', owner: 'Shahil', industry: 'Events', city: 'Orai', notes: 'Wedding band. Seasonal bookings.', onboardedOn: '2025-04-05', monthlyFee: 10000 },
    { id: '11', name: 'SHIDS Design', status: 'Active', package: '8 videos / month', videosPromised: 8, videosPosted: 4, lastActivityAt: daysAgo(2), health: 'green', owner: 'Tanvi', industry: 'Design', city: 'Orai', notes: 'Design studio. Meta management.', onboardedOn: '2025-03-01', monthlyFee: 15000 },
  ],
  tasks: [],
  requests: [],
  content: [],
  team: seedTeam(),
  settings: { companyName: 'Orbit Ops', currency: 'INR' },
});

// Server render and first client paint share this so hydration matches.
const EMPTY: AppData = { version: 3, clients: [], tasks: [], requests: [], content: [], team: [], settings: { companyName: 'Orbit Ops', currency: 'INR' } };

// ---------- Health & cycle ----------

export const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

/** 1–28. Day 29–31 would skip February, so the cycle day never goes past 28. */
export function clampCycleDay(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.min(28, Math.max(1, Math.round(n)));
}

/** The day this client's month begins. Falls back to the onboarded day, then the 1st. */
export function cycleStartDayOf(c: Pick<Client, 'cycleStartDay' | 'onboardedOn'>): number {
  if (c.cycleStartDay) return clampCycleDay(c.cycleStartDay);
  const fromOnboard = Number((c.onboardedOn || '').slice(8, 10));
  return clampCycleDay(fromOnboard || 1);
}

export type CycleWindow = {
  /** YYYY-MM-DD the current cycle opened. */
  key: string;
  start: Date;
  end: Date;
  /** 1-based day inside the cycle. */
  day: number;
  length: number;
  fraction: number;
};

function localDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** The client's current delivery window, opening on `startDay` rather than the 1st. */
export function clientCycle(startDay: number, now = new Date()): CycleWindow {
  const day = clampCycleDay(startDay);
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = now.getDate() >= day ? new Date(y, m, day) : new Date(y, m - 1, day);
  const next = new Date(start.getFullYear(), start.getMonth() + 1, day);
  const end = new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1);
  const length = Math.round((next.getTime() - start.getTime()) / 86400000);
  const elapsed = Math.floor((new Date(y, m, now.getDate()).getTime() - new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) / 86400000) + 1;
  const dayIndex = Math.min(Math.max(elapsed, 1), length);
  return {
    key: localDate(start.getFullYear(), start.getMonth(), start.getDate()),
    start,
    end,
    day: dayIndex,
    length,
    fraction: dayIndex / length,
  };
}

export function formatDay(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export type Pendency = {
  cycle: CycleWindow;
  /** Videos that should already be posted if delivery were even across this cycle. */
  expected: number;
  /** Positive when behind that pace, negative when ahead. */
  gap: number;
  /** Videos still owed before the cycle ends. */
  remaining: number;
  daysLeft: number;
};

export function pendency(c: Pick<Client, 'cycleStartDay' | 'onboardedOn' | 'videosPromised' | 'videosPosted'>, now = new Date()): Pendency {
  const cycle = clientCycle(cycleStartDayOf(c), now);
  const expected = Math.round(c.videosPromised * cycle.fraction);
  return {
    cycle,
    expected,
    gap: expected - c.videosPosted,
    remaining: Math.max(0, c.videosPromised - c.videosPosted),
    daysLeft: Math.max(0, cycle.length - cycle.day),
  };
}

/** Videos that should be posted by today if delivery were evenly paced across the client's cycle. */
export function expectedByNow(c: Pick<Client, 'cycleStartDay' | 'onboardedOn' | 'videosPromised' | 'videosPosted'>, now = new Date()) {
  return pendency(c, now).expected;
}

export function computeHealth(c: Client, now = new Date()): Health {
  if (c.status === 'Churned') return 'green';
  const quiet = daysSince(c.lastActivityAt);
  if (c.status === 'Paused' || c.status === 'Onboarding') return quiet >= 10 ? 'amber' : 'green';
  const { cycle, gap } = pendency(c, now);
  if (quiet >= 7) return 'red';
  if (cycle.day > 7 && gap >= Math.max(3, c.videosPromised * 0.3)) return 'red';
  if (quiet >= 4 || gap >= 2) return 'amber';
  return 'green';
}

export const healthLabel = (h: Health) => (h === 'red' ? 'At risk' : h === 'amber' ? 'Watch' : 'On track');

function rolloverCycles(data: AppData): boolean {
  let changed = false;
  for (const c of data.clients) {
    const cycle = clientCycle(cycleStartDayOf(c));
    const stored = c.cycleMonth;
    // Missing, or the old calendar key (YYYY-MM): adopt the current cycle and keep the count.
    if (!stored || /^\d{4}-\d{2}$/.test(stored)) {
      c.cycleMonth = cycle.key;
      changed = true;
      continue;
    }
    if (stored === cycle.key) continue;
    // A stored start earlier than this cycle means that cycle has closed.
    // A later start means the day was edited; keep the videos already posted.
    if (stored < cycle.key) {
      if (c.status !== 'Churned') {
        c.history = [{ month: stored, posted: c.videosPosted, promised: c.videosPromised }, ...(c.history || [])].slice(0, 24);
        c.activity = [{ id: uid(), clientId: c.id, text: `New cycle started · ${formatDay(cycle.start)} (last cycle ${c.videosPosted}/${c.videosPromised})`, at: new Date().toISOString() }, ...(c.activity || [])];
      }
      c.videosPosted = 0;
    }
    c.cycleMonth = cycle.key;
    changed = true;
  }
  return changed;
}

export function monthLabel(ym: string) {
  const [y, m, d] = ym.split('-').map(Number);
  if (d) return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// ---------- Persistence ----------

import { KEY as STORE_KEY, state } from './store-cache';

if (STORE_KEY !== KEY) throw new Error('store key mismatch');

function migrate(raw: unknown): AppData {
  const s = seed();
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppData>;
  // A stored document always wins, even when a list is empty. Falling back to
  // the seed on a missing key only — an empty array is real user data.
  const list = <T,>(value: unknown, fallback: T[]): T[] => (Array.isArray(value) ? value as T[] : fallback);
  const data: AppData = {
    version: 3,
    clients: list<Client>(d.clients, s.clients).map(c => ({ ...c, cycleStartDay: cycleStartDayOf(c) })),
    tasks: list<Task>(d.tasks, []).map(t => ({ ...t })),
    requests: list<RequestItem>(d.requests, []).map(r => ({ ...r })),
    content: list<ContentItem>(d.content, []).map(c => ({ ...c })),
    team: list<Member>(d.team, s.team).map(m => ({ ...m })),
    settings: { ...s.settings, ...(d.settings || {}) },
  };
  if (!data.settings.companyName || data.settings.companyName === 'Orbit Media by Orbitcore') {
    data.settings.companyName = 'Orbit Ops';
  }
  if (!Array.isArray(d.team)) {
    try {
      const legacy = localStorage.getItem(LEGACY_TEAM_KEY);
      if (legacy) {
        const members = JSON.parse(legacy) as Member[];
        if (Array.isArray(members) && members.length) data.team = members;
      }
    } catch {}
  }
  return data;
}

function read(): AppData {
  if (typeof window === 'undefined') return EMPTY;
  const seen = state.revision;
  let data: AppData;
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      for (const legacy of LEGACY_KEYS) {
        const old = localStorage.getItem(legacy);
        if (old) { raw = old; break; }
      }
    }
    data = raw ? migrate(JSON.parse(raw)) : seed();
  } catch {
    data = seed();
  }
  const rolled = rolloverCycles(data);
  let healthChanged = false;
  for (const c of data.clients) {
    const h = computeHealth(c);
    if (h !== c.health) { c.health = h; healthChanged = true; }
  }
  // A save that landed while we were normalising is newer than the snapshot this
  // read started from, so keep it and discard our derived copy.
  if (seen !== state.revision) return state.cache ?? data;
  if (rolled || healthChanged || !localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(data));
  state.epoch = state.revision;
  return data;
}

function emit() {
  for (const l of state.listeners) l();
}

export function loadData(): AppData {
  if (typeof window === 'undefined') return EMPTY;
  // A write through this page bumps the revision, so a cache that predates it is
  // rebuilt. Writes from another tab arrive through the `storage` listener.
  if (state.hydrated && state.epoch !== state.revision) state.cache = read();
  return state.cache ?? EMPTY;
}

/** First read for this document. Safe to call more than once. */
export function hydrate() {
  if (typeof window === 'undefined') return;
  state.hydrated = true;
  state.cache = null;
  state.cache = read();
  emit();
}

export function saveData(data: AppData) {
  state.cache = { ...data };
  localStorage.setItem(KEY, JSON.stringify(state.cache));
  state.epoch = state.revision;
  emit();
}

/** Mutate a fresh copy of the data and persist it. */
export function update(fn: (d: AppData) => void) {
  const data: AppData = JSON.parse(JSON.stringify(loadData()));
  fn(data);
  saveData(data);
  return data;
}

export function replaceAll(data: unknown) {
  saveData(migrate(data));
}

export function resetToSeed() {
  localStorage.removeItem(KEY);
  state.cache = read();
  emit();
}

export function exportJSON(): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: 'orbit-ops', ...loadData() }, null, 2);
}

function subscribe(cb: () => void) {
  state.listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) { state.cache = null; cb(); }
  };
  window.addEventListener('storage', onStorage);
  // bfcache restores keep the module cache but can show storage changed by
  // another page, so re-read whenever the page is shown again.
  const onShow = (e: PageTransitionEvent) => { if (e.persisted) { state.cache = null; cb(); } };
  window.addEventListener('pageshow', onShow);
  return () => {
    state.listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('pageshow', onShow);
  };
}

/** Subscribe a component to the whole dataset. Re-renders on any save, including from other tabs. */
export function useStore(): AppData {
  return useSyncExternalStore(subscribe, loadData, () => EMPTY);
}

// ---------- Domain helpers ----------

export function logActivity(data: AppData, clientId: string, text: string) {
  const c = data.clients.find(x => x.id === clientId);
  if (!c) return;
  c.activity = [{ id: uid(), clientId, text, at: new Date().toISOString() }, ...(c.activity || [])].slice(0, 100);
}

export function touch(data: AppData, clientId: string) {
  const c = data.clients.find(x => x.id === clientId);
  if (!c) return;
  c.lastActivityAt = new Date().toISOString();
  c.health = computeHealth(c);
}

/** Legacy convenience: mark a client active now and persist. */
export function touchClient(clientId: string) {
  update(d => touch(d, clientId));
}

export const sum = (xs: { amount: number }[] | undefined) => (xs || []).reduce((s, x) => s + x.amount, 0);

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const fmtDate = (iso: string | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  iso ? new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('en-IN', opts) : '—';

export const isOverdue = (due: string | undefined, status?: string) => !!due && status !== 'done' && due < today();

export function clientName(data: AppData, id: string | undefined) {
  return data.clients.find(c => c.id === id)?.name;
}
