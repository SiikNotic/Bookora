import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { TopBar } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/AppStore';

/** Pantalla a la que lleva el enlace de "recuperar contraseña". */
export default function NewPassword() {
  const { session, toast } = useStore();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  if (session === null) return <Navigate to="/" replace />;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast(error.message, 'warn');
    toast('Contraseña actualizada');
    nav('/', { replace: true });
  };

  return (
    <div>
      <TopBar title="Nueva contraseña" />
      <form onSubmit={save} className="space-y-4 px-4 pt-6">
        <label className="block">
          <span className="label">Contraseña nueva (mínimo 6 caracteres)</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" disabled={password.length < 6 || busy} className="btn-primary w-full">
          Guardar
        </button>
      </form>
    </div>
  );
}
