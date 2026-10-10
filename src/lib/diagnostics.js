// Diagnóstico en el propio teléfono: guarda los últimos errores en localStorage
// (se ven en Perfil → Registro de errores) y, si la app se queda sin contenido
// (pantalla negra), recarga sola una vez.

const KEY = 'bookora-diag';
const RELOAD_KEY = 'bookora-last-auto-reload';

export function readDiagnostics() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function clearDiagnostics() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sin acceso a almacenamiento */
  }
}

export function recordError(message) {
  try {
    const entry = {
      at: new Date().toISOString(),
      screen: location.hash || '#/',
      message: String(message).slice(0, 600),
    };
    localStorage.setItem(KEY, JSON.stringify([entry, ...readDiagnostics()].slice(0, 15)));
  } catch {
    /* sin acceso a almacenamiento */
  }
}

export function installDiagnostics(root) {
  window.addEventListener('error', (e) => recordError(e.error?.stack || e.message));
  window.addEventListener('unhandledrejection', (e) => recordError(`Promesa: ${e.reason?.stack || e.reason}`));

  // Vigilante: si React deja #root vacío después de haber pintado algo,
  // la app se cayó. Se registra y se recarga (como mucho una vez cada 15 s).
  let painted = false;
  new MutationObserver(() => {
    if (root.childElementCount > 0) {
      painted = true;
      return;
    }
    if (!painted) return;
    recordError('La app se quedó sin contenido (pantalla negra) tras cambiar de pantalla.');
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
      if (Date.now() - last < 15000) {
        // Ya recargamos hace poco: no entramos en bucle, mostramos un aviso.
        root.insertAdjacentHTML(
          'beforeend',
          `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;text-align:center;color:#f2f2f4;font-family:system-ui,sans-serif">
            <p style="font-size:18px;font-weight:600">La pantalla no cargó</p>
            <button onclick="location.reload()" style="padding:12px 24px;border-radius:12px;border:0;background:#ced1d8;color:#0a0a0b;font-weight:600;font-size:16px">Recargar</button>
          </div>`,
        );
        return;
      }
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      /* si no hay sessionStorage, recargamos igualmente */
    }
    location.reload();
  }).observe(root, { childList: true });
}
