-- Let's meet! — начальная схема.
-- Выполни в Supabase: SQL Editor -> New query -> вставь файл целиком -> Run.

create extension if not exists pgcrypto;

-- ───────────── Таблицы ─────────────

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  host_id       uuid not null references auth.users (id) on delete cascade,
  kind          text not null default 'Вечеринка',
  title         text not null check (char_length(title) between 1 and 120),
  description   text not null default '' check (char_length(description) <= 2000),
  starts_at     timestamptz not null,
  location_name text not null default '',
  address       text not null default '',
  lat           double precision,
  lng           double precision,
  dress_code    text[] not null default '{}',
  visibility    text not null default 'link' check (visibility in ('link', 'public')),
  cover_color   text not null default 'coral' check (cover_color in ('coral', 'sun', 'violet')),
  goal_title    text,
  goal_amount   integer check (goal_amount is null or goal_amount > 0),
  created_at    timestamptz not null default now()
);

create table public.rsvps (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  guest_key   uuid not null,
  guest_name  text not null check (char_length(guest_name) between 1 and 60),
  status      text not null check (status in ('yes', 'maybe', 'no')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, guest_key)
);

create table public.bring_items (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 80),
  taken_by    text,
  taken_key   uuid,
  created_at  timestamptz not null default now()
);

create table public.contributions (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  guest_key   uuid not null,
  guest_name  text not null check (char_length(guest_name) between 1 and 60),
  amount      integer not null check (amount > 0 and amount <= 10000000),
  confirmed   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index on public.rsvps (event_id);
create index on public.bring_items (event_id);
create index on public.contributions (event_id);
create index on public.events (host_id);

-- ───────────── Права доступа (RLS) ─────────────
-- Гости работают без аккаунта и без прямого доступа к таблицам:
-- читают и отвечают только через функции ниже.
-- Организатор (вошедший пользователь) управляет только своими встречами.

alter table public.events        enable row level security;
alter table public.rsvps         enable row level security;
alter table public.bring_items   enable row level security;
alter table public.contributions enable row level security;

-- events
create policy "events: публичные видны всем, свои видны организатору"
  on public.events for select
  using (visibility = 'public' or host_id = auth.uid());
create policy "events: создаёт организатор"
  on public.events for insert
  with check (host_id = auth.uid());
create policy "events: меняет организатор"
  on public.events for update
  using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "events: удаляет организатор"
  on public.events for delete
  using (host_id = auth.uid());

-- rsvps: список гостей виден только организатору
create policy "rsvps: читает организатор"
  on public.rsvps for select
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));
create policy "rsvps: удаляет организатор"
  on public.rsvps for delete
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));

-- bring_items: управляет организатор, гости берут через функцию
create policy "bring_items: читает организатор"
  on public.bring_items for select
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));
create policy "bring_items: добавляет организатор"
  on public.bring_items for insert
  with check (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));
create policy "bring_items: удаляет организатор"
  on public.bring_items for delete
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));

-- contributions: видит и подтверждает организатор
create policy "contributions: читает организатор"
  on public.contributions for select
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));
create policy "contributions: подтверждает организатор"
  on public.contributions for update
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));

-- ───────────── Функции для гостей ─────────────

-- Страница приглашения: данные встречи без host_id, счётчики, список «что принести», сумма сбора.
-- p_guest_key (необязательно) нужен, чтобы вернуть ответ этого гостя и его пункты («mine»).
-- Ключи других гостей наружу не отдаются.
create or replace function public.get_event_public(p_slug text, p_guest_key uuid default null)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'slug', e.slug,
    'kind', e.kind,
    'title', e.title,
    'description', e.description,
    'starts_at', e.starts_at,
    'location_name', e.location_name,
    'address', e.address,
    'lat', e.lat,
    'lng', e.lng,
    'dress_code', e.dress_code,
    'cover_color', e.cover_color,
    'goal_title', e.goal_title,
    'goal_amount', e.goal_amount,
    'counts', jsonb_build_object(
      'yes',   (select count(*) from rsvps r where r.event_id = e.id and r.status = 'yes'),
      'maybe', (select count(*) from rsvps r where r.event_id = e.id and r.status = 'maybe'),
      'no',    (select count(*) from rsvps r where r.event_id = e.id and r.status = 'no')
    ),
    'raised', coalesce((select sum(c.amount) from contributions c where c.event_id = e.id and c.confirmed), 0),
    'my_rsvp', (select r.status from rsvps r where r.event_id = e.id and p_guest_key is not null and r.guest_key = p_guest_key),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', b.id,
               'label', b.label,
               'taken_by', b.taken_by,
               'mine', (p_guest_key is not null and b.taken_key = p_guest_key))
             order by b.created_at)
      from bring_items b where b.event_id = e.id
    ), '[]'::jsonb)
  )
  from events e
  where e.slug = p_slug;
$$;

-- Ответ гостя «Я приду / Думаю / Не смогу». Повторный вызов с тем же ключом меняет ответ.
create or replace function public.submit_rsvp(p_slug text, p_guest_key uuid, p_name text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
begin
  select id into v_event from events where slug = p_slug;
  if v_event is null then
    raise exception 'event not found';
  end if;
  insert into rsvps (event_id, guest_key, guest_name, status)
  values (v_event, p_guest_key, left(btrim(p_name), 60), p_status)
  on conflict (event_id, guest_key)
  do update set guest_name = excluded.guest_name, status = excluded.status, updated_at = now();
end;
$$;

-- Гость берёт пункт «кто что принесёт». Если пункт уже занят другим — вернёт false.
create or replace function public.claim_item(p_item_id uuid, p_guest_key uuid, p_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  update bring_items
     set taken_by = left(btrim(p_name), 60), taken_key = p_guest_key
   where id = p_item_id and (taken_key is null or taken_key = p_guest_key);
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- Гость отказывается от своего пункта.
create or replace function public.release_item(p_item_id uuid, p_guest_key uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update bring_items set taken_by = null, taken_key = null
   where id = p_item_id and taken_key = p_guest_key;
$$;

-- Гость отмечает, что внёс долю. В сумму сбора попадёт после подтверждения организатором.
create or replace function public.add_pledge(p_slug text, p_guest_key uuid, p_name text, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
begin
  select id into v_event from events where slug = p_slug and goal_amount is not null;
  if v_event is null then
    raise exception 'no collection for this event';
  end if;
  insert into contributions (event_id, guest_key, guest_name, amount)
  values (v_event, p_guest_key, left(btrim(p_name), 60), p_amount);
end;
$$;

revoke all on function public.get_event_public(text, uuid) from public;
revoke all on function public.submit_rsvp(text, uuid, text, text) from public;
revoke all on function public.claim_item(uuid, uuid, text) from public;
revoke all on function public.release_item(uuid, uuid) from public;
revoke all on function public.add_pledge(text, uuid, text, integer) from public;

grant execute on function public.get_event_public(text, uuid) to anon, authenticated;
grant execute on function public.submit_rsvp(text, uuid, text, text) to anon, authenticated;
grant execute on function public.claim_item(uuid, uuid, text) to anon, authenticated;
grant execute on function public.release_item(uuid, uuid) to anon, authenticated;
grant execute on function public.add_pledge(text, uuid, text, integer) to anon, authenticated;
