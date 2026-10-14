import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { EmptyState, LoadError, Loading, Segmented, StatusBadge, TopBar } from '../../components/ui';
import { barberPayments } from '../../lib/api';
import { addDays, formatDateShort, toPR, today } from '../../lib/dates';
import { money } from '../../lib/format';
import { useAsync } from '../../store/AppStore';

const RANGES = [
  ['7', '7 días'],
  ['30', '30 días'],
  ['todo', 'Todo'],
];

/** Pagos recibidos: cobrados en la barbería o en línea, y reembolsos. */
export default function Payments() {
  const [range, setRange] = useState('30');
  const res = useAsync(() => barberPayments(range === 'todo' ? null : addDays(today(), -Number(range))), [range]);
  const list = res.data || [];
  const paid = list.filter((p) => p.paymentStatus === 'pagado');
  const services = paid.reduce((s, p) => s + p.price, 0);
  const tips = paid.reduce((s, p) => s + p.tip, 0);
  const refunded = list.filter((p) => p.paymentStatus === 'reembolsado').reduce((s, p) => s + p.price + p.tip, 0);

  return (
    <div>
      <TopBar title="Pagos recibidos" />
      <div className="px-4 pt-4">
        <Segmented options={RANGES} value={range} onChange={setRange} />

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
        {!res.data && (res.error ? <LoadError error={res.error} onRetry={res.reload} /> : <Loading />)}
        {res.data && (
          <div className="card divide-y divide-line/60">
            {list.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.clientName}</p>
                  <p className="truncate text-xs text-muted">
                    {p.serviceName} · {p.paymentMethod === 'stripe' ? 'En línea' : 'En la barbería'} ·{' '}
                    {formatDateShort(toPR(p.paidAt || p.startsAt).date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${p.paymentStatus === 'reembolsado' ? 'text-muted line-through' : ''}`}>
                    {money(p.price + p.tip)}
                  </p>
                  {p.paymentStatus === 'reembolsado' ? (
                    <StatusBadge status="reembolsado" />
                  ) : (
                    p.tip > 0 && <p className="text-xs text-ok">+{money(p.tip)} propina</p>
                  )}
                </div>
              </div>
            ))}
            {!list.length && (
              <EmptyState
                icon={Receipt}
                title="Sin pagos en este periodo"
                text="Los pagos en línea aparecen solos; los de la barbería, al marcarlos como cobrados en la Agenda."
              />
            )}
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}
