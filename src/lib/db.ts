import { neon } from '@neondatabase/serverless';
import type { Doc, MoneyMap } from './privacy';

export function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || '';
}

export function accessKey() {
  return process.env.ORBIT_ACCESS_KEY?.trim() || '';
}

/** Both values have to be set before any record is readable. */
export function remoteConfigured() {
  return databaseUrl() !== '' && accessKey() !== '';
}

type Sql = ReturnType<typeof neon>;
let client: Sql | null = null;

function sql() {
  if (!databaseUrl()) throw new Error('DATABASE_URL is not set');
  client ??= neon(databaseUrl());
  return client;
}

let ready: Promise<void> | null = null;

export function ensureSchema() {
  if (!ready) {
    ready = sql()`
      create table if not exists orbit_state (
        id integer primary key check (id = 1),
        doc jsonb not null,
        money jsonb not null default '{}'::jsonb,
        pin_hash text,
        updated_at timestamptz not null default now()
      )
    `.then(() => undefined).catch((err: unknown) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

export type Row = { doc: Doc; money: MoneyMap; pin_hash: string | null; updated_at: string };

export async function readState(): Promise<Row | null> {
  await ensureSchema();
  const rows = await sql()`select doc, money, pin_hash, updated_at from orbit_state where id = 1` as Row[];
  return rows[0] ?? null;
}

export async function writeState(doc: Doc, money: MoneyMap, pinHash: string | null) {
  await ensureSchema();
  await sql()`
    insert into orbit_state (id, doc, money, pin_hash)
    values (1, ${JSON.stringify(doc)}::jsonb, ${JSON.stringify(money)}::jsonb, ${pinHash})
    on conflict (id) do update set
      doc = excluded.doc,
      money = excluded.money,
      pin_hash = excluded.pin_hash,
      updated_at = now()
  `;
}
