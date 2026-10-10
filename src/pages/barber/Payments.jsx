import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { DemoBanner, EmptyState, Segmented, StatusBadge, TopBar } from '../../components/ui';
import { addDays, formatDateShort, today } from '../../lib/dates';
import { money } from '../../lib/format';
import { useStore } from '../../store/AppStore';
import { useMyBarber } from './Dashboard';

const RANGES = [
  ['7', '7 días'],
  ['30', '30 días'],
  ['todo', 'Todo'],
];

export default function Payments() {
  const { state } = useStore();
  const me = useMyBarber();
  const [range, setRange] = useState('30');

  const from = range === 'todo' ? '0000-00-00' : addDays(today(), -Number(range));
  const list = state.payments
    .filter((p) => p.barberId === me.id && p.date >= from && p.date <= today())
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const paid = list.filter((p) => p.status === 'pagado');
  const services = paid.reduce((s, p) => s + p.amount, 0);
  const tips = paid.reduce((s, p) => s + p.tip, 0);
  const refunded = list.filter((p) => p.status === 'reembolsado').reduce((s, p) => s + p.amount + p.tip, 0);

  return (
    <div>
      <TopBar title="Pagos recibidos" />
      <div className="px-4 pt-4">
        <DemoBanner>Pagos simulados: no hay dinero real ni conexión con bancos.</DemoBanner>
        <div className="mt-4">
          <Segmented options={RANGES} value={range} onChange={setRange} />
        </div>

        <div className="card mt-4 p-4">
          <p className="text-sm text-muted">Total cobrado</p>
          <p className="silver-text mt-1 text-4xl font-bold">{money(services + tips)}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-muted">Servicios</p>
              <p className="font-semibold">{money(services)}</p>
            </div>
            <div>
              <p className="text-muted">Propinas</p>
              <p className="font-semibold">{money(tips)}</p>
            </div>
            <div>
              <p className="text-muted">Reembolsos</p>
              <p className="font-semibold">{money(refunded)}</p>
            </div>
          </div>
        </div>

        <h2 className="mb-3 mt-6 font-semibold">Movimientos ({list.length})</h2>
        <div className="card divide-y divide-line/60">
          {list.map((p) => {
            const booking = state.bookings.find((b) => b.id === p.bookingId);
            return (
              <div key={p.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.clientName}</p>
                  <p className="truncate text-xs text-muted">
                    {booking?.serviceName} · {p.method} · {formatDateShort(p.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${p.status === 'reembolsado' ? 'text-muted line-through' : ''}`}>
                    {money(p.amount + p.tip)}
                  </p>
                  {p.status === 'reembolsado' ? (
                    <StatusBadge status="reembolsado" />
                  ) : (
                    p.tip > 0 && <p className="text-xs text-ok">+{money(p.tip)} propina</p>
                  )}
                </div>
              </div>
            );
          })}
          {!list.length && <EmptyState icon={Receipt} title="Sin pagos en este periodo" />}
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}
