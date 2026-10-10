import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ChevronRight, Scissors, UserRound } from 'lucide-react';
import { Avatar, LogoMark, Sheet, Wordmark } from '../components/ui';
import { useStore } from '../store/AppStore';

// No hay cuentas reales: el usuario elige con qué rol explorar la demo.
export default function Welcome() {
  const { state, actions } = useStore();
  const nav = useNavigate();
  const [pickBarber, setPickBarber] = useState(false);

  if (state.role === 'cliente') return <Navigate to="/cliente" replace />;
  if (state.role === 'barbero') return <Navigate to="/barbero" replace />;

  const enterAsClient = () => {
    actions.setRole('cliente');
    nav('/cliente');
  };
  const enterAsBarber = (id) => {
    actions.setRole('barbero', id);
    nav('/barbero');
  };

  return (
    <div className="pt-safe pb-safe flex min-h-screen flex-col px-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
        style={{ background: 'radial-gradient(60% 50% at 50% 30%, rgba(206,209,216,0.12), transparent 70%)' }}
      />
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <LogoMark className="h-28" />
        <Wordmark className="mt-6 h-11" />
        <p className="mt-4 max-w-xs text-muted">
          Encuentra tu barbero en Puerto Rico, agenda en segundos y paga desde el teléfono.
        </p>
      </div>

      <div className="relative space-y-3 pb-8">
        <button className="btn-primary w-full justify-between" onClick={enterAsClient}>
          <span className="flex items-center gap-3">
            <UserRound size={20} /> Soy cliente
          </span>
          <ChevronRight size={20} />
        </button>
        <button className="btn-secondary w-full justify-between" onClick={() => setPickBarber(true)}>
          <span className="flex items-center gap-3">
            <Scissors size={20} /> Soy barbero
          </span>
          <ChevronRight size={20} />
        </button>
        <p className="pt-3 text-center text-xs text-muted">Versión demo · Los datos se guardan solo en este dispositivo</p>
      </div>

      <Sheet open={pickBarber} onClose={() => setPickBarber(false)} title="Entrar como barbero">
        <p className="mb-4 text-sm text-muted">En la demo puedes usar cualquiera de estos perfiles ficticios.</p>
        <div className="space-y-2">
          {state.barbers.map((b) => (
            <button
              key={b.id}
              onClick={() => enterAsBarber(b.id)}
              className="card flex w-full items-center gap-3 p-3 text-left active:bg-surface2"
            >
              <Avatar name={b.name} src={b.avatar} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{b.name}</span>
                <span className="block truncate text-sm text-muted">
                  {b.shop} · {b.municipio}
                </span>
              </span>
              <ChevronRight size={18} className="text-muted" />
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
