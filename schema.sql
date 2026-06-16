create table profiles (
    id uuid references auth.users on delete cascade primary key,
    username text unique not null,
    coins integer default 100 not null check (coins >= 0),
    created_at timestamp with time zone default now() not null
);

create table islands (
    id uuid default gen_random_uuid() primary key,
    owner_id uuid references profiles(id) on delete cascade not null unique,
    x integer not null check (x >= 0 and x < 30),
    y integer not null check ( y >= 0 and y < 30),
    name text default 'Insula mea' not null,
    hearts_count integer default 0 not null,
    visits_count integer default 0 not null,
    created_at timestamp with time zone default now() not null,
    unique(x, y)
);

create table decorations (
    id uuid default gen_random_uuid() primary key,
    island_id uuid references islands(id) on delete cascade not null,
    emoji text not null,
    px real not null check (px >= 0 and px <= 1),
    py real not null check (py >= 0 and py <= 1),
    scale real default 1 not null,
    created_at timestamp with time zone default now() not null
);

create table hearts (
    user_id uuid references profiles(id) on delete cascade not null,
    island_id uuid references islands(id) on delete cascade not null,
    created_at timestamp with time zone default now() not null,
    primary key (user_id, island_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into profiles (id, username)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8))
    );
    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function spend_coins(amount integer)
returns void language plpgsql security definer as $$
declare
    uid uuid := auth.uid();
    cur integer;
begin
    if uid is null then raise exception 'not authenticated'; end if;
    select coins into cur from profiles where id = uid for update;
    if cur < amount then raise exception 'insufficient coins'; end if;
    update profiles set coins = coins - amount where id = uid;
end; $$;

create or replace function add_coins(amount integer)
returns void language plpgsql security definer as $$
begin
    if auth.uid() is null then raise exception 'not authenticated'; end if;
    update profiles set coins = coins + amount where id = auth.uid();
end; $$;

create or replace function increment_hearts(iid uuid)
returns void language sql security definer as $$
    update islands set hearts_count = hearts_count + 1 where id = iid;
$$;

create or replace function decrement_hearts(iid uuid)
returns void language sql security definer as $$
    update islands set hearts_count = greatest(0, hearts_count - 1) where id = iid;
$$;

alter table profiles enable row level security;
alter table islands enable row level security;
alter table decorations enable row level security;
alter table hearts enable row level security;

create policy "profiles_read_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

create policy "islands_read_all" on islands for select using (true);
create policy "islands_insert_own" on islands for insert with check (auth.uid() = owner_id);
create policy "islands_update_own" on islands for update using (auth.uid() = owner_id);
create policy "islands_delete_own" on islands for delete using (auth.uid() = owner_id);

create policy "decorations_read_all" on decorations for select using (true);
create policy "decorations_modify_own" on decorations for all using (
    exists (select 1 from islands where islands.id = island_id and islands.owner_id = auth.uid())
) with check (
    exists (select 1 from islands where islands.id = island_id and islands.owner_id = auth.uid())
);

create policy "hearts_read_all" on hearts for select using (true);
create policy "hearts_insert_own" on hearts for insert with check (auth.uid() = user_id);
create policy "hearts_delete_own" on hearts for delete using (auth.uid() = user_id);



