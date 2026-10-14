import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ChevronRight, Circle, DollarSign, Settings, Star } from 'lucide-react';
import { Avatar, LoadError, Loading, SectionTitle, Stars, TopBar } from '../../components/ui';
import { barberBookings, barberPayments, getBarber, listReviews } from '../../lib/api';
import { addDays, formatTime, today } from '../../lib/dates';
import { duration, money } from '../../lib/format';
import { effectiveStatus } from '../../lib/slots';
import { useAsync, useStore } from '../../store/AppStore';
import { ReviewItem } from '../client/BarberProfile';

/** Perfil del barbero que inició sesión. */
export function useMyBarber() {
  const { userId } = useStore();
  const res = useAsync(() => getBarber(userId), [userId]);
  return { barber: res.data, error: res.error, reload: res.reload };
}

/** Carga/espera común de las pantallas del barbero */
export function BarberGate({ title, res, children }) {
  if (res.barber) return children(res.barber);
  return (
    <div>
      <TopBar title={title} />
      {res.error ? <LoadError error={res.error} onRetry={res.reload} /> : <Loading />}
    </div>
  );
}

export default function Dashboard() {
  const me = useMyBarber();
  const t = today();
  const data = useAsync(async () => {
    const [todayList, upcoming, monthPaid, reviews] = await Promise.all([
      barberBookings(t, t),
      barberBookings(addDays(t, 1), addDays(t, 30)),
      barberPayments(`${t.slice(0, 7)}-01`),
      me.barber ? listReviews(me.barber.id) : [],
    ]);
    return { todayList, upcoming, monthPaid, reviews };
  }, [t, me.barber?.id]);

  return (
    <BarberGate title="Panel" res={me}>
      {(barber) => {
        const d = data.data;
        const active = (list) => (list || []).filter((b) => b.status !== 'cancelada');
        const todayList = active(d?.todayList);
        const monthIncome = (d?.monthPaid || [])
          .filter((p) => p.paymentStatus === 'pagado')
          .reduce((s, p) => s + p.price + p.tip, 0);
        const steps = [
          ['Datos de tu barbería', Boolean(barber.shop && barber.address), '/barbero/perfil'],
          ['Al menos un servicio con precio', barber.services.length > 0, '/barbero/servicios'],
          ['Revisa tu horario', true, '/barbero/agenda'],
          ['Sube fotos de tus cortes', barber.portfolio.length > 0, '/barbero/portafolio'],
        ];
        const pending = steps.filter(([, done]) => !done).length;

        return (
          <div>
            <TopBar
              title="Panel"
              right={
                <Link
                  to="/barbero/perfil"
                  aria-label="Perfil y ajustes"
                  className="grid h-10 w-10 place-items-center rounded-full active:bg-surface2"
                >
                  <Settings size={20} />
                </Link>
              }
            />
            <div className="px-4 pt-4">
              <div className="flex items-center gap-3">
                <Avatar name={barber.name || 'Barbero'} src={barber.avatar} size={52} />
                <div className="min-w-0">
                  <p className="text-sm text-muted">¡Buen día!</p>
                  <p className="truncate text-lg font-semibold">{barber.name}</p>
                </div>
              </div>

              {pending > 0 && (
                <div className="card mt-5 p-4">
                  <p className="font-semibold">Completa tu perfil</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {barber.services.length
                      ? 'Ya apareces en Bookora.'
                      : 'Los clientes te verán cuando tengas al menos un servicio.'}
                  </p>
                  <div className="mt-3 divide-y divide-line/60">
                    {steps.map(([label, done, to]) => (
                      <Link key={label} to={to} className="flex items-center gap-3 py-2.5 text-sm">
                        {done ? <CheckCircle2 size={18} className="text-ok" /> : <Circle size={18} className="text-muted" />}
                        <span className={`flex-1 ${done ? 'text-muted line-through' : ''}`}>{label}</span>
                        <ChevronRight size={16} className="text-muted" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 grid grid-cols-3 gap-2">
                <StatCard
                  icon={CalendarDays}
                  label="Hoy"
                  value={todayList.length}
                  sub={`${active(d?.upcoming).length} próximas`}
                />
                <StatCard icon={DollarSign} label="Este mes" value={money(monthIncome).replace('.00', '')} sub="cobrado" />
                <StatCard
                  icon={Star}
                  label="Rating"
                  value={barber.rating.count ? barber.rating.avg.toFixed(1) : '—'}
                  sub={`${barber.rating.count} reseñas`}
                />
              </div>

              <SectionTitle
                action={
                  <Link to="/barbero/agenda" className="btn-ghost text-sm">
                    Ver agenda
                  </Link>
                }
              >
                Citas de hoy
              </SectionTitle>
              {!d && (data.error ? <LoadError error={data.error} onRetry={data.reload} /> : <Loading />)}
              <div className="space-y-2">
                {todayList.map((b) => {
                  const st = effectiveStatus(b);
                  return (
                    <div key={b.id} className={`card flex items-center gap-3 p-3 ${st === 'completada' ? 'opacity-60' : ''}`}>
                      <div className="w-16 shrink-0 rounded-lg bg-surface2 py-2 text-center">
                        <p className="text-sm font-semibold">{formatTime(b.time).replace(/ (AM|PM)/, '')}</p>
                        <p className="text-[10px] text-muted">{formatTime(b.time).slice(-2)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{b.clientName}</p>
                        <p className="truncate text-sm text-muted">
                          {b.serviceName} · {duration(b.duration)}
                        </p>
                      </div>
                      {st === 'completada' && <span className="text-xs text-ok">Hecha</span>}
                    </div>
                  );
                })}
                {d && !todayList.length && <p className="card p-4 text-sm text-muted">No tienes citas para hoy.</p>}
              </div>

              <SectionTitle
                action={
                  <Link to="/barbero/resenas" className="btn-ghost text-sm">
                    Ver todas
                  </Link>
                }
              >
                Reseñas recientes
              </SectionTitle>
              <Link to="/barbero/resenas" className="card mb-3 flex items-center gap-4 p-4">
                <p className="silver-text text-3xl font-bold">{barber.rating.count ? barber.rating.avg.toFixed(1) : '—'}</p>
                <div className="flex-1">
                  <Stars value={barber.rating.avg} size={15} />
                  <p className="mt-1 text-sm text-muted">Promedio de {barber.rating.count} reseñas</p>
                </div>
                <ChevronRight size={18} className="text-muted" />
              </Link>
              <div className="space-y-3 pb-4">
                {(d?.reviews || []).slice(0, 2).map((r) => (
                  <ReviewItem key={r.id} review={r} />
                ))}
              </div>
            </div>
          </div>
        );
      }}
    </BarberGate>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-3">
      <Icon size={16} className="text-muted" />
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted">
        {label} · {sub}
      </p>
    </div>
  );
}
