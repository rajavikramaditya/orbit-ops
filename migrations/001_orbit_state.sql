-- Applied automatically on the first request. Kept here so the shape is visible.
create table if not exists orbit_state (
  id integer primary key check (id = 1),
  doc jsonb not null,
  money jsonb not null default '{}'::jsonb,
  pin_hash text,
  updated_at timestamptz not null default now()
);
