import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, DollarSign, Settings, Star } from 'lucide-react';
import { Avatar, SectionTitle, Stars, TopBar } from '../../components/ui';
import { formatTime, today } from '../../lib/dates';
import { duration, money } from '../../lib/format';
import { effectiveStatus } from '../../lib/slots';
import { getBarber, ratingFor, useStore } from '../../store/AppStore';
import { ReviewItem } from '../client/BarberProfile';

export function useMyBarber() {
  const { state } = useStore();
  return getBarber(state, state.barberId);
}

export default function Dashboard() {
  const { state } = useStore();
  const me = useMyBarber();
  const t = today();
  const month = t.slice(0, 7);

  const mine = state.bookings.filter((b) => b.barberId === me.id && b.status !== 'cancelada');
  const todayList = mine.filter((b) => b.date === t).sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = mine.filter((b) => b.date > t).length;
  const monthIncome = state.payments
    .filter((p) => p.barberId === me.id && p.status === 'pagado' && p.date.startsWith(month))
    .reduce((s, p) => s + p.amount + p.tip, 0);
  const rating = ratingFor(state.reviews, me.id);

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
          <Avatar name={me.name} src={me.avatar} size={52} />
          <div className="min-w-0">
            <p className="text-sm text-muted">¡Buen día!</p>
            <p className="truncate text-lg font-semibold">{me.name}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <StatCard icon={CalendarDays} label="Hoy" value={todayList.length} sub={`${upcoming} próximas`} />
          <StatCard icon={DollarSign} label="Este mes" value={money(monthIncome).replace('.00', '')} sub="cobrado" />
          <StatCard
            icon={Star}
            label="Rating"
            value={rating.count ? rating.avg.toFixed(1) : '—'}
            sub={`${rating.count} reseñas`}
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
          {!todayList.length && <p className="card p-4 text-sm text-muted">No tienes citas para hoy.</p>}
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
          <p className="silver-text text-3xl font-bold">{rating.count ? rating.avg.toFixed(1) : '—'}</p>
          <div className="flex-1">
            <Stars value={rating.avg} size={15} />
            <p className="mt-1 text-sm text-muted">Promedio de {rating.count} reseñas</p>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </Link>
        <div className="space-y-3 pb-4">
          {rating.list
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 2)
            .map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))}
        </div>
      </div>
    </div>
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
