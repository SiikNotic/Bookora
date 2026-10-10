import { Link, Navigate, useParams } from 'react-router-dom';
import { CalendarCheck2 } from 'lucide-react';
import { DemoBanner } from '../../components/ui';
import { formatDateLong, formatTime } from '../../lib/dates';
import { money } from '../../lib/format';
import { getBarber, useStore } from '../../store/AppStore';

export default function BookingSuccess() {
  const { bookingId } = useParams();
  const { state } = useStore();
  const booking = state.bookings.find((b) => b.id === bookingId);
  if (!booking) return <Navigate to="/cliente/citas" replace />;
  const barber = getBarber(state, booking.barberId);
  const payment = state.payments.find((p) => p.id === booking.paymentId);

  return (
    <div className="pt-safe pb-safe flex min-h-screen flex-col px-6">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-ok/15 text-ok">
          <CalendarCheck2 size={44} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">¡Cita confirmada!</h1>
        <p className="mt-2 text-muted">
          {barber.name} te espera el <span className="text-ink first-letter:lowercase">{formatDateLong(booking.date)}</span> a las{' '}
          <span className="text-ink">{formatTime(booking.time)}</span>.
        </p>

        <div className="card mt-8 w-full space-y-2 p-4 text-left text-sm">
          <Row k="Servicio" v={booking.serviceName} />
          <Row k="Lugar" v={`${barber.shop}, ${barber.municipio}`} />
          <Row k="Pagado" v={`${money(booking.price + booking.tip)} · ${payment?.method}`} />
          <Row k="Confirmación" v={<span className="font-mono">#{booking.id.slice(-6).toUpperCase()}</span>} />
        </div>
        <div className="mt-4 w-full">
          <DemoBanner>Pago simulado: no se hizo ningún cargo.</DemoBanner>
        </div>
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
