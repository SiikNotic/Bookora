-- Notificaciones push (Firebase) y cambio de hora propuesto por el barbero.

-- ---------- Preferencias y dispositivos ----------
alter table public.profiles
  add column notify_enabled boolean not null default true,
  add column notify_sound boolean not null default true;

create table public.push_tokens (
  token text primary key check (char_length(token) <= 4096),
  user_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);
create index on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
grant select, insert, update, delete on public.push_tokens to authenticated;
create policy "dispositivos propios" on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Cola de avisos: la función "push" solo envía filas pendientes y las marca enviadas,
-- así que llamarla de más no repite ni inventa notificaciones.
create table public.notification_queue (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  route text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.notification_queue enable row level security; -- sin políticas: solo el servidor

-- ---------- Cambio de hora propuesto por el barbero ----------
alter table public.bookings
  add column proposed_starts_at timestamptz,
  add column proposed_ends_at timestamptz,
  -- Quién canceló cuando lo hace una función del servidor (reembolsos), donde auth.uid() es nulo
  add column cancelled_by uuid;

create or replace function public.propose_reschedule(p_booking_id uuid, p_starts_at timestamptz)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  v_b public.bookings;
  v_end timestamptz;
begin
  select * into v_b from public.bookings where id = p_booking_id and barber_id = auth.uid() for update;
  if not found then raise exception 'Cita no encontrada'; end if;
  if v_b.status <> 'confirmada' or v_b.starts_at <= now() then raise exception 'Esta cita ya no se puede cambiar'; end if;
  if p_starts_at < now() + interval '30 minutes' or p_starts_at > now() + interval '90 days' then
    raise exception 'Elige un turno válido';
  end if;
  if p_starts_at = v_b.starts_at then raise exception 'Elige una hora distinta a la actual'; end if;
  v_end := p_starts_at + make_interval(mins => v_b.duration_min);
  if not public.slot_is_bookable(v_b.barber_id, p_starts_at, v_end) then
    raise exception 'Ese turno está fuera de tu horario';
  end if;
  if exists (
    select 1 from public.bookings o
    where o.barber_id = v_b.barber_id and o.id <> v_b.id and o.status <> 'cancelada'
      and tstzrange(o.starts_at, o.ends_at) && tstzrange(p_starts_at, v_end)
  ) then
    raise exception 'Ese turno ya está ocupado. Elige otro.';
  end if;
  update public.bookings set proposed_starts_at = p_starts_at, proposed_ends_at = v_end
  where id = p_booking_id returning * into v_b;
  return v_b;
end $$;

create or replace function public.respond_proposal(p_booking_id uuid, p_accept boolean)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  v_b public.bookings;
begin
  select * into v_b from public.bookings where id = p_booking_id and client_id = auth.uid() for update;
  if not found then raise exception 'Cita no encontrada'; end if;
  if v_b.proposed_starts_at is null or v_b.status <> 'confirmada' then
    raise exception 'Esta cita no tiene un cambio pendiente';
  end if;
  if p_accept then
    if v_b.proposed_starts_at <= now() then
      update public.bookings set proposed_starts_at = null, proposed_ends_at = null where id = p_booking_id;
      raise exception 'La hora propuesta ya pasó';
    end if;
    begin
      update public.bookings
      set starts_at = proposed_starts_at, ends_at = proposed_ends_at, rescheduled = true,
          proposed_starts_at = null, proposed_ends_at = null
      where id = p_booking_id returning * into v_b;
    exception when exclusion_violation then
      raise exception 'Esa hora ya no está disponible. Tu cita sigue como estaba.';
    end;
  else
    update public.bookings set proposed_starts_at = null, proposed_ends_at = null
    where id = p_booking_id returning * into v_b;
  end if;
  return v_b;
end $$;

revoke execute on function public.propose_reschedule(uuid, timestamptz) from public, anon;
revoke execute on function public.respond_proposal(uuid, boolean) from public, anon;
grant execute on function public.propose_reschedule(uuid, timestamptz) to authenticated;
grant execute on function public.respond_proposal(uuid, boolean) to authenticated;

-- ---------- Avisos automáticos según lo que pasa con la cita ----------
create or replace function public.notify(p_user uuid, p_title text, p_body text, p_route text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint;
begin
  insert into public.notification_queue (user_id, title, body, route)
  values (p_user, p_title, p_body, p_route) returning id into v_id;
  perform net.http_post(
    url := 'https://hvxvodqnbjwslwizlwob.supabase.co/functions/v1/push',
    body := jsonb_build_object('id', v_id)
  );
end $$;
revoke execute on function public.notify(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.booking_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_when text := to_char(new.starts_at at time zone 'America/Puerto_Rico', 'DD/MM "a las" HH12:MI AM');
  v_desc text := new.client_name || ' · ' || new.service_name;
begin
  if tg_op = 'INSERT' then
    if new.payment_method = 'barberia' then
      perform public.notify(new.barber_id, 'Nueva reserva', v_desc || ' · ' || v_when, '/barbero/agenda');
    end if;
    return new;
  end if;

  if new.status = 'cancelada' and old.status <> 'cancelada' then
    if coalesce(new.cancelled_by, auth.uid()) = new.client_id then
      perform public.notify(new.barber_id, 'Cita cancelada', v_desc || ' · ' || v_when, '/barbero/agenda');
    elsif old.payment_method = 'barberia' or old.payment_status = 'pagado' then
      perform public.notify(new.client_id, 'Tu cita fue cancelada', new.service_name || ' · ' || v_when, '/citas');
    end if;
  elsif new.payment_method = 'stripe' and old.payment_status = 'pendiente' and new.payment_status = 'pagado' then
    perform public.notify(new.barber_id, 'Nueva reserva (pagada)', v_desc || ' · ' || v_when, '/barbero/agenda');
  elsif new.proposed_starts_at is not null and new.proposed_starts_at is distinct from old.proposed_starts_at then
    perform public.notify(new.client_id, 'Tu barbero propone otra hora',
      new.service_name || ': ' || to_char(new.proposed_starts_at at time zone 'America/Puerto_Rico', 'DD/MM "a las" HH12:MI AM')
      || '. Acéptala o recházala.', '/citas');
  elsif old.proposed_starts_at is not null and new.proposed_starts_at is null and auth.uid() = new.client_id then
    if new.starts_at = old.proposed_starts_at then
      perform public.notify(new.barber_id, 'Cambio aceptado', v_desc || ' · ahora el ' || v_when, '/barbero/agenda');
    else
      perform public.notify(new.barber_id, 'Cambio rechazado', v_desc || ' · sigue el ' || v_when, '/barbero/agenda');
    end if;
  elsif new.starts_at <> old.starts_at then
    perform public.notify(new.barber_id, 'Cita reprogramada', v_desc || ' · ahora el ' || v_when, '/barbero/agenda');
  end if;
  return new;
end $$;
revoke execute on function public.booking_notifications() from public, anon, authenticated;

create trigger bookings_notify after insert or update on public.bookings
  for each row execute function public.booking_notifications();
