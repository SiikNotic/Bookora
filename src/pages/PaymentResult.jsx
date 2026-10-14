import { Navigate, useSearchParams } from 'react-router-dom';
import { CircleCheck, CircleX } from 'lucide-react';
import { LogoMark } from '../components/ui';
import { useStore } from '../store/AppStore';

/**
 * Página a la que vuelve Stripe tras el pago. En el APK el pago se hace en el
 * navegador del teléfono, así que aquí solo se indica volver a la app.
 */
export default function PaymentResult() {
  const [params] = useSearchParams();
  const { role, loading } = useStore();
  const ok = params.get('estado') === 'ok';
  const bookingId = params.get('cita');

  // Si se abre dentro de la app con sesión de cliente, se va directo a la cita
  if (!loading && role === 'cliente' && bookingId) {
    return <Navigate to={ok ? `/cliente/confirmada/${bookingId}` : '/cliente/citas'} replace />;
  }

  return (
    <div className="pt-safe flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <LogoMark className="h-16" />
      <div className={`mt-8 ${ok ? 'text-ok' : 'text-warn'}`}>{ok ? <CircleCheck size={48} /> : <CircleX size={48} />}</div>
      <h1 className="mt-4 text-xl font-semibold">{ok ? 'Pago recibido' : 'Pago cancelado'}</h1>
      <p className="mt-2 text-muted">
        {ok
          ? 'Tu cita está pagada. Vuelve a la app de Bookora para verla en "Mis citas".'
          : 'No se hizo ningún cargo. Vuelve a la app de Bookora para intentarlo de nuevo o elegir pagar en la barbería.'}
      </p>
    </div>
  );
}
