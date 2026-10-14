create extension if not exists pg_cron;

-- Respaldo del webhook: libera turnos de citas con pago en línea que nunca se pagaron
select cron.schedule(
  'bookora-liberar-pagos-vencidos',
  '*/10 * * * *',
  $$update public.bookings set status = 'cancelada'
    where payment_method = 'stripe' and payment_status = 'pendiente' and status = 'confirmada'
      and created_at < now() - interval '40 minutes'$$
);
