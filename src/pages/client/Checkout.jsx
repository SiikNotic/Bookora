import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Loader2, Lock, Smartphone } from 'lucide-react';
import { Avatar, DemoBanner, TopBar } from '../../components/ui';
import { formatDateLong, formatTime } from '../../lib/dates';
import { duration, money } from '../../lib/format';
import { getAvailableSlots } from '../../lib/slots';
import { getBarber, useStore } from '../../store/AppStore';

const TIPS = [0, 0.1, 0.15, 0.2];

/**
 * Pago SIMULADO. No se conecta a Stripe ni a ATH Móvil: solo imita el flujo
 * (resumen → propina → método → "procesando" → confirmación).
 */
export default function Checkout() {
  const { state: draft } = useLocation();
  const nav = useNavigate();
  const { state, actions } = useStore();
  const [tipPct, setTipPct] = useState(0.15);
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ number: '4242 4242 4242 4242', exp: '12/29', cvc: '123', name: state.clientName });
  const [athPhone, setAthPhone] = useState('(787) 555-0100');
  const [processing, setProcessing] = useState(false);

  const barber = draft && getBarber(state, draft.barberId);
  const service = barber?.services.find((s) => s.id === draft.serviceId);
  if (!barber || !service) return <Navigate to="/cliente" replace />;

  const tip = Math.round(service.price * tipPct * 100) / 100;
  const total = service.price + tip;
  const cardOk = card.number.replace(/\D/g, '').length >= 15 && /^\d{2}\/\d{2}$/.test(card.exp) && card.cvc.length >= 3;
  const canPay = method === 'ath' ? athPhone.replace(/\D/g, '').length >= 10 : cardOk;

  const pay = () => {
    setProcessing(true);
    // Simula la espera del procesador de pagos
    setTimeout(() => {
      const stillFree = getAvailableSlots({
        barber,
        date: draft.date,
        duration: service.duration,
        bookings: state.bookings,
      }).includes(draft.time);
      if (!stillFree) {
        setProcessing(false);
        actions.toast('Ese turno ya no está disponible. Elige otro.', 'warn');
        nav(-1);
        return;
      }
      const id = actions.createBooking({
        barber,
        service,
        date: draft.date,
        time: draft.time,
        tip,
        method: method === 'ath' ? 'ATH Móvil' : `Tarjeta •••• ${card.number.replace(/\D/g, '').slice(-4)}`,
        clientName: state.clientName,
      });
      nav(`/cliente/confirmada/${id}`, { replace: true });
    }, 1400);
  };

  return (
    <div className="pb-32">
      <TopBar back title="Pago" />
      <div className="space-y-5 px-4 pt-4">
        <DemoBanner>Modo demo: el pago es simulado y no se realizará ningún cargo. Puedes usar los datos de prueba.</DemoBanner>

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
          <p className="label">Método de pago</p>
          <div className="grid grid-cols-2 gap-2">
            <MethodButton active={method === 'card'} onClick={() => setMethod('card')} icon={CreditCard} label="Tarjeta" />
            <MethodButton active={method === 'ath'} onClick={() => setMethod('ath')} icon={Smartphone} label="ATH Móvil" />
          </div>
        </div>

        {method === 'card' ? (
          <div className="space-y-3">
            <Field label="Número de tarjeta">
              <input
                className="input font-mono"
                inputMode="numeric"
                value={card.number}
                onChange={(e) =>
                  setCard({
                    ...card,
                    number: e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 16)
                      .replace(/(.{4})/g, '$1 ')
                      .trim(),
                  })
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vence (MM/AA)">
                <input
                  className="input font-mono"
                  inputMode="numeric"
                  value={card.exp}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCard({ ...card, exp: v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v });
                  }}
                />
              </Field>
              <Field label="CVC">
                <input
                  className="input font-mono"
                  inputMode="numeric"
                  value={card.cvc}
                  onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                />
              </Field>
            </div>
            <Field label="Nombre en la tarjeta">
              <input className="input" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
            </Field>
          </div>
        ) : (
          <Field label="Teléfono registrado en ATH Móvil">
            <input className="input" inputMode="tel" value={athPhone} onChange={(e) => setAthPhone(e.target.value)} />
            <p className="mt-2 text-xs text-muted">En la versión real recibirías la solicitud de pago en tu app de ATH Móvil.</p>
          </Field>
        )}

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
        <button disabled={!canPay || processing} onClick={pay} className="btn-primary mb-3 w-full">
          {processing ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Procesando…
            </>
          ) : (
            <>
              <Lock size={16} /> Pagar {money(total)} (demo)
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
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
