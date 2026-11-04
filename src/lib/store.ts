'use client';

export type Health = 'green' | 'amber' | 'red';
export type Role = 'owner' | 'manager' | 'team';

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
  payments?: Payment[];
  expenses?: Expense[];
  activity?: Activity[];
}

export interface Task {
  id: string;
  clientId?: string;
  title: string;
  assignee: string;
  priority: 'P1' | 'P2' | 'P3';
  due: string;
  status: 'todo' | 'in-progress' | 'waiting' | 'done';
  createdAt: string;
}

export interface RequestItem {
  id: string;
  clientId: string;
  body: string;
  channel: 'call' | 'whatsapp' | 'meeting' | 'other';
  receivedAt: string;
  loggedBy: string;
  status: 'new' | 'triaged' | 'in-progress' | 'done';
  priority?: 'P1' | 'P2' | 'P3';
  assignee?: string;
  due?: string;
}

export interface ContentItem {
  id: string;
  clientId: string;
  title: string;
  stage: 'idea' | 'planned' | 'shot' | 'editing' | 'ready' | 'approved' | 'scheduled' | 'posted';
  assignee: string;
  due?: string;
  createdAt: string;
}

const KEY = 'orbit-ops-data-v2';

const seed = () => ({
  clients: [
    { id: '1', name: 'Mahindra Dhruvtara', status: 'Active' as const, package: '12 videos / month', videosPromised: 12, videosPosted: 7, lastActivityAt: new Date(Date.now() - 2 * 86400000).toISOString(), health: 'amber' as Health, owner: 'Ram Soni', industry: 'Automotive', city: 'Orai', notes: 'Highest-rated dealership. 4.9 stars from 4000+ reviews.', onboardedOn: '2024-06-15', monthlyFee: 25000 },
    { id: '2', name: 'Royal Enfield Dhruv Tara', status: 'Active' as const, package: '8 videos / month', videosPromised: 8, videosPosted: 6, lastActivityAt: new Date(Date.now() - 3 * 86400000).toISOString(), health: 'green' as Health, owner: 'Shahil', industry: 'Automotive', city: 'Orai', notes: 'Launch coverage and delivery videos.', onboardedOn: '2024-08-01', monthlyFee: 18000 },
    { id: '3', name: 'Sattya Suzuki', status: 'Active' as const, package: '8 videos / month', videosPromised: 8, videosPosted: 4, lastActivityAt: new Date(Date.now() - 4 * 86400000).toISOString(), health: 'green' as Health, owner: 'Ram Soni', industry: 'Automotive', city: 'Orai', notes: 'Access 125 campaign and scooter launches.', onboardedOn: '2024-09-10', monthlyFee: 15000 },
    { id: '4', name: 'Hindustan Motors', status: 'Onboarding' as const, package: '8 videos / month', videosPromised: 8, videosPosted: 0, lastActivityAt: new Date().toISOString(), health: 'green' as Health, owner: 'Ram Soni', industry: 'Automotive', city: 'Konch', notes: 'E-rickshaw dealer. First shoot scheduled.', onboardedOn: '2026-10-28', monthlyFee: 12000 },
    { id: '5', name: 'Sparkle Makeover', status: 'Active' as const, package: '8 videos / month', videosPromised: 8, videosPosted: 5, lastActivityAt: new Date(Date.now() - 1 * 86400000).toISOString(), health: 'green' as Health, owner: 'Tanvi', industry: 'Beauty', city: 'Orai', notes: 'Largest beauty account in Orai. 18k+ Instagram followers.', onboardedOn: '2024-03-10', monthlyFee: 20000 },
    { id: '6', name: 'Blush & Blu', status: 'Active' as const, package: '8 videos / month', videosPromised: 8, videosPosted: 3, lastActivityAt: new Date(Date.now() - 6 * 86400000).toISOString(), health: 'amber' as Health, owner: 'Tanvi', industry: 'Beauty', city: 'Orai', notes: 'Bridal makeup, hair, nails. ~3000 followers.', onboardedOn: '2025-01-15', monthlyFee: 15000 },
    { id: '7', name: 'Kidzee Orai', status: 'Active' as const, package: '8 videos / month', videosPromised: 8, videosPosted: 3, lastActivityAt: new Date(Date.now() - 4 * 86400000).toISOString(), health: 'amber' as Health, owner: 'Tanvi', industry: 'Education', city: 'Orai', notes: 'Admissions campaign seasonal.', onboardedOn: '2025-02-14', monthlyFee: 12000 },
    { id: '8', name: 'Jagannath Modular', status: 'Active' as const, package: '12 videos / month', videosPromised: 12, videosPosted: 5, lastActivityAt: new Date(Date.now() - 3 * 86400000).toISOString(), health: 'green' as Health, owner: 'Shahil', industry: 'Interiors', city: 'Orai', notes: 'Modular kitchen, wardrobe, doors. High-value enquiries.', onboardedOn: '2024-11-20', monthlyFee: 22000 },
    { id: '9', name: 'Havells Galaxy', status: 'Active' as const, package: '12 videos / month', videosPromised: 12, videosPosted: 4, lastActivityAt: new Date(Date.now() - 5 * 86400000).toISOString(), health: 'red' as Health, owner: 'Vikas Rathore', industry: 'Electricals', city: 'Orai', notes: 'Purwar Electricals. Building Google reviews.', onboardedOn: '2025-01-20', monthlyFee: 18000 },
    { id: '10', name: 'The Taj Band', status: 'Active' as const, package: '8 videos / month', videosPromised: 8, videosPosted: 2, lastActivityAt: new Date(Date.now() - 8 * 86400000).toISOString(), health: 'red' as Health, owner: 'Shahil', industry: 'Events', city: 'Orai', notes: 'Wedding band. Seasonal bookings.', onboardedOn: '2025-04-05', monthlyFee: 10000 },
    { id: '11', name: 'SHIDS Design', status: 'Active' as const, package: '8 videos / month', videosPromised: 8, videosPosted: 4, lastActivityAt: new Date(Date.now() - 2 * 86400000).toISOString(), health: 'green' as Health, owner: 'Tanvi', industry: 'Design', city: 'Orai', notes: 'Design studio. Meta management.', onboardedOn: '2025-03-01', monthlyFee: 15000 },
  ] as Client[],
  tasks: [] as Task[],
  requests: [] as RequestItem[],
  content: [] as ContentItem[],
});

export function loadData() {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
    return JSON.parse(raw);
  } catch { return seed(); }
}

export function saveData(data: ReturnType<typeof seed>) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function touchClient(clientId: string) {
  const data = loadData();
  const c = data.clients.find((x: Client) => x.id === clientId);
  if (c) {
    c.lastActivityAt = new Date().toISOString();
    const days = (Date.now() - new Date(c.lastActivityAt).getTime()) / 86400000;
    if (days >= 7 || c.videosPosted < c.videosPromised * 0.4) c.health = 'red';
    else if (days >= 4) c.health = 'amber';
    else c.health = 'green';
    saveData(data);
  }
}
