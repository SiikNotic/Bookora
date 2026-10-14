import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Loader2, MailCheck, Scissors, UserRound } from 'lucide-react';
import { Loading, LogoMark, Notice, Segmented, Wordmark } from '../components/ui';
import { resetPassword, signIn, signOut, signUp } from '../lib/api';
import { useStore } from '../store/AppStore';

/** Entrar o crear cuenta (email y contraseña). */
export default function Welcome() {
  const { session, role, profile, loading, refreshProfile, toast } = useStore();
  const [params] = useSearchParams();
  const [mode, setMode] = useState('entrar');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'cliente' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null); // email al que se envió confirmación / recuperación
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (loading) return <Loading />;
  if (role === 'cliente') return <Navigate to="/cliente" replace />;
  if (role === 'barbero') return <Navigate to="/barbero" replace />;
  if (session && profile?.loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="font-semibold">No pudimos cargar tu cuenta</p>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => signOut()}>
            Salir
          </button>
          <button className="btn-primary" onClick={refreshProfile}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'entrar') {
        await signIn(form.email, form.password);
      } else if (mode === 'crear') {
        const { needsConfirmation } = await signUp(form);
        if (needsConfirmation) setSent(form.email);
      } else {
        await resetPassword(form.email);
        setSent(form.email);
      }
    } catch (err) {
      toast(err.message, 'warn');
    } finally {
      setBusy(false);
    }
  };

  const valid =
    /\S+@\S+\.\S+/.test(form.email) &&
    (mode === 'olvido' || form.password.length >= 6) &&
    (mode !== 'crear' || form.fullName.trim().length >= 2);

  return (
    <div className="pt-safe pb-safe flex min-h-screen flex-col px-6">
      <div className="flex flex-col items-center pt-12 text-center">
        <LogoMark className="h-20" />
        <Wordmark className="mt-4 h-9" />
        <p className="mt-3 max-w-xs text-sm text-muted">Encuentra tu barbero en Puerto Rico y agenda en segundos.</p>
      </div>

      {params.get('aviso') && (
        <div className="mt-6">
          <Notice>{params.get('aviso')}</Notice>
        </div>
      )}

      {sent ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-ok/15 text-ok">
            <MailCheck size={30} />
          </div>
          <p className="mt-4 font-semibold">Revisa tu email</p>
          <p className="mt-1 text-sm text-muted">
            Te enviamos un enlace a <span className="text-ink">{sent}</span>.
            {mode === 'crear'
              ? ' Ábrelo para confirmar tu cuenta y luego entra aquí.'
              : ' Ábrelo para crear una contraseña nueva.'}
          </p>
          <button
            className="btn-secondary mt-6"
            onClick={() => {
              setSent(null);
              setMode('entrar');
            }}
          >
            Volver a entrar
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode !== 'olvido' && (
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                ['entrar', 'Entrar'],
                ['crear', 'Crear cuenta'],
              ]}
            />
          )}
          {mode === 'olvido' && <p className="font-semibold">Recuperar contraseña</p>}

          {mode === 'crear' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <RoleButton
                  active={form.role === 'cliente'}
                  onClick={() => setForm({ ...form, role: 'cliente' })}
                  icon={UserRound}
                >
                  Soy cliente
                </RoleButton>
                <RoleButton
                  active={form.role === 'barbero'}
                  onClick={() => setForm({ ...form, role: 'barbero' })}
                  icon={Scissors}
                >
                  Soy barbero
                </RoleButton>
              </div>
              <Field label="Nombre y apellido">
                <input className="input" autoComplete="name" value={form.fullName} onChange={set('fullName')} maxLength={60} />
              </Field>
            </>
          )}
          <Field label="Email">
            <input
              className="input"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={form.email}
              onChange={set('email')}
            />
          </Field>
          {mode !== 'olvido' && (
            <Field label="Contraseña">
              <input
                className="input"
                type="password"
                autoComplete={mode === 'crear' ? 'new-password' : 'current-password'}
                value={form.password}
                onChange={set('password')}
                minLength={6}
              />
            </Field>
          )}

          <button type="submit" disabled={!valid || busy} className="btn-primary w-full">
            {busy && <Loader2 size={18} className="animate-spin" />}
            {mode === 'entrar' ? 'Entrar' : mode === 'crear' ? 'Crear cuenta' : 'Enviar enlace'}
          </button>
          <button type="button" className="btn-ghost w-full" onClick={() => setMode(mode === 'olvido' ? 'entrar' : 'olvido')}>
            {mode === 'olvido' ? 'Volver' : '¿Olvidaste tu contraseña?'}
          </button>
        </form>
      )}
    </div>
  );
}

function RoleButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border py-3 font-medium transition ${
        active ? 'border-accent/80 bg-surface2' : 'border-line bg-surface text-muted'
      }`}
    >
      <Icon size={18} /> {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
