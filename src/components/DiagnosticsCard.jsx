import { useState } from 'react';
import { Bug, Copy, Trash2 } from 'lucide-react';
import { clearDiagnostics, readDiagnostics } from '../lib/diagnostics';
import { useStore } from '../store/AppStore';

/** Lista los errores guardados en el teléfono para poder reportarlos. */
export default function DiagnosticsCard() {
  const { toast } = useStore();
  const [entries, setEntries] = useState(readDiagnostics);

  const text = entries.map((e) => `[${e.at}] ${e.screen}\n${e.message}`).join('\n\n');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${navigator.userAgent}\n\n${text}`);
      toast('Registro copiado');
    } catch {
      toast('No se pudo copiar; haz una captura de pantalla', 'warn');
    }
  };

  return (
    <>
      <h2 className="mb-3 mt-7 flex items-center gap-2 font-semibold">
        <Bug size={16} /> Registro de errores
      </h2>
      <div className="card p-4">
        {entries.length ? (
          <>
            <div className="max-h-56 space-y-3 overflow-y-auto">
              {entries.map((e, i) => (
                <div key={i} className="text-xs">
                  <p className="text-muted">
                    {new Date(e.at).toLocaleString('es-PR')} · {e.screen}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words font-mono text-ink/85">{e.message}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-secondary py-2.5 text-sm" onClick={copy}>
                <Copy size={15} /> Copiar
              </button>
              <button
                className="btn-secondary py-2.5 text-sm"
                onClick={() => {
                  clearDiagnostics();
                  setEntries([]);
                }}
              >
                <Trash2 size={15} /> Borrar
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">Sin errores registrados en este teléfono.</p>
        )}
      </div>
    </>
  );
}
