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
        // Clases + addEventListener (sin style/onclick en línea, compatible con la CSP)
        const box = document.createElement('div');
        box.className = 'flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center text-ink';
        box.innerHTML = '<p class="text-lg font-semibold">La pantalla no cargó</p><button class="btn-primary">Recargar</button>';
        box.querySelector('button').addEventListener('click', () => location.reload());
        root.append(box);
        return;
      }
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      /* si no hay sessionStorage, recargamos igualmente */
    }
    location.reload();
  }).observe(root, { childList: true });
}
