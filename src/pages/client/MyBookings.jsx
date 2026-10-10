import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Star } from 'lucide-react';
import { Avatar, Confirm, EmptyState, Segmented, StatusBadge, TopBar } from '../../components/ui';
import { formatDateShort, formatTime, toDateTime } from '../../lib/dates';
import { duration, money } from '../../lib/format';
import { effectiveStatus } from '../../lib/slots';
import { getBarber, useStore } from '../../store/AppStore';

export default function MyBookings() {
  const { state, actions } = useStore();
  const nav = useNavigate();
  const [tab, setTab] = useState('proximas');
  const [toCancel, setToCancel] = useState(null);

  const mine = state.bookings.filter((b) => b.isMe).map((b) => ({ ...b, effective: effectiveStatus(b) }));
  const byTime = (a, b) => toDateTime(a.date, a.time) - toDateTime(b.date, b.time);
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
            const barber = getBarber(state, b.barberId);
            // Regla de la demo: se puede cancelar/reprogramar hasta 2 h antes
            const editable = toDateTime(b.date, b.time) - Date.now() > 2 * 3600000;
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
                    <p className="text-xs text-muted">{b.effective === 'cancelada' ? 'Reembolsado (demo)' : 'Total pagado'}</p>
                  </div>
                </div>

                {b.effective === 'confirmada' && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button disabled={!editable} className="btn-secondary py-2.5 text-sm" onClick={() => setToCancel(b)}>
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
                  (b.reviewId ? (
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
        text="Se liberará el turno y el pago se reembolsará (simulado)."
        confirmLabel="Sí, cancelar"
        danger
        onConfirm={() => {
          actions.cancelBooking(toCancel.id);
          actions.toast('Cita cancelada y reembolso simulado');
        }}
      />
    </div>
  );
}
