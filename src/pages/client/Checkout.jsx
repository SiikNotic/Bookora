import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Loader2, Lock, Store } from 'lucide-react';
import { Avatar, LoadError, Loading, Notice, TopBar } from '../../components/ui';
import { book, cancelBooking, getBarber, startCheckout } from '../../lib/api';
import { formatDateLong, formatTime } from '../../lib/dates';
import { duration, money } from '../../lib/format';
import { useAsync, useStore } from '../../store/AppStore';

const TIPS = [0, 0.1, 0.15, 0.2];

/**
 * Confirmar y pagar. Dos opciones:
 * - En la barbería: la cita queda confirmada y se paga al llegar.
 * - En línea: se abre la página segura de Stripe; la tarjeta nunca pasa por la app.
 */
export default function Checkout() {
  const { state: draft } = useLocation();
  const nav = useNavigate();
  const { toast } = useStore();
  const [tipPct, setTipPct] = useState(0.15);
  const [method, setMethod] = useState('barberia');
  const [processing, setProcessing] = useState(false);
  const res = useAsync(() => (draft ? getBarber(draft.barberId) : null), [draft?.barberId]);

  if (!draft) return <Navigate to="/cliente" replace />;
  if (!res.data) {
    return (
      <div>
        <TopBar back title="Confirmar cita" />
        {res.error ? <LoadError error={res.error} onRetry={res.reload} /> : <Loading />}
      </div>
    );
  }
  const barber = res.data;
  const service = barber.services.find((s) => s.id === draft.serviceId);
  if (!service) return <Navigate to="/cliente" replace />;

  const tip = Math.round(service.price * tipPct * 100) / 100;
  const total = service.price + tip;

  const confirm = async () => {
    setProcessing(true);
    let booking;
    try {
      booking = await book({ serviceId: service.id, date: draft.date, time: draft.time, tip, method });
      if (method === 'barberia') {
        nav(`/cliente/confirmada/${booking.id}`, { replace: true });
        return;
      }
      window.location.href = await startCheckout(booking.id);
    } catch (e) {
      // Si no se pudo abrir el pago en línea, se libera el turno reservado
      if (booking && method === 'stripe') await cancelBooking(booking.id).catch(() => {});
      setProcessing(false);
      toast(e.message, 'warn');
      if (/no está disponible/.test(e.message)) nav(-1);
    }
  };

  return (
    <div className="pb-32">
      <TopBar back title="Confirmar cita" />
      <div className="space-y-5 px-4 pt-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <Avatar name={barber.name} src={barber.avatar} size={44} />
            <div className="min-w-0">
              <p className="truncate font-medium">{barber.name}</p>
              <p className="truncate text-sm text-muted">{barber.shop}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Servicio" value={service.name} />
            <Row label="Fecha" value={<span className="first-letter:uppercase">{formatDateLong(draft.date)}</span>} />
            <Row label="Hora" value={formatTime(draft.time)} />
            <Row label="Duración" value={duration(service.duration)} />
            <Row label="Lugar" value={[barber.address, barber.municipio].filter(Boolean).join(', ')} />
          </dl>
        </div>

        <div>
          <p className="label">Propina</p>
          <div className="grid grid-cols-4 gap-2">
            {TIPS.map((p) => (
              <button
                key={p}
                onClick={() => setTipPct(p)}
                className={`rounded-xl border py-2.5 text-sm font-medium ${tipPct === p ? 'chip-active' : 'border-line bg-surface'}`}
              >
                {p ? `${p * 100}%` : 'Sin'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label">¿Cómo vas a pagar?</p>
          <div className="grid grid-cols-2 gap-2">
            <MethodButton
              active={method === 'barberia'}
              onClick={() => setMethod('barberia')}
              icon={Store}
              label="En la barbería"
            />
            <MethodButton active={method === 'stripe'} onClick={() => setMethod('stripe')} icon={CreditCard} label="En línea" />
          </div>
          <p className="mt-2 text-xs text-muted">
            {method === 'barberia'
              ? 'Pagas al llegar, como acuerdes con tu barbero (efectivo, ATH Móvil o tarjeta).'
              : 'Pagas ahora con tarjeta en la página segura de Stripe.'}
          </p>
        </div>

        {method === 'stripe' && <Notice tone="info">Tienes 30 minutos para completar el pago; si no, el turno se libera.</Notice>}

        <div className="card space-y-2 p-4 text-sm">
          <Row label="Servicio" value={money(service.price)} />
          <Row label="Propina" value={money(tip)} />
          <div className="my-2 border-t border-line/70" />
          <Row
            label={<span className="text-base font-semibold text-ink">Total</span>}
            value={<span className="text-base font-semibold">{money(total)}</span>}
          />
        </div>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line/60 bg-bg px-4 pt-3">
        <button disabled={processing} onClick={confirm} className="btn-primary mb-3 w-full">
          {processing ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Procesando…
            </>
          ) : method === 'barberia' ? (
            'Confirmar cita'
          ) : (
            <>
              <Lock size={16} /> Pagar {money(total)}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function MethodButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border py-3 font-medium transition ${
        active ? 'border-accent/80 bg-surface2' : 'border-line bg-surface text-muted'
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );
}
