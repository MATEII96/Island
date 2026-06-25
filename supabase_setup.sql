
create table if not exists world (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);


alter table world enable row level security;

drop policy if exists "world read"   on world;
drop policy if exists "world insert" on world;
drop policy if exists "world update" on world;

create policy "world read"   on world for select using (true);
create policy "world insert" on world for insert with check (true);
create policy "world update" on world for update using (true) with check (true);

-- Seed the empty ocean.
insert into world (id, data)
values ('main', '{"profiles":{},"islands":[],"decorations":{},"hearts":{}}'::jsonb)
on conflict (id) do nothing;
