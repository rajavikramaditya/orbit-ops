import { accessKey, readState, remoteConfigured, writePinGate, writeState, type Row } from '@/lib/db';
import { emptyDoc, isDoc, mergeDoc, publicDoc, withMoney, type Doc, type MoneyMap } from '@/lib/privacy';
import { hashPin, judgePin, secretsMatch, type PinGate } from '@/lib/pin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: Request) {
  const given = req.headers.get('x-orbit-key') || '';
  if (!given) return false;
  return secretsMatch(given, accessKey());
}

function presentedPin(req: Request) {
  return (req.headers.get('x-owner-pin') || '').trim();
}

function gateFor(row: Row | null, presented: string, now = Date.now()): PinGate {
  const until = row?.pin_locked_until;
  const lockedUntil = until ? (until instanceof Date ? until.toISOString() : String(until)) : null;
  return judgePin({
    presented,
    storedHash: row?.pin_hash ?? null,
    fails: Number(row?.pin_fails) || 0,
    lockedUntil,
    now,
  });
}

function sameInstant(a: string | null, b: string | null) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const left = Date.parse(a);
  const right = Date.parse(b);
  return Number.isFinite(left) && left === right;
}

async function rememberGate(row: Row | null, gate: PinGate) {
  if (!row) return;
  const until = row.pin_locked_until;
  const prevUntil = until ? (until instanceof Date ? until.toISOString() : String(until)) : null;
  if ((Number(row.pin_fails) || 0) === gate.fails && sameInstant(prevUntil, gate.lockedUntil)) return;
  await writePinGate(gate.fails, gate.lockedUntil);
}

export async function GET(req: Request) {
  if (!remoteConfigured()) return Response.json({ mode: 'local' as const });
  if (!authorized(req)) return Response.json({ mode: 'remote' as const }, { status: 401 });
  try {
    const row = await readState();
    if (!row) {
      return Response.json({ mode: 'remote' as const, empty: true, owner: false, data: emptyDoc() });
    }
    const presented = presentedPin(req);
    const gate = gateFor(row, presented);
    await rememberGate(row, gate);
    const hadPin = !!row.pin_hash;
    const doc = (row.doc || emptyDoc()) as Doc;
    const money = (row.money || {}) as MoneyMap;
    const data = gate.ok ? withMoney(publicDoc(doc, true), money) : publicDoc(doc, hadPin);
    if (presented && !gate.ok && gate.locked) {
      return Response.json({ mode: 'remote' as const, owner: false, pinLocked: true, data }, { status: 429 });
    }
    return Response.json({ mode: 'remote' as const, empty: false, owner: gate.ok, updatedAt: row.updated_at, paymentsRejected: false, data });
  } catch (err) {
    console.error('state read failed', err instanceof Error ? err.message : 'error');
    return Response.json({ error: 'database' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!remoteConfigured()) return Response.json({ mode: 'local' as const }, { status: 409 });
  if (!authorized(req)) return Response.json({ mode: 'remote' as const }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: 'invalid' }, { status: 400 }); }
  if (!isDoc(body)) return Response.json({ error: 'invalid' }, { status: 400 });
  try {
    const row = await readState();
    const stored = (row?.doc || emptyDoc()) as Doc;
    const storedMoney = (row?.money || {}) as MoneyMap;
    const presented = presentedPin(req);
    const hadPin = !!row?.pin_hash;
    const gate = gateFor(row, presented);
    const pinOk = gate.ok;
    const merged = mergeDoc(stored, storedMoney, hadPin, body, pinOk);
    const pinHash = merged.pinChanged && merged.nextPin ? hashPin(merged.nextPin) : (row?.pin_hash ?? null);
    const fails = merged.pinChanged ? 0 : gate.fails;
    const lockedUntil = merged.pinChanged ? null : gate.lockedUntil;
    await writeState(merged.doc, merged.money, pinHash, fails, lockedUntil);
    const owner = pinOk || merged.pinChanged;
    const data = owner ? withMoney(merged.doc, merged.money) : merged.doc;
    if (presented && !pinOk && gate.locked) {
      return Response.json({ mode: 'remote' as const, owner: false, pinLocked: true, paymentsRejected: merged.paymentsRejected, data }, { status: 429 });
    }
    return Response.json({ mode: 'remote' as const, empty: false, owner, paymentsRejected: merged.paymentsRejected, data });
  } catch (err) {
    console.error('state write failed', err instanceof Error ? err.message : 'error');
    return Response.json({ error: 'database' }, { status: 500 });
  }
}
