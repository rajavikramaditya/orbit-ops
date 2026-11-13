import { accessKey, readState, remoteConfigured, writeState } from '@/lib/db';
import { emptyDoc, isDoc, mergeDoc, publicDoc, withMoney, type Doc, type MoneyMap } from '@/lib/privacy';
import { hashPin, pinMatches, secretsMatch } from '@/lib/pin';

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

export async function GET(req: Request) {
  if (!remoteConfigured()) return Response.json({ mode: 'local' as const });
  if (!authorized(req)) return Response.json({ mode: 'remote' as const }, { status: 401 });
  try {
    const row = await readState();
    if (!row) {
      return Response.json({ mode: 'remote' as const, empty: true, owner: false, data: emptyDoc() });
    }
    const hadPin = !!row.pin_hash;
    const owner = hadPin && pinMatches(presentedPin(req), row.pin_hash);
    const doc = (row.doc || emptyDoc()) as Doc;
    const money = (row.money || {}) as MoneyMap;
    const data = owner ? withMoney(publicDoc(doc, true), money) : publicDoc(doc, hadPin);
    return Response.json({ mode: 'remote' as const, empty: false, owner, updatedAt: row.updated_at, paymentsRejected: false, data });
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
    const hadPin = !!row?.pin_hash;
    const pinOk = hadPin && pinMatches(presentedPin(req), row?.pin_hash ?? null);
    const merged = mergeDoc(stored, storedMoney, hadPin, body, pinOk);
    const pinHash = merged.pinChanged && merged.nextPin ? hashPin(merged.nextPin) : (row?.pin_hash ?? null);
    await writeState(merged.doc, merged.money, pinHash);
    const owner = pinOk || merged.pinChanged;
    const data = owner ? withMoney(merged.doc, merged.money) : merged.doc;
    return Response.json({ mode: 'remote' as const, empty: false, owner, paymentsRejected: merged.paymentsRejected, data });
  } catch (err) {
    console.error('state write failed', err instanceof Error ? err.message : 'error');
    return Response.json({ error: 'database' }, { status: 500 });
  }
}
