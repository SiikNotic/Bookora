import { useMemo, useState } from 'react';
import { CalendarX2 } from 'lucide-react';
import { Confirm, EmptyState, LoadError, Loading, Segmented, Sheet, StatusBadge, Toggle, TopBar } from '../../components/ui';
import { barberBookings, cancelBooking, markPaid, proposeReschedule, refundBooking, updateBarber } from '../../lib/api';
import {
  addDays,
  DAY_NAMES,
  DAY_SHORT,
  formatDateLong,
  formatDateShort,
  formatTime,
  fromISODate,
  fromMinutes,
  toMinutes,
  today,
} from '../../lib/dates';
import { duration, money } from '../../lib/format';
import { effectiveStatus, getAvailableSlots, isOpenOn } from '../../lib/slots';
import { useAsync, useStore } from '../../store/AppStore';
import { BarberGate, useMyBarber } from './Dashboard';

export default function Agenda() {
  const [tab, setTab] = useState('citas');
  const me = useMyBarber();
  return (
    <div>
      <TopBar title="Agenda" />
      <div className="px-4 pt-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            ['citas', 'Citas'],
            ['horario', 'Mi horario'],
          ]}
        />
      </div>
      <BarberGate title="Agenda" res={me}>
        {(barber) => (tab === 'citas' ? <Appointments me={barber} /> : <ScheduleEditor me={barber} />)}
      </BarberGate>
    </div>
  );
}

function Appointments({ me }) {
  const { toast } = useStore();
  const days = useMemo(() => Array.from({ length: 21 }, (_, i) => addDays(today(), i - 3)), []);
  const [date, setDate] = useState(today());
  const [toCancel, setToCancel] = useState(null);
  const [toMove, setToMove] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const res = useAsync(() => barberBookings(days[0], days[days.length - 1]), [days]);

  const run = async (b, fn, okMsg) => {
    setBusyId(b.id);
    try {
      await fn();
      toast(okMsg);
    } catch (e) {
      toast(e.message, 'warn');
    } finally {
      setBusyId(null);
      res.reload();
    }
  };

  // Regla: la agenda muestra TODAS las citas (cada una en su fila), pero las
  // canceladas no cuentan en el contador ni en el total del día (su pago se
  // reembolsó). Es la misma regla del punto del calendario, el Panel y Pagos.
  const mine = res.data || [];
  const counts = (b) => b.status !== 'cancelada';
  const countFor = (d) => mine.filter((b) => b.date === d && counts(b)).length;
  const list = mine
    .filter((b) => b.date === date)
    // Mismo turno: la cita vigente va antes que la cancelada
    .sort((a, b) => a.time.localeCompare(b.time) || counts(b) - counts(a));
  const active = list.filter(counts);
  const cancelled = list.length - active.length;
  const total = active.reduce((s, b) => s + b.price + b.tip, 0);

  return (
    <>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const n = countFor(d);
          const sel = d === date;
          return (
            <button
              key={d}
              onClick={() => setDate(d)}
              className={`relative flex w-14 shrink-0 flex-col items-center rounded-xl border py-2.5 ${
                sel ? 'chip-active' : 'border-line bg-surface'
              } ${isOpenOn(me, d) ? '' : 'opacity-40'}`}
            >
              <span className={`text-xs ${sel ? '' : 'text-muted'}`}>
                {d === today() ? 'Hoy' : DAY_SHORT[fromISODate(d).getDay()]}
              </span>
              <span className="mt-0.5 text-lg font-semibold">{fromISODate(d).getDate()}</span>
              <span
                className={`mt-0.5 h-1.5 w-1.5 rounded-full ${n ? (sel ? 'bg-accent-ink' : 'bg-accent') : 'bg-transparent'}`}
              />
            </button>
          );
        })}
      </div>

      <div className="px-4">
        <div className="mb-3 mt-5 flex items-end justify-between">
          <p className="font-semibold first-letter:uppercase">{formatDateLong(date)}</p>
          {list.length > 0 && (
            <p className="text-sm text-muted">
              {active.length} {active.length === 1 ? 'cita' : 'citas'} · {money(total)}
              {cancelled > 0 && ` · ${cancelled} ${cancelled === 1 ? 'cancelada' : 'canceladas'}`}
            </p>
          )}
        </div>
        <div className="space-y-2">
          {list.map((b) => {
            const st = effectiveStatus(b);
            return (
              <div key={b.id} className={`card flex gap-3 p-3 ${st === 'cancelada' ? 'opacity-50' : ''}`}>
                <div className="w-1 shrink-0 rounded-full bg-accent/70" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">
                      {formatTime(b.time)}
                      <span className="text-muted"> – {formatTime(addMin(b.time, b.duration))}</span>
                    </p>
                    <StatusBadge status={st} />
                  </div>
                  <p className="mt-1 truncate">{b.clientName}</p>
                  <p className="truncate text-sm text-muted">
                    {b.serviceName} · {duration(b.duration)} · {money(b.price + b.tip)}
                    {b.rescheduled && ' · reprogramada'}
                  </p>
                  {st === 'confirmada' && b.proposed && (
                    <p className="mt-1 text-xs text-warn">
                      Propusiste {formatDateShort(b.proposed.date)} a las {formatTime(b.proposed.time)} · esperando al cliente
                    </p>
                  )}
                  {st !== 'cancelada' && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className={`text-xs ${b.paymentStatus === 'pagado' ? 'text-ok' : 'text-warn'}`}>
                        {b.paymentStatus === 'pagado'
                          ? b.paymentMethod === 'stripe'
                            ? 'Pagado en línea'
                            : 'Cobrado'
                          : b.paymentMethod === 'stripe'
                            ? 'Pago en línea pendiente'
                            : 'Por cobrar en la barbería'}
                      </span>
                      <span className="flex gap-2">
                        {b.paymentMethod === 'barberia' && b.paymentStatus === 'pendiente' && (
                          <button
                            disabled={busyId === b.id}
                            className="chip bg-surface2 py-1 text-xs"
                            onClick={() => run(b, () => markPaid(b.id), 'Marcada como cobrada')}
                          >
                            Cobrada
                          </button>
                        )}
                        {st === 'confirmada' && (
                          <button disabled={busyId === b.id} className="chip py-1 text-xs" onClick={() => setToMove(b)}>
                            Cambiar hora
                          </button>
                        )}
                        {st === 'confirmada' && (
                          <button
                            disabled={busyId === b.id}
                            className="chip py-1 text-xs text-bad"
                            onClick={() => setToCancel(b)}
                          >
                            Cancelar
                          </button>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {!res.data && (res.error ? <LoadError error={res.error} onRetry={res.reload} /> : <Loading />)}
          {res.data && !list.length && (
            <div className="card">
              <EmptyState
                icon={CalendarX2}
                title={isOpenOn(me, date) ? 'Sin citas este día' : 'Día libre'}
                text={
                  isOpenOn(me, date) ? 'Los clientes verán tus turnos disponibles.' : 'Puedes abrir este día en "Mi horario".'
                }
              />
            </div>
          )}
        </div>
      </div>
      <Confirm
        open={Boolean(toCancel)}
        onClose={() => setToCancel(null)}
        title="¿Cancelar esta cita?"
        text={
          toCancel?.paymentMethod === 'stripe' && toCancel?.paymentStatus === 'pagado'
            ? `Se cancelará la cita de ${toCancel?.clientName} y se le reembolsará el pago en línea.`
            : `Se cancelará la cita de ${toCancel?.clientName} y se liberará el turno.`
        }
        confirmLabel="Sí, cancelar"
        danger
        onConfirm={() =>
          run(
            toCancel,
            () =>
              toCancel.paymentMethod === 'stripe' && toCancel.paymentStatus === 'pagado'
                ? refundBooking(toCancel.id)
                : cancelBooking(toCancel.id),
            'Cita cancelada',
          )
        }
      />
      <ProposeSheet
        booking={toMove}
        me={me}
        bookings={mine}
        days={days.filter((d) => d >= today())}
        onClose={() => setToMove(null)}
        onPick={(d, t) => {
          const b = toMove;
          setToMove(null);
          run(b, () => proposeReschedule(b.id, d, t), 'Propuesta enviada. El cliente debe aceptarla.');
        }}
      />
    </>
  );
}

/** El barbero elige otra hora libre; la cita no cambia hasta que el cliente acepte. */
function ProposeSheet({ booking, me, bookings, days, onClose, onPick }) {
  const [date, setDate] = useState(null);
  const open = Boolean(booking);
  const d = date || booking?.date;
  const slots = open
    ? getAvailableSlots({ barber: me, date: d, duration: booking.duration, bookings, excludeBookingId: booking.id }).filter(
        (t) => !(d === booking.date && t === booking.time),
      )
    : [];
  const close = () => {
    setDate(null);
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Proponer otra hora">
      {open && (
        <>
          <p className="text-sm text-muted">
            {booking.clientName} · {booking.serviceName}. Ahora: {formatDateShort(booking.date)} a las{' '}
            {formatTime(booking.time)}. El cliente recibirá la propuesta y podrá aceptarla o rechazarla.
          </p>
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            {days.map((x) => (
              <button
                key={x}
                onClick={() => setDate(x)}
                className={`flex w-14 shrink-0 flex-col items-center rounded-xl border py-2 ${
                  x === d ? 'chip-active' : 'border-line bg-surface2'
                } ${isOpenOn(me, x) ? '' : 'opacity-40'}`}
              >
                <span className="text-xs">{x === today() ? 'Hoy' : DAY_SHORT[fromISODate(x).getDay()]}</span>
                <span className="font-semibold">{fromISODate(x).getDate()}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {slots.map((t) => (
              <button
                key={t}
                className="chip justify-center py-2"
                onClick={() => {
                  setDate(null);
                  onPick(d, t);
                }}
              >
                {formatTime(t)}
              </button>
            ))}
          </div>
          {!slots.length && <p className="mt-4 text-center text-sm text-muted">No hay turnos libres este día.</p>}
        </>
      )}
    </Sheet>
  );
}

const addMin = (hhmm, m) => fromMinutes(toMinutes(hhmm) + m);

function ScheduleEditor({ me }) {
  const { toast } = useStore();
  const [schedule, setSchedule] = useState(me.schedule);
  const update = async (day, patch) => {
    const next = { ...schedule, [day]: { ...schedule[day], ...patch } };
    setSchedule(next);
    try {
      await updateBarber(me.id, { schedule: next });
    } catch (e) {
      toast(e.message, 'warn');
    }
  };

  return (
    <div className="space-y-3 px-4 pb-6 pt-4">
      <p className="text-sm text-muted">
        Los clientes solo podrán reservar dentro de este horario. Los cambios se aplican al instante.
      </p>
      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
        const day = schedule[d];
        const invalid = day.open && toMinutes(day.start) >= toMinutes(day.end);
        return (
          <div key={d} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{DAY_NAMES[d]}</p>
              <Toggle checked={day.open} onChange={(open) => update(d, { open })} label={`Abrir ${DAY_NAMES[d]}`} />
            </div>
            {day.open && (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <TimeField label="Abre" value={day.start} onChange={(start) => update(d, { start })} />
                  <TimeField label="Cierra" value={day.end} onChange={(end) => update(d, { end })} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted">Pausa de almuerzo</span>
                  <Toggle
                    checked={Boolean(day.breakStart)}
                    onChange={(on) =>
                      update(d, on ? { breakStart: '12:30', breakEnd: '13:30' } : { breakStart: null, breakEnd: null })
                    }
                    label="Pausa de almuerzo"
                  />
                </div>
                {day.breakStart && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <TimeField label="Desde" value={day.breakStart} onChange={(breakStart) => update(d, { breakStart })} />
                    <TimeField label="Hasta" value={day.breakEnd} onChange={(breakEnd) => update(d, { breakEnd })} />
                  </div>
                )}
                {invalid && <p className="mt-2 text-sm text-bad">La hora de cierre debe ser después de la apertura.</p>}
              </>
            )}
          </div>
        );
      })}
      <p className="text-center text-xs text-muted">Turnos cada 30 minutos · Las citas ya agendadas no se mueven.</p>
    </div>
  );
}

function TimeField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="time"
        step={1800}
        className="input py-2.5"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </label>
  );
}
