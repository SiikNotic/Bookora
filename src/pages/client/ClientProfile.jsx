import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Heart, LogOut } from 'lucide-react';
import DiagnosticsCard from '../../components/DiagnosticsCard';
import NotificationSettings from '../../components/NotificationSettings';
import { Avatar, TopBar } from '../../components/ui';
import { listBarbers, signOut, updateProfile } from '../../lib/api';
import { useFavorites } from '../../lib/favorites';
import { useAsync, useStore } from '../../store/AppStore';

export default function ClientProfile() {
  const { session, profile, refreshProfile, toast } = useStore();
  const [form, setForm] = useState({ full_name: profile?.full_name || '', phone: profile?.phone || '' });
  const [saving, setSaving] = useState(false);
  const [favorites] = useFavorites();
  const barbers = useAsync(listBarbers);
  const favBarbers = (barbers.data || []).filter((b) => favorites.includes(b.id));
  const changed = form.full_name.trim() !== (profile?.full_name || '') || form.phone.trim() !== (profile?.phone || '');

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(profile.id, { full_name: form.full_name.trim(), phone: form.phone.trim() || null });
      await refreshProfile();
      toast('Perfil actualizado');
    } catch (err) {
      toast(err.message, 'warn');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <TopBar title="Perfil" />
      <div className="px-4 pt-6">
        <div className="flex items-center gap-4">
          <Avatar name={profile?.full_name || 'Cliente'} size={64} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{profile?.full_name}</p>
            <p className="truncate text-sm text-muted">{session?.user?.email}</p>
          </div>
        </div>

        <form onSubmit={save} className="mt-6 space-y-3">
          <label className="block">
            <span className="label">Nombre y apellido</span>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              maxLength={60}
            />
          </label>
          <label className="block">
            <span className="label">Teléfono (opcional)</span>
            <input
              className="input"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              maxLength={25}
            />
          </label>
          <button
            type="submit"
            className="btn-secondary w-full"
            disabled={!changed || form.full_name.trim().length < 2 || saving}
          >
            Guardar
          </button>
        </form>

        <h2 className="mb-3 mt-7 flex items-center gap-2 font-semibold">
          <Heart size={16} /> Favoritos
        </h2>
        <div className="card divide-y divide-line/60">
          {favBarbers.map((b) => (
            <Link key={b.id} to={`/cliente/barbero/${b.id}`} className="flex items-center gap-3 p-3">
              <Avatar name={b.name} src={b.avatar} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{b.name}</span>
                <span className="block truncate text-xs text-muted">{b.municipio}</span>
              </span>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          ))}
          {!favBarbers.length && <p className="p-4 text-sm text-muted">Toca el ♥ en un barbero para guardarlo aquí.</p>}
        </div>

        <div className="card mt-7 divide-y divide-line/60">
          <MenuButton icon={LogOut} label="Cerrar sesión" onClick={() => signOut()} />
        </div>
        <NotificationSettings />
        <DiagnosticsCard />
        <p className="py-8 text-center text-xs text-muted">Bookora · versión {import.meta.env.VITE_APP_VERSION || '1.0'}</p>
      </div>
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
