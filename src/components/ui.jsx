// Componentes de interfaz reutilizables.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Info, Star, TriangleAlert, X } from 'lucide-react';
import { avatarArt } from '../lib/art';
import { useStore } from '../store/AppStore';

const asset = (p) => `${import.meta.env.BASE_URL}${p}`;

export function Wordmark({ className = 'h-7' }) {
  return <img src={asset('brand/wordmark.png')} alt="Bookora" className={`${className} w-auto select-none`} draggable={false} />;
}

export function LogoMark({ className = 'h-10' }) {
  return <img src={asset('brand/mark.png')} alt="" className={`${className} w-auto select-none`} draggable={false} />;
}

/** Barra superior con botón atrás opcional y acciones a la derecha. */
export function TopBar({ title, back, right, transparent = false }) {
  const nav = useNavigate();
  return (
    <header className={`pt-safe top-0 z-30 ${transparent ? 'absolute inset-x-0' : 'sticky border-b border-line/50 bg-bg'}`}>
      <div className="flex h-14 items-center gap-2 px-3">
        {back && (
          <button
            aria-label="Atrás"
            onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-ink active:bg-surface2"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className={`flex-1 truncate text-lg font-semibold ${back ? '' : 'pl-1'}`}>{title}</h1>
        {right}
      </div>
    </header>
  );
}

export function Avatar({ name, src, size = 48, className = '' }) {
  return (
    <img
      src={src || avatarArt(name)}
      alt={name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full object-cover ring-1 ring-line ${className}`}
    />
  );
}

export function Stars({ value, size = 14, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? 'fill-accent text-accent' : 'text-line'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

/** Selector de 1 a 5 estrellas. */
export function StarInput({ value, onChange }) {
  const labels = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', '¡Excelente!'];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${i} estrellas`} className="p-1 active:scale-90">
            <Star size={38} strokeWidth={1.4} className={i <= value ? 'fill-accent text-accent' : 'text-muted/50'} />
          </button>
        ))}
      </div>
      <span className="h-5 text-sm text-muted">{labels[value]}</span>
    </div>
  );
}

export function RatingPill({ avg, count }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star size={14} className="fill-accent text-accent" />
      <span className="font-semibold">{count ? avg.toFixed(1) : 'Nuevo'}</span>
      {count > 0 && <span className="text-muted">({count})</span>}
    </span>
  );
}

const STATUS = {
  confirmada: ['Confirmada', 'bg-accent/15 text-accent'],
  completada: ['Completada', 'bg-ok/15 text-ok'],
  cancelada: ['Cancelada', 'bg-bad/15 text-bad'],
  pagado: ['Pagado', 'bg-ok/15 text-ok'],
  reembolsado: ['Reembolsado', 'bg-warn/15 text-warn'],
};

export function StatusBadge({ status }) {
  const [label, cls] = STATUS[status] || [status, 'bg-surface2 text-muted'];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{label}</span>;
}

/** Aviso fijo de que todo es simulado. */
export function DemoBanner({ children = 'Modo demo: no se realizará ningún cargo real.' }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2.5 text-sm text-warn">
      <TriangleAlert size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Info, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-surface2 text-muted">
        <Icon size={28} />
      </div>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Control segmentado (pestañas compactas). */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl border border-line bg-surface p-1">
      {options.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
            value === key ? 'bg-surface2 text-ink shadow' : 'text-muted'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Hoja inferior (bottom sheet) estilo Android. */
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="animate-fade absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="animate-sheet pb-safe relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-line bg-surface">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface px-5 pb-2 pt-3">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" />
          <h2 className="pt-3 text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="mt-3 grid h-9 w-9 place-items-center rounded-full bg-surface2">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}

/** Diálogo de confirmación simple sobre Sheet. */
export function Confirm({ open, title, text, confirmLabel = 'Confirmar', danger, onConfirm, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-muted">{text}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button className="btn-secondary" onClick={onClose}>
          Volver
        </button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast flex w-full max-w-sm items-center gap-2 rounded-xl border border-line bg-surface2/95 px-4 py-3 text-sm shadow-2xl"
        >
          {t.tone === 'warn' ? (
            <TriangleAlert size={18} className="shrink-0 text-warn" />
          ) : (
            <CheckCircle2 size={18} className="shrink-0 text-ok" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="text-base font-semibold">{children}</h2>
      {action}
    </div>
  );
}

/** Interruptor tipo Android. */
export function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-accent' : 'bg-line'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full shadow transition-all ${checked ? 'left-6 bg-accent-ink' : 'left-1 bg-muted'}`}
      />
    </button>
  );
}
