-- Los avisos al cliente abren /cliente/citas (la ruta real de "Mis citas").
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
      perform public.notify(new.client_id, 'Tu cita fue cancelada', new.service_name || ' · ' || v_when, '/cliente/citas');
    end if;
  elsif new.payment_method = 'stripe' and old.payment_status = 'pendiente' and new.payment_status = 'pagado' then
    perform public.notify(new.barber_id, 'Nueva reserva (pagada)', v_desc || ' · ' || v_when, '/barbero/agenda');
  elsif new.proposed_starts_at is not null and new.proposed_starts_at is distinct from old.proposed_starts_at then
    perform public.notify(new.client_id, 'Tu barbero propone otra hora',
      new.service_name || ': ' || to_char(new.proposed_starts_at at time zone 'America/Puerto_Rico', 'DD/MM "a las" HH12:MI AM')
      || '. Acéptala o recházala.', '/cliente/citas');
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
