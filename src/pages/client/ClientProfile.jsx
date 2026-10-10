import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Heart, LogOut, RotateCcw, Scissors, Smartphone } from 'lucide-react';
import DiagnosticsCard from '../../components/DiagnosticsCard';
import { Avatar, Confirm, TopBar } from '../../components/ui';
import { effectiveStatus } from '../../lib/slots';
import { getBarber, useStore } from '../../store/AppStore';

export default function ClientProfile() {
  const { state, actions } = useStore();
  const nav = useNavigate();
  const [name, setName] = useState(state.clientName);
  const [confirmReset, setConfirmReset] = useState(false);

  const mine = state.bookings.filter((b) => b.isMe);
  const done = mine.filter((b) => effectiveStatus(b) === 'completada').length;
  const reviews = state.reviews.filter((r) => mine.some((b) => b.id === r.bookingId)).length;

  return (
    <div>
      <TopBar title="Perfil" />
      <div className="px-4 pt-6">
        <div className="flex items-center gap-4">
          <Avatar name={state.clientName} size={64} />
          <div className="flex-1">
            <p className="text-lg font-semibold">{state.clientName}</p>
            <p className="text-sm text-muted">Cuenta demo de cliente</p>
          </div>
        </div>

        <div className="card mt-5 grid grid-cols-3 divide-x divide-line/70 py-3 text-center">
          <div>
            <p className="text-lg font-semibold">{mine.length}</p>
            <p className="text-xs text-muted">Citas</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{done}</p>
            <p className="text-xs text-muted">Completadas</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{reviews}</p>
            <p className="text-xs text-muted">Reseñas</p>
          </div>
        </div>

        <label className="mt-6 block">
          <span className="label">Tu nombre</span>
          <div className="flex gap-2">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            <button
              className="btn-secondary px-4"
              disabled={!name.trim() || name.trim() === state.clientName}
              onClick={() => {
                actions.setClientName(name.trim());
                actions.toast('Nombre actualizado');
              }}
            >
              Guardar
            </button>
          </div>
        </label>

        <h2 className="mb-3 mt-7 flex items-center gap-2 font-semibold">
          <Heart size={16} /> Favoritos
        </h2>
        <div className="card divide-y divide-line/60">
          {state.favorites.map((id) => {
            const b = getBarber(state, id);
            if (!b) return null;
            return (
              <Link key={id} to={`/cliente/barbero/${id}`} className="flex items-center gap-3 p-3">
                <Avatar name={b.name} src={b.avatar} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{b.name}</span>
                  <span className="block truncate text-xs text-muted">{b.municipio}</span>
                </span>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            );
          })}
          {!state.favorites.length && <p className="p-4 text-sm text-muted">Toca el ♥ en un barbero para guardarlo aquí.</p>}
        </div>

        <h2 className="mb-3 mt-7 font-semibold">Demo</h2>
        <div className="card divide-y divide-line/60">
          <MenuButton
            icon={Scissors}
            label="Cambiar a modo barbero"
            onClick={() => {
              actions.logout();
              nav('/');
            }}
          />
          <MenuButton icon={Smartphone} label="Instalar en Android" hint="Menú ⋮ de Chrome → Instalar app" />
          <MenuButton icon={RotateCcw} label="Reiniciar datos de la demo" onClick={() => setConfirmReset(true)} />
          <MenuButton
            icon={LogOut}
            label="Salir"
            onClick={() => {
              actions.logout();
              nav('/');
            }}
          />
        </div>
        <DiagnosticsCard />
        <p className="py-8 text-center text-xs text-muted">Bookora · versión demo 0.1</p>
      </div>

      <Confirm
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="¿Reiniciar la demo?"
        text="Se borrarán tus citas, reseñas y cambios, y se cargarán de nuevo los datos de ejemplo."
        confirmLabel="Reiniciar"
        danger
        onConfirm={() => {
          actions.resetDemo();
          actions.toast('Demo reiniciada');
        }}
      />
    </div>
  );
}

export function MenuButton({ icon: Icon, label, hint, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <Icon size={18} className="text-muted" />
      <span className="flex-1">
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      {onClick && <ChevronRight size={18} className="text-muted" />}
    </Tag>
  );
}
