import { createClient } from '@supabase/supabase-js';

export const APP_URL = import.meta.env.VITE_APP_URL;

// detectSessionInUrl desactivado: la app usa rutas con "#", así que los enlaces de
// los emails (que traen el token en el "#") se procesan a mano en consumeAuthRedirect().
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

/**
 * Si la URL viene de un email de Supabase (#access_token=...&type=...), abre la
 * sesión y deja la ruta adecuada. Se llama una vez antes de montar la app.
 */
export async function consumeAuthRedirect() {
  const hash = window.location.hash.slice(1);
  if (!hash.includes('access_token=') && !hash.includes('error_description=')) return;
  const p = new URLSearchParams(hash);
  let route = '/';
  if (p.get('error_description')) {
    route = `/?aviso=${encodeURIComponent(p.get('error_description'))}`;
  } else {
    const { error } = await supabase.auth.setSession({
      access_token: p.get('access_token'),
      refresh_token: p.get('refresh_token'),
    });
    if (error) route = `/?aviso=${encodeURIComponent('El enlace expiró. Pide uno nuevo.')}`;
    else if (p.get('type') === 'recovery') route = '/nueva-clave';
  }
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${route}`);
}
