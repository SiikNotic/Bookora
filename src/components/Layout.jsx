import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { CalendarDays, CreditCard, Images, LayoutDashboard, Scissors, Search, User } from 'lucide-react';
import { useStore } from '../store/AppStore';

const CLIENT_TABS = [
  ['/cliente', 'Explorar', Search],
  ['/cliente/citas', 'Mis citas', CalendarDays],
  ['/cliente/perfil', 'Perfil', User],
];

const BARBER_TABS = [
  ['/barbero', 'Panel', LayoutDashboard],
  ['/barbero/agenda', 'Agenda', CalendarDays],
  ['/barbero/servicios', 'Servicios', Scissors],
  ['/barbero/portafolio', 'Fotos', Images],
  ['/barbero/pagos', 'Pagos', CreditCard],
];

function BottomNav({ tabs }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-line/60 bg-bg">
      <div className="flex">
        {tabs.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/cliente' || to === '/barbero'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                isActive ? 'text-ink' : 'text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`grid h-8 w-14 place-items-center rounded-full transition ${isActive ? 'bg-surface2' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Contenedor de las pestañas principales: contenido + barra inferior. */
export function TabsLayout({ role }) {
  const { role: current, loading } = useStore();
  if (loading) return null;
  if (current !== role) return <Navigate to="/" replace />;
  return (
    <>
      <main className="pb-24">
        <Outlet />
      </main>
      <BottomNav tabs={role === 'cliente' ? CLIENT_TABS : BARBER_TABS} />
    </>
  );
}

/** Pantallas de detalle (sin barra inferior) protegidas por rol. */
export function RoleGuard({ role }) {
  const { role: current, loading } = useStore();
  if (loading) return null;
  if (current !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
