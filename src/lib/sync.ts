'use client';

import { useSyncExternalStore } from 'react';
import type { AppData } from './store';
import { state } from './store-cache';

const KEY_ACCESS = 'orbit-ops-access-key';
const PENDING_MONEY = 'orbit-ops-money-pending';

export type CloudMode = 'unknown' | 'local' | 'locked' | 'remote';

type StateResponse = {
  mode: 'local' | 'remote';
  empty?: boolean;
  owner?: boolean;
  paymentsRejected?: boolean;
  data?: AppData;
  error?: string;
};

type CloudSnap = { mode: CloudMode; migrate: boolean };

type CloudCtrl = {
  mode: CloudMode;
  migrateOffer: boolean;
  /** Empty database: do not upload until this browser explicitly saves. */
  holdPush: boolean;
  problem: '' | 'unreachable';
  listeners: Set<() => void>;
  snap: CloudSnap;
  timer?: ReturnType<typeof setTimeout>;
  latest: AppData | null;
  pushing: boolean;
  focused: boolean;
};

const cloud: CloudCtrl = ((globalThis as unknown as { __orbitCloud?: CloudCtrl }).__orbitCloud ??= {
  mode: 'unknown',
  migrateOffer: false,
  holdPush: false,
  problem: '',
  listeners: new Set(),
  snap: { mode: 'unknown', migrate: false },
  latest: null,
  pushing: false,
  focused: false,
});
cloud.problem ??= '';

function emit() {
  cloud.snap = { mode: cloud.mode, migrate: cloud.migrateOffer };
  for (const l of cloud.listeners) l();
}

export function cloudMode() { return cloud.mode; }
export function cloudMigrateOffer() { return cloud.migrateOffer; }
export function cloudSnapshot() { return cloud.snap; }
export function cloudProblem() { return cloud.problem; }

const SERVER_SNAP: CloudSnap = { mode: 'unknown', migrate: false };

export function useCloud() {
  return useSyncExternalStore(subscribeCloud, cloudSnapshot, () => SERVER_SNAP);
}

export function subscribeCloud(cb: () => void) {
  cloud.listeners.add(cb);
  return () => cloud.listeners.delete(cb);
}

function accessKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(KEY_ACCESS) || '';
}

function headers(pin = state.ownerPin) {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  const key = accessKey();
  if (key) h['x-orbit-key'] = key;
  if (pin) h['x-owner-pin'] = pin;
  return h;
}

async function request(method: 'GET' | 'PUT', body?: AppData, pin = state.ownerPin): Promise<StateResponse | null> {
  const res = await fetch('/api/state', { method, headers: headers(pin), body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  if (res.status === 401) return { mode: 'remote' };
  if (res.status === 500) return { mode: 'remote', error: 'database' };
  if (!res.ok && res.status !== 409) return null;
  return res.json() as Promise<StateResponse>;
}

function apply(data: AppData) {
  state.applyRemote?.(data);
}

function rememberPending(data: AppData) {
  const money: Record<string, { payments?: AppData['clients'][number]['payments']; expenses?: AppData['clients'][number]['expenses'] }> = {};
  for (const c of data.clients) {
    if (c.payments?.length || c.expenses?.length) money[c.id] = { payments: c.payments, expenses: c.expenses };
  }
  if (Object.keys(money).length) localStorage.setItem(PENDING_MONEY, JSON.stringify(money));
}

function attachPending(data: AppData): AppData {
  if (!state.ownerPin && !data.settings.ownerPin) return data;
  const raw = localStorage.getItem(PENDING_MONEY);
  if (!raw) return data;
  try {
    const money = JSON.parse(raw) as Record<string, { payments?: AppData['clients'][number]['payments']; expenses?: AppData['clients'][number]['expenses'] }>;
    return {
      ...data,
      clients: data.clients.map(c => money[c.id] ? { ...c, payments: money[c.id].payments, expenses: money[c.id].expenses } : c),
    };
  } catch {
    return data;
  }
}

/** Called after every local save. Pushes when this browser is connected. */
export function noteLocalSave(data: AppData) {
  if (!state.remote || state.applyingRemote || cloud.holdPush) return;
  cloud.latest = data;
  clearTimeout(cloud.timer);
  cloud.timer = setTimeout(() => { void flush(); }, 300);
}

async function flush() {
  if (cloud.pushing || !cloud.latest || !state.remote || cloud.holdPush) return;
  const data = cloud.latest;
  cloud.latest = null;
  cloud.pushing = true;
  try {
    const sending = attachPending(data);
    const res = await request('PUT', sending);
    if (!res || res.mode !== 'remote' || !res.data) return;
    if (sending.settings.ownerPin && res.owner) state.ownerPin = sending.settings.ownerPin;
    if (res.owner) localStorage.removeItem(PENDING_MONEY);
    if (res.paymentsRejected) { rememberPending(sending); cloud.migrateOffer = true; }
    else cloud.migrateOffer = false;
    if (cloud.latest) return;
    apply(res.data);
  } finally {
    cloud.pushing = false;
    if (cloud.latest && !cloud.holdPush) void flush();
  }
  emit();
}

export async function connectCloud() {
  let res: StateResponse | null;
  try { res = await request('GET'); } catch { cloud.mode = 'local'; cloud.problem = ''; emit(); return; }
  if (res?.error === 'database') { state.remote = false; cloud.mode = 'locked'; cloud.problem = 'unreachable'; emit(); return; }
  cloud.problem = '';
  if (!res || res.mode === 'local') { state.remote = false; cloud.holdPush = false; cloud.mode = 'local'; emit(); return; }
  if (!res.data) { state.remote = false; cloud.mode = 'locked'; emit(); return; }
  state.remote = true;
  cloud.mode = 'remote';
  if (res.empty) {
    cloud.holdPush = true;
    cloud.migrateOffer = state.preexisting;
  } else if (res.data) {
    cloud.holdPush = false;
    cloud.migrateOffer = !!localStorage.getItem(PENDING_MONEY);
    apply(res.data);
  }
  if (!cloud.focused && typeof window !== 'undefined') {
    cloud.focused = true;
    window.addEventListener('focus', () => {
      if (cloud.mode === 'remote' && !cloud.holdPush) void connectCloud();
    });
  }
  emit();
}

export async function saveAccessKey(key: string) {
  localStorage.setItem(KEY_ACCESS, key.trim());
  await connectCloud();
  if (cloud.problem) return 'unreachable' as const;
  return cloud.mode === 'remote' ? 'ok' as const : 'refused' as const;
}

export function forgetAccessKey() {
  localStorage.removeItem(KEY_ACCESS);
  state.remote = false;
  state.ownerPin = '';
  cloud.mode = 'locked';
  emit();
}

/** Check the Owner PIN with the server and load payments into this tab. */
export async function unlockOwner(pin: string) {
  const res = await request('GET', undefined, pin.trim());
  if (!res?.owner || !res.data) return false;
  state.ownerPin = pin.trim();
  apply(res.data);
  emit();
  return true;
}

export function lockOwner() {
  state.ownerPin = '';
  if (state.remote) void connectCloud();
}

/** Upload whatever this browser currently holds. */
export async function migrateBrowser() {
  const data = state.cache;
  if (!data) return 'empty' as const;
  cloud.latest = null;
  const sending = attachPending(data);
  const res = await request('PUT', sending);
  if (!res || res.mode !== 'remote' || !res.data) return 'failed' as const;
  if (sending.settings.ownerPin && res.owner) state.ownerPin = sending.settings.ownerPin;
  if (res.owner) localStorage.removeItem(PENDING_MONEY);
  if (res.paymentsRejected) rememberPending(sending);
  cloud.holdPush = false;
  apply(res.data);
  cloud.migrateOffer = !!res.paymentsRejected;
  emit();
  return res.paymentsRejected ? 'payments-kept' as const : 'ok' as const;
}

state.onSave = noteLocalSave;
