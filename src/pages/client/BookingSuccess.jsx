import { Link, useParams } from 'react-router-dom';
import { CalendarCheck2, Clock3 } from 'lucide-react';
import { LoadError, Loading, Notice } from '../../components/ui';
import { getBooking } from '../../lib/api';
import { formatDateLong, formatTime } from '../../lib/dates';
import { money } from '../../lib/format';
import { useAsync } from '../../store/AppStore';

export default function BookingSuccess() {
  const { bookingId } = useParams();
  const res = useAsync(() => getBooking(bookingId), [bookingId]);
  if (!res.data)
    return res.error || res.data === null ? (
      <LoadError error={res.error || { message: 'Cita no encontrada' }} onRetry={res.reload} />
    ) : (
      <Loading />
    );

  const b = res.data;
  const waitingPayment = b.paymentMethod === 'stripe' && b.paymentStatus === 'pendiente';

  return (
    <div className="pt-safe pb-safe flex min-h-screen flex-col px-6">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div
          className={`grid h-24 w-24 place-items-center rounded-full ${waitingPayment ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok'}`}
        >
          {waitingPayment ? <Clock3 size={44} /> : <CalendarCheck2 size={44} />}
        </div>
        <h1 className="mt-6 text-2xl font-semibold">{waitingPayment ? 'Esperando tu pago' : '¡Cita confirmada!'}</h1>
        <p className="mt-2 text-muted">
          {b.barber?.name} te espera el <span className="text-ink first-letter:lowercase">{formatDateLong(b.date)}</span> a las{' '}
          <span className="text-ink">{formatTime(b.time)}</span>.
        </p>

        <div className="card mt-8 w-full space-y-2 p-4 text-left text-sm">
          <Row k="Servicio" v={b.serviceName} />
          <Row k="Lugar" v={`${b.barber?.shop || ''}${b.barber?.municipio ? `, ${b.barber.municipio}` : ''}`} />
          <Row
            k="Total"
            v={`${money(b.price + b.tip)} · ${
              b.paymentMethod === 'barberia'
                ? 'se paga en la barbería'
                : b.paymentStatus === 'pagado'
                  ? 'pagado en línea'
                  : 'pago pendiente'
            }`}
          />
          <Row k="Confirmación" v={<span className="font-mono">#{b.id.slice(0, 8).toUpperCase()}</span>} />
        </div>
        {waitingPayment && (
          <div className="mt-4 w-full">
            <Notice>
              Si ya pagaste, puede tardar unos segundos en reflejarse. Si no completas el pago en 30 minutos, el turno se libera.
            </Notice>
            <button className="btn-secondary mt-3 w-full" onClick={res.reload}>
              Actualizar
            </button>
          </div>
        )}
      </div>
      <div className="space-y-3 pb-8">
        <Link to="/cliente/citas" className="btn-primary w-full">
          Ver mis citas
        </Link>
        <Link to="/cliente" className="btn-secondary w-full">
          Volver a explorar
        </Link>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
