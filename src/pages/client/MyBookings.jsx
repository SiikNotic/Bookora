import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Star } from 'lucide-react';
import { Avatar, Confirm, EmptyState, LoadError, Loading, Segmented, StatusBadge, TopBar } from '../../components/ui';
import { cancelBooking, myBookings, refundBooking, startCheckout } from '../../lib/api';
import { formatDateShort, formatTime } from '../../lib/dates';
import { duration, money } from '../../lib/format';
import { effectiveStatus } from '../../lib/slots';
import { useAsync, useStore } from '../../store/AppStore';

/** Texto del estado del pago de una cita */
function paymentLabel(b) {
  if (b.paymentStatus === 'reembolsado') return 'Reembolsado';
  if (b.paymentStatus === 'pagado') return b.paymentMethod === 'stripe' ? 'Pagado en línea' : 'Pagado';
  if (b.status === 'cancelada') return 'Sin cargo';
  return b.paymentMethod === 'stripe' ? 'Pago en línea pendiente' : 'Se paga en la barbería';
}

export default function MyBookings() {
  const { toast } = useStore();
  const nav = useNavigate();
  const [tab, setTab] = useState('proximas');
  const [toCancel, setToCancel] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const res = useAsync(myBookings);

  if (!res.data) {
    return (
      <div>
        <TopBar title="Mis citas" />
        {res.error ? <LoadError error={res.error} onRetry={res.reload} /> : <Loading />}
      </div>
    );
  }

  const mine = res.data.map((b) => ({ ...b, effective: effectiveStatus(b) }));
  const byTime = (a, b) => new Date(a.startsAt) - new Date(b.startsAt);

  const run = async (b, fn, okMsg) => {
    setBusyId(b.id);
    try {
      const out = await fn();
      if (okMsg) toast(okMsg);
      return out;
    } catch (e) {
      toast(e.message, 'warn');
    } finally {
      setBusyId(null);
      res.reload();
    }
  };
  const payNow = (b) =>
    run(b, async () => {
      window.location.href = await startCheckout(b.id);
    });
  const doCancel = (b) =>
    b.paymentMethod === 'stripe' && b.paymentStatus === 'pagado'
      ? run(b, () => refundBooking(b.id), 'Cita cancelada. El reembolso llegará a tu tarjeta en 5–10 días.')
      : run(b, () => cancelBooking(b.id), 'Cita cancelada');
  const lists = {
    proximas: mine.filter((b) => b.effective === 'confirmada').sort(byTime),
    pasadas: mine.filter((b) => b.effective === 'completada').sort((a, b) => byTime(b, a)),
    canceladas: mine.filter((b) => b.effective === 'cancelada').sort((a, b) => byTime(b, a)),
  };
  const list = lists[tab];

  return (
    <div>
      <TopBar title="Mis citas" />
      <div className="px-4 pt-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            ['proximas', `Próximas (${lists.proximas.length})`],
            ['pasadas', 'Completadas'],
            ['canceladas', 'Canceladas'],
          ]}
        />

        <div className="mt-4 space-y-4">
          {list.map((b) => {
            const barber = b.barber;
            // Se puede cancelar/reprogramar hasta 2 h antes (el servidor aplica la misma regla)
            const editable = new Date(b.startsAt) - Date.now() > 2 * 3600000;
            const unpaidOnline = b.effective === 'confirmada' && b.paymentMethod === 'stripe' && b.paymentStatus === 'pendiente';
            return (
              <div key={b.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <Link to={`/cliente/barbero/${barber.id}`}>
                    <Avatar name={barber.name} src={barber.avatar} size={52} className="rounded-xl" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium">{barber.name}</p>
                      <StatusBadge status={b.effective} />
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                      <MapPin size={13} /> {barber.shop}, {barber.municipio}
                    </p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                  <dt className="text-muted">Servicio</dt>
                  <dd>{b.serviceName}</dd>
                  <dt className="text-muted">Duración</dt>
                  <dd>{duration(b.duration)}</dd>
                </dl>
                <div className="mt-3 grid grid-cols-2 rounded-xl bg-surface2 p-3 text-sm">
                  <div>
                    <p className="font-medium">{formatDateShort(b.date)}</p>
                    <p className="text-xs text-muted">{formatTime(b.time)}</p>
                  </div>
                  <div className="border-l border-line pl-3">
                    <p className="font-medium">{money(b.price + b.tip)}</p>
                    <p className="text-xs text-muted">{paymentLabel(b)}</p>
                  </div>
                </div>

                {unpaidOnline && (
                  <button disabled={busyId === b.id} className="btn-primary mt-3 w-full py-2.5 text-sm" onClick={() => payNow(b)}>
                    Completar pago en línea
                  </button>
                )}
                {b.effective === 'confirmada' && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      disabled={!editable || busyId === b.id}
                      className="btn-secondary py-2.5 text-sm"
                      onClick={() => setToCancel(b)}
                    >
                      Cancelar
                    </button>
                    <button
                      disabled={!editable}
                      className="btn-secondary py-2.5 text-sm"
                      onClick={() => nav(`/cliente/reservar/${b.barberId}?reprogramar=${b.id}`)}
                    >
                      Reprogramar
                    </button>
                    {!editable && (
                      <p className="col-span-2 text-center text-xs text-muted">Faltan menos de 2 horas: llama a la barbería.</p>
                    )}
                  </div>
                )}
                {b.effective === 'completada' &&
                  (b.reviewed ? (
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                      <Star size={14} className="fill-accent text-accent" /> Ya dejaste tu reseña. ¡Gracias!
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link
                        to={`/cliente/reservar/${b.barberId}?servicio=${b.serviceId}`}
                        className="btn-secondary py-2.5 text-sm"
                      >
                        Repetir
                      </Link>
                      <Link to={`/cliente/resena/${b.id}`} className="btn-primary py-2.5 text-sm">
                        Dejar reseña
                      </Link>
                    </div>
                  ))}
              </div>
            );
          })}
          {!list.length && (
            <EmptyState
              icon={CalendarDays}
              title={tab === 'proximas' ? 'No tienes citas próximas' : 'Nada por aquí'}
              text={tab === 'proximas' ? 'Busca un barbero y reserva en segundos.' : undefined}
              action={
                tab === 'proximas' && (
                  <Link to="/cliente" className="btn-primary">
                    Buscar barbero
                  </Link>
                )
              }
            />
          )}
        </div>
      </div>

      <Confirm
        open={Boolean(toCancel)}
        onClose={() => setToCancel(null)}
        title="¿Cancelar cita?"
        text={
          toCancel?.paymentStatus === 'pagado'
            ? 'Se liberará el turno y se reembolsará el pago a tu tarjeta.'
            : 'Se liberará el turno para otros clientes.'
        }
        confirmLabel="Sí, cancelar"
        danger
        onConfirm={() => doCancel(toCancel)}
      />
    </div>
  );
}
