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
  settings: { companyName: 'Orbit Media by Orbitcore', currency: 'INR' },
});

// Server render and first client paint share this so hydration matches.
const EMPTY: AppData = { version: 3, clients: [], tasks: [], requests: [], content: [], team: [], settings: { companyName: 'Orbit Media by Orbitcore', currency: 'INR' } };

// ---------- Health & cycle ----------

export const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

export function monthProgress(d = new Date()) {
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return { day: d.getDate(), daysInMonth: dim, fraction: d.getDate() / dim };
}

/** Videos that should be posted by today if delivery were evenly paced. */
export function expectedByNow(promised: number) {
  return Math.round(promised * monthProgress().fraction);
}

export function computeHealth(c: Client): Health {
  if (c.status === 'Churned') return 'green';
  const quiet = daysSince(c.lastActivityAt);
  if (c.status === 'Paused' || c.status === 'Onboarding') return quiet >= 10 ? 'amber' : 'green';
  const { day } = monthProgress();
  const expected = expectedByNow(c.videosPromised);
  const gap = expected - c.videosPosted;
  if (quiet >= 7) return 'red';
  if (day > 7 && gap >= Math.max(3, c.videosPromised * 0.3)) return 'red';
  if (quiet >= 4 || gap >= 2) return 'amber';
  return 'green';
}

export const healthLabel = (h: Health) => (h === 'red' ? 'At risk' : h === 'amber' ? 'Watch' : 'On track');

function rolloverCycles(data: AppData): boolean {
  const month = currentMonth();
  let changed = false;
  for (const c of data.clients) {
    if (!c.cycleMonth) {
      c.cycleMonth = month;
      changed = true;
      continue;
    }
    if (c.cycleMonth !== month) {
      if (c.status !== 'Churned') {
        c.history = [{ month: c.cycleMonth, posted: c.videosPosted, promised: c.videosPromised }, ...(c.history || [])].slice(0, 24);
        c.activity = [{ id: uid(), clientId: c.id, text: `New cycle started · ${monthLabel(month)} (last month ${c.videosPosted}/${c.videosPromised})`, at: new Date().toISOString() }, ...(c.activity || [])];
      }
      c.videosPosted = 0;
      c.cycleMonth = month;
      changed = true;
    }
  }
  return changed;
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// ---------- Persistence ----------

let cache: AppData | null = null;
const listeners = new Set<() => void>();

function migrate(raw: unknown): AppData {
  const s = seed();
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppData>;
  const data: AppData = {
    version: 3,
    clients: Array.isArray(d.clients) ? d.clients : s.clients,
    tasks: Array.isArray(d.tasks) ? d.tasks : [],
    requests: Array.isArray(d.requests) ? d.requests : [],
    content: Array.isArray(d.content) ? d.content : [],
    team: Array.isArray(d.team) && d.team.length ? d.team : s.team,
    settings: { ...s.settings, ...(d.settings || {}) },
  };
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
  let data: AppData;
  try {
    const raw = localStorage.getItem(KEY);
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
  if (rolled || healthChanged || !localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(data));
  return data;
}

function emit() {
  for (const l of listeners) l();
}

export function loadData(): AppData {
  if (typeof window === 'undefined') return EMPTY;
  if (!cache) cache = read();
  return cache;
}

export function saveData(data: AppData) {
  cache = { ...data };
  localStorage.setItem(KEY, JSON.stringify(cache));
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
  const migrated = migrate(data);
  localStorage.setItem(KEY, JSON.stringify(migrated));
  cache = null;
  cache = read();
  emit();
}

export function resetToSeed() {
  localStorage.removeItem(KEY);
  cache = null;
  cache = read();
  emit();
}

export function exportJSON(): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: 'orbit-ops', ...loadData() }, null, 2);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) { cache = null; cb(); }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
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
