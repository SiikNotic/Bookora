-- Funciones de reserva: toda la validación ocurre en el servidor.

-- ¿El turno cae dentro del horario del barbero? (hora local de Puerto Rico)
create or replace function public.slot_is_bookable(p_barber uuid, p_start timestamptz, p_end timestamptz)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_ls timestamp := p_start at time zone 'America/Puerto_Rico';
  v_le timestamp := p_end at time zone 'America/Puerto_Rico';
  v_day jsonb;
begin
  if v_ls::date <> v_le::date then return false; end if;
  select b.schedule -> (extract(dow from v_ls)::int)::text into v_day from public.barbers b where b.id = p_barber;
  if v_day is null or not coalesce((v_day ->> 'open')::boolean, false) then return false; end if;
  if v_ls::time < (v_day ->> 'start')::time or v_le::time > (v_day ->> 'end')::time then return false; end if;
  if (v_day ->> 'breakStart') is not null and (v_day ->> 'breakEnd') is not null
     and v_ls::time < (v_day ->> 'breakEnd')::time and v_le::time > (v_day ->> 'breakStart')::time then
    return false;
  end if;
  return true;
end $$;

-- Reservar (el cliente autenticado)
create or replace function public.book_appointment(p_service_id uuid, p_starts_at timestamptz, p_tip numeric, p_payment_method text)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_svc public.services;
  v_name text;
  v_end timestamptz;
  v_row public.bookings;
begin
  if v_uid is null then raise exception 'Inicia sesión para reservar'; end if;
  if p_payment_method not in ('barberia', 'stripe') then raise exception 'Método de pago no válido'; end if;
  if p_tip is null or p_tip < 0 or p_tip > 1000 then raise exception 'Propina no válida'; end if;
  select * into v_svc from public.services where id = p_service_id and active;
  if not found then raise exception 'Ese servicio ya no está disponible'; end if;
  if v_svc.barber_id = v_uid then raise exception 'No puedes reservar contigo mismo'; end if;
  if p_starts_at < now() + interval '30 minutes' then raise exception 'Elige un turno con al menos 30 minutos de anticipación'; end if;
  if p_starts_at > now() + interval '90 days' then raise exception 'Solo se puede reservar hasta 90 días antes'; end if;
  v_end := p_starts_at + make_interval(mins => v_svc.duration_min);
  if not public.slot_is_bookable(v_svc.barber_id, p_starts_at, v_end) then
    raise exception 'Ese turno está fuera del horario del barbero';
  end if;
  select full_name into v_name from public.profiles where id = v_uid;
  begin
    insert into public.bookings (client_id, barber_id, service_id, client_name, service_name, duration_min, price, tip,
                                 starts_at, ends_at, payment_method)
    values (v_uid, v_svc.barber_id, v_svc.id, coalesce(v_name, ''), v_svc.name, v_svc.duration_min, v_svc.price,
            round(p_tip, 2), p_starts_at, v_end, p_payment_method)
    returning * into v_row;
  exception when exclusion_violation then
    raise exception 'Ese turno ya no está disponible. Elige otro.';
  end;
  return v_row;
end $$;

-- Reprogramar (solo el cliente, hasta 2 h antes)
create or replace function public.reschedule_booking(p_booking_id uuid, p_starts_at timestamptz)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  v_b public.bookings;
  v_end timestamptz;
begin
  select * into v_b from public.bookings where id = p_booking_id and client_id = auth.uid() for update;
  if not found then raise exception 'Cita no encontrada'; end if;
  if v_b.status <> 'confirmada' then raise exception 'Esta cita ya no se puede reprogramar'; end if;
  if v_b.starts_at < now() + interval '2 hours' then raise exception 'Faltan menos de 2 horas: llama a la barbería'; end if;
  if p_starts_at < now() + interval '30 minutes' or p_starts_at > now() + interval '90 days' then
    raise exception 'Elige un turno válido';
  end if;
  v_end := p_starts_at + make_interval(mins => v_b.duration_min);
  if not public.slot_is_bookable(v_b.barber_id, p_starts_at, v_end) then
    raise exception 'Ese turno está fuera del horario del barbero';
  end if;
  begin
    update public.bookings set starts_at = p_starts_at, ends_at = v_end, rescheduled = true
    where id = p_booking_id returning * into v_b;
  exception when exclusion_violation then
    raise exception 'Ese turno ya no está disponible. Elige otro.';
  end;
  return v_b;
end $$;

-- Cancelar (cliente hasta 2 h antes; barbero cuando quiera). Las citas ya pagadas
-- en línea se cancelan con reembolso desde la función stripe-refund.
create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_b public.bookings;
begin
  select * into v_b from public.bookings
  where id = p_booking_id and (client_id = v_uid or barber_id = v_uid) for update;
  if not found then raise exception 'Cita no encontrada'; end if;
  if v_b.status <> 'confirmada' then raise exception 'La cita ya está cancelada'; end if;
  if v_b.ends_at <= now() then raise exception 'La cita ya pasó'; end if;
  if v_b.client_id = v_uid and v_b.starts_at < now() + interval '2 hours' then
    raise exception 'Faltan menos de 2 horas: llama a la barbería';
  end if;
  if v_b.payment_method = 'stripe' and v_b.payment_status = 'pagado' then
    raise exception 'Esta cita está pagada en línea: se cancela con reembolso';
  end if;
  update public.bookings set status = 'cancelada' where id = p_booking_id returning * into v_b;
  return v_b;
end $$;

-- El barbero marca como cobrada una cita pagada en la barbería
create or replace function public.mark_paid(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare v_b public.bookings;
begin
  update public.bookings set payment_status = 'pagado', paid_at = now()
  where id = p_booking_id and barber_id = auth.uid() and payment_method = 'barberia'
    and status = 'confirmada' and payment_status = 'pendiente'
  returning * into v_b;
  if not found then raise exception 'No se pudo marcar como cobrada'; end if;
  return v_b;
end $$;

-- Horas ocupadas de un barbero (sin datos del cliente) para calcular turnos libres
create or replace function public.get_busy_ranges(p_barber uuid, p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.starts_at, b.ends_at from public.bookings b
  where b.barber_id = p_barber and b.status <> 'cancelada'
    and b.starts_at < least(p_to, p_from + interval '120 days') and b.ends_at > p_from
$$;

revoke execute on function public.slot_is_bookable(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke execute on function public.book_appointment(uuid, timestamptz, numeric, text) from public, anon;
revoke execute on function public.reschedule_booking(uuid, timestamptz) from public, anon;
revoke execute on function public.cancel_booking(uuid) from public, anon;
revoke execute on function public.mark_paid(uuid) from public, anon;
revoke execute on function public.get_busy_ranges(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.book_appointment(uuid, timestamptz, numeric, text) to authenticated;
grant execute on function public.reschedule_booking(uuid, timestamptz) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.mark_paid(uuid) to authenticated;
grant execute on function public.get_busy_ranges(uuid, timestamptz, timestamptz) to authenticated;

-- ---------- Fotos (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "media: el barbero sube a su carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media: el barbero actualiza lo suyo" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media: el barbero borra lo suyo" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
