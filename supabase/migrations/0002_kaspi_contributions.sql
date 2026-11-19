-- Let's meet! — взносы через перевод Kaspi.
-- Выполни ПОСЛЕ 0001_init.sql: Supabase -> SQL Editor -> New query -> вставь файл целиком -> Run.
--
-- Как это работает: сервис деньги не проводит. Организатор указывает свой номер Kaspi,
-- гость переводит сам в приложении Kaspi и нажимает «Я отправил». Взнос появляется в списке
-- со статусом «Ждёт подтверждения», организатор сверяет его с поступлением в Kaspi и
-- подтверждает. Только после этого сумма попадает в «Собрано».

-- ───────────── Реквизиты организатора ─────────────

alter table public.events
  add column if not exists pay_phone     text,
  add column if not exists pay_recipient text,
  add column if not exists pay_link      text;

alter table public.events drop constraint if exists events_pay_phone_check;
alter table public.events add constraint events_pay_phone_check
  check (pay_phone is null or pay_phone ~ '^\+7[0-9]{10}$');

alter table public.events drop constraint if exists events_pay_recipient_check;
alter table public.events add constraint events_pay_recipient_check
  check (pay_recipient is null or char_length(pay_recipient) <= 60);

-- Ссылка принимается только на домен kaspi.kz (или его поддомен), чтобы нельзя было подсунуть чужой сайт.
alter table public.events drop constraint if exists events_pay_link_check;
alter table public.events add constraint events_pay_link_check
  check (pay_link is null or (char_length(pay_link) <= 300 and pay_link ~ '^https://([a-z0-9-]+\.)*kaspi\.kz(/.*)?$'));

-- ───────────── Взносы ─────────────

-- Как гость записан в Kaspi, если это отличается от имени на сайте. Видит только организатор.
alter table public.contributions
  add column if not exists payer_hint text check (payer_hint is null or char_length(payer_hint) <= 60);

-- Организатор может добавить взнос вручную (свою долю, наличные) и отклонить ошибочный.
drop policy if exists "contributions: добавляет организатор" on public.contributions;
create policy "contributions: добавляет организатор"
  on public.contributions for insert
  with check (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));

drop policy if exists "contributions: удаляет организатор" on public.contributions;
create policy "contributions: удаляет организатор"
  on public.contributions for delete
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));

-- ───────────── Функции для гостей ─────────────

-- Страница приглашения: добавились реквизиты и список взносов (имя, сумма, статус).
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
    'pay_phone', e.pay_phone,
    'pay_recipient', e.pay_recipient,
    'pay_link', e.pay_link,
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
    ), '[]'::jsonb),
    'contributions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'name', c.guest_name,
               'amount', c.amount,
               'confirmed', c.confirmed,
               'mine', (p_guest_key is not null and c.guest_key = p_guest_key))
             order by c.created_at)
      from contributions c where c.event_id = e.id
    ), '[]'::jsonb)
  )
  from events e
  where e.slug = p_slug;
$$;

-- Гость сообщает, что отправил перевод. В «Собрано» попадёт после подтверждения организатором.
-- Возвращает id взноса. Двойное нажатие за 2 минуты не создаёт дубль.
drop function if exists public.add_pledge(text, uuid, text, integer);

create or replace function public.add_pledge(
  p_slug text, p_guest_key uuid, p_name text, p_amount integer, p_hint text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
  v_id uuid;
begin
  select id into v_event from events where slug = p_slug and goal_amount is not null;
  if v_event is null then
    raise exception 'no collection for this event';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 10000000 then
    raise exception 'bad amount';
  end if;

  select id into v_id from contributions
   where event_id = v_event and guest_key = p_guest_key and amount = p_amount
     and not confirmed and created_at > now() - interval '2 minutes'
   limit 1;
  if v_id is not null then
    return v_id;
  end if;

  if (select count(*) from contributions where event_id = v_event and guest_key = p_guest_key and not confirmed) >= 5 then
    raise exception 'too many pending pledges';
  end if;
  if (select count(*) from contributions where event_id = v_event and not confirmed) >= 200 then
    raise exception 'too many pending pledges for event';
  end if;

  insert into contributions (event_id, guest_key, guest_name, amount, payer_hint)
  values (v_event, p_guest_key, left(btrim(p_name), 60), p_amount, nullif(left(btrim(coalesce(p_hint, '')), 60), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- Гость отменяет свой ещё не подтверждённый взнос (например, ввёл не ту сумму).
create or replace function public.cancel_pledge(p_id uuid, p_guest_key uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from contributions where id = p_id and guest_key = p_guest_key and not confirmed;
$$;

revoke all on function public.add_pledge(text, uuid, text, integer, text) from public;
revoke all on function public.cancel_pledge(uuid, uuid) from public;
revoke all on function public.get_event_public(text, uuid) from public;

grant execute on function public.add_pledge(text, uuid, text, integer, text) to anon, authenticated;
grant execute on function public.cancel_pledge(uuid, uuid) to anon, authenticated;
grant execute on function public.get_event_public(text, uuid) to anon, authenticated;
