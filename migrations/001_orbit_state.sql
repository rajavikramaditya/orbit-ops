-- Applied automatically on the first request. Kept here so the shape is visible.
create table if not exists orbit_state (
  id integer primary key check (id = 1),
  doc jsonb not null,
  money jsonb not null default '{}'::jsonb,
  pin_hash text,
  pin_fails integer not null default 0,
  pin_locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table orbit_state add column if not exists pin_fails integer not null default 0;
alter table orbit_state add column if not exists pin_locked_until timestamptz;
