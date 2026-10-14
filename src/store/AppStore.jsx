// Sesión (Supabase Auth), perfil del usuario y avisos (toasts).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getProfile } from '../lib/api';
import { supabase } from '../lib/supabase';

const StoreContext = createContext(null);

export function AppStoreProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  const refreshProfile = useCallback(async () => {
    if (!userId) return setProfile(null);
    try {
      setProfile(await getProfile(userId));
    } catch (e) {
      // Sin perfil no podemos saber el rol: se muestra la pantalla de reintento
      setProfile({ id: userId, role: null, full_name: '', loadError: true });
      toast(e.message, 'warn');
    }
  }, [userId, toast]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      session,
      userId,
      profile,
      role: profile?.role ?? null,
      loading: session === undefined || (Boolean(userId) && !profile),
      refreshProfile,
      toast,
      toasts,
    }),
    [session, userId, profile, refreshProfile, toast, toasts],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <AppStoreProvider>');
  return ctx;
}

/**
 * Carga datos con una función async. Recarga al volver a la app (por ejemplo
 * después de pagar en Stripe) y expone reload() para refrescar tras un cambio.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      setState({ data: await run(), error: null, loading: false });
    } catch (e) {
      setState((s) => ({ ...s, error: e, loading: false }));
    }
  }, [run]);

  useEffect(() => {
    reload();
    const onVisible = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  return { ...state, reload };
}
