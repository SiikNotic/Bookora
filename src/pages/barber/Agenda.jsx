import { useMemo, useState } from 'react';
import { CalendarX2 } from 'lucide-react';
import { EmptyState, Segmented, StatusBadge, Toggle, TopBar } from '../../components/ui';
import {
  addDays,
  DAY_NAMES,
  DAY_SHORT,
  formatDateLong,
  formatTime,
  fromISODate,
  fromMinutes,
  toMinutes,
  today,
} from '../../lib/dates';
import { duration, money } from '../../lib/format';
import { effectiveStatus, isOpenOn } from '../../lib/slots';
import { useStore } from '../../store/AppStore';
import { useMyBarber } from './Dashboard';

export default function Agenda() {
  const [tab, setTab] = useState('citas');
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
      {tab === 'citas' ? <Appointments /> : <ScheduleEditor />}
    </div>
  );
}

function Appointments() {
  const { state } = useStore();
  const me = useMyBarber();
  const days = useMemo(() => Array.from({ length: 21 }, (_, i) => addDays(today(), i - 3)), []);
  const [date, setDate] = useState(today());

  // Regla: la agenda muestra TODAS las citas (cada una en su fila), pero las
  // canceladas no cuentan en el contador ni en el total del día (su pago se
  // reembolsó). Es la misma regla del punto del calendario, el Panel y Pagos.
  const mine = state.bookings.filter((b) => b.barberId === me.id);
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
                </div>
              </div>
            );
          })}
          {!list.length && (
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
    </>
  );
}

const addMin = (hhmm, m) => fromMinutes(toMinutes(hhmm) + m);

function ScheduleEditor() {
  const { actions } = useStore();
  const me = useMyBarber();
  const update = (day, patch) => actions.updateDay(me.id, day, patch);

  return (
    <div className="space-y-3 px-4 pb-6 pt-4">
      <p className="text-sm text-muted">
        Los clientes solo podrán reservar dentro de este horario. Los cambios se aplican al instante.
      </p>
      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
        const day = me.schedule[d];
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
