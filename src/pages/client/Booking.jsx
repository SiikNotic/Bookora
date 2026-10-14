import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarX2, Check } from 'lucide-react';
import { Avatar, EmptyState, LoadError, Loading, TopBar } from '../../components/ui';
import { getBarber, getBooking, getBusy, reschedule } from '../../lib/api';
import { addDays, DAY_SHORT, formatDateLong, formatTime, fromISODate, today } from '../../lib/dates';
import { duration, money } from '../../lib/format';
import { effectiveStatus, getAvailableSlots, isOpenOn } from '../../lib/slots';
import { useAsync, useStore } from '../../store/AppStore';

const DAYS_AHEAD = 21;
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Reservar (o reprogramar) una cita: servicio → fecha → hora.
 * Con ?reprogramar=<idCita> el servicio queda fijo y no se cobra de nuevo.
 * El servidor vuelve a validar horario y disponibilidad al guardar.
 */
export default function Booking() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { userId } = useStore();
  const rescheduleId = params.get('reprogramar');
  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today(), i)), []);

  const res = useAsync(async () => {
    const found = rescheduleId ? await getBooking(rescheduleId) : null;
    // Solo se reprograma una cita propia, confirmada, futura y del barbero de la URL
    const bad =
      rescheduleId &&
      (!found ||
        found.clientId !== userId ||
        effectiveStatus(found) !== 'confirmada' ||
        new Date(found.startsAt) <= new Date() ||
        found.barberId !== id);
    if (bad) return { bad: true };
    // Disponibilidad siempre con el barbero real de la cita al reprogramar
    const barberId = found ? found.barberId : id;
    const [barber, busy] = await Promise.all([getBarber(barberId), getBusy(barberId, days[0], days[days.length - 1])]);
    return { barber, busy, rescheduling: found };
  }, [id, rescheduleId, userId]);

  if (res.data?.bad || (res.data && !res.data.barber)) return <Navigate to="/cliente" replace />;
  if (!res.data) {
    return (
      <div>
        <TopBar back title={rescheduleId ? 'Reprogramar cita' : 'Reservar cita'} />
        {res.error ? <LoadError error={res.error} onRetry={res.reload} /> : <Loading />}
      </div>
    );
  }
  return <BookingForm {...res.data} days={days} reloadBusy={res.reload} />;
}

function BookingForm({ barber, busy, rescheduling, days, reloadBusy }) {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useStore();
  const [saving, setSaving] = useState(false);
  const [serviceId, setServiceId] = useState(rescheduling?.serviceId || params.get('servicio') || barber.services[0]?.id);
  // La propia cita no cuenta como ocupada al reprogramarla
  const taken = rescheduling ? busy.filter((b) => b.startsAt !== rescheduling.startsAt) : busy;
  const slotsFor = (d, svc) => (svc ? getAvailableSlots({ barber, date: d, duration: svc.duration, bookings: taken }) : []);

  const service =
    barber.services.find((s) => s.id === serviceId) ||
    (rescheduling && {
      id: rescheduling.serviceId,
      name: rescheduling.serviceName,
      duration: rescheduling.duration,
      price: rescheduling.price,
    });
  // Fecha inicial: el primer día con turnos libres para el servicio elegido
  const [date, setDate] = useState(
    () => days.find((d) => slotsFor(d, service).length) || days.find((d) => isOpenOn(barber, d)) || days[0],
  );
  const [time, setTime] = useState(null);
  const slots = slotsFor(date, service);

  const confirm = async () => {
    if (!rescheduling) {
      nav('/cliente/pago', { state: { barberId: barber.id, serviceId: service.id, date, time } });
      return;
    }
    setSaving(true);
    try {
      // Igual que en Checkout: confirma que el turno sigue libre antes de guardar
      const fresh = (await getBusy(barber.id, date, date)).filter((b) => b.startsAt !== rescheduling.startsAt);
      if (!getAvailableSlots({ barber, date, duration: service.duration, bookings: fresh }).includes(time)) {
        throw new Error('Ese turno ya no está disponible. Elige otro.');
      }
      await reschedule(rescheduling.id, date, time);
      toast('Cita reprogramada');
      nav('/cliente/citas', { replace: true });
    } catch (e) {
      setSaving(false);
      setTime(null);
      toast(e.message, 'warn');
      reloadBusy();
    }
  };

  const month = fromISODate(date).getMonth();

  return (
    <div className="pb-36">
      <TopBar back title={rescheduling ? 'Reprogramar cita' : 'Reservar cita'} />

      <div className="px-4">
        <div className="mt-4 flex items-center gap-3">
          <Avatar name={barber.name} src={barber.avatar} size={44} />
          <div className="min-w-0">
            <p className="truncate font-medium">{barber.name}</p>
            <p className="truncate text-sm text-muted">
              {barber.shop} · {barber.municipio}
            </p>
          </div>
        </div>

        <h2 className="mb-3 mt-6 font-semibold">1. Servicio</h2>
        {rescheduling ? (
          <div className="card p-4">
            <p className="font-medium">{service.name}</p>
            <p className="text-sm text-muted">
              {duration(service.duration)} · {money(service.price)}
              {rescheduling.paymentStatus === 'pagado' ? ' · ya pagado' : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {barber.services.map((s) => {
              const active = s.id === serviceId;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setServiceId(s.id);
                    setTime(null);
                  }}
                  className={`card flex w-full items-center gap-3 p-4 text-left transition ${active ? 'border-accent/80 bg-surface2' : ''}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted">
                      {duration(s.duration)} · {money(s.price)}
                    </p>
                  </div>
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full border ${
                      active ? 'border-accent bg-accent text-accent-ink' : 'border-line'
                    }`}
                  >
                    {active && <Check size={14} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <h2 className="mb-3 mt-7 font-semibold">
          2. Fecha <span className="ml-1 text-sm font-normal capitalize text-muted">{MONTHS[month]}</span>
        </h2>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const open = isOpenOn(barber, d);
          const active = d === date;
          const dt = fromISODate(d);
          return (
            <button
              key={d}
              disabled={!open}
              onClick={() => {
                setDate(d);
                setTime(null);
              }}
              className={`flex w-14 shrink-0 flex-col items-center rounded-xl border py-2.5 transition ${
                active ? 'chip-active' : 'border-line bg-surface'
              } ${open ? '' : 'opacity-30'}`}
            >
              <span className={`text-xs ${active ? '' : 'text-muted'}`}>{d === today() ? 'Hoy' : DAY_SHORT[dt.getDay()]}</span>
              <span className="mt-0.5 text-lg font-semibold">{dt.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="px-4">
        <h2 className="mb-3 mt-7 font-semibold">3. Hora</h2>
        {slots.length ? (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((s) => (
              <button
                key={s}
                onClick={() => setTime(s)}
                className={`rounded-xl border py-3 text-sm font-medium transition ${
                  time === s ? 'chip-active' : 'border-line bg-surface'
                }`}
              >
                {formatTime(s)}
              </button>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={CalendarX2}
              title={isOpenOn(barber, date) ? 'Sin turnos libres' : 'Cerrado este día'}
              text="Elige otra fecha."
            />
          </div>
        )}
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line/60 bg-bg px-4 pt-3">
        <p className="truncate text-sm text-muted first-letter:uppercase">
          {time ? `${formatDateLong(date)} · ${formatTime(time)}` : 'Elige fecha y hora'}
        </p>
        <div className="flex items-center gap-4 pb-3 pt-2">
          {!rescheduling && (
            <div>
              <p className="text-lg font-semibold">{money(service?.price)}</p>
              <p className="text-xs text-muted">{service && duration(service.duration)}</p>
            </div>
          )}
          <button disabled={!time || !service || saving} onClick={confirm} className="btn-primary flex-1">
            {rescheduling ? 'Confirmar nuevo horario' : 'Continuar al pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
