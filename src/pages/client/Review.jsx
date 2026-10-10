import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar, StarInput, TopBar } from '../../components/ui';
import { formatDateShort } from '../../lib/dates';
import { effectiveStatus } from '../../lib/slots';
import { getBarber, useStore } from '../../store/AppStore';

const QUICK = ['Puntual', 'Buen ambiente', 'Corte perfecto', 'Muy limpio', 'Buen precio'];

export default function Review() {
  const { bookingId } = useParams();
  const nav = useNavigate();
  const { state, actions } = useStore();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const booking = state.bookings.find((b) => b.id === bookingId && b.isMe);
  // Solo se reseña una cita propia, completada y sin reseña previa
  if (!booking || booking.reviewId || effectiveStatus(booking) !== 'completada') return <Navigate to="/cliente/citas" replace />;
  const barber = getBarber(state, booking.barberId);

  const submit = () => {
    actions.addReview({ booking, rating, comment: comment.trim(), author: state.clientName });
    actions.toast('¡Gracias por tu reseña!');
    nav('/cliente/citas', { replace: true });
  };

  return (
    <div className="pb-10">
      <TopBar back title="Tu reseña" />
      <div className="px-4 pt-6">
        <div className="flex flex-col items-center text-center">
          <Avatar name={barber.name} src={barber.avatar} size={72} />
          <p className="mt-3 font-semibold">{barber.name}</p>
          <p className="text-sm text-muted">
            {booking.serviceName} · {formatDateShort(booking.date)}
          </p>
          <p className="mb-4 mt-6 text-lg">¿Cómo te fue?</p>
          <StarInput value={rating} onChange={setRating} />
        </div>

        <div className="no-scrollbar mt-6 flex flex-wrap justify-center gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              className="chip"
              onClick={() => setComment((c) => (c.includes(q) ? c : `${c}${c && !/[\s.]$/.test(c) ? '. ' : ''}${q}`))}
            >
              + {q}
            </button>
          ))}
        </div>

        <label className="mt-6 block">
          <span className="label">Comentario (opcional)</span>
          <textarea
            className="input min-h-[120px] resize-none"
            maxLength={400}
            placeholder="Cuéntale a otros clientes cómo fue tu experiencia…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <span className="mt-1 block text-right text-xs text-muted">{comment.length}/400</span>
        </label>

        <button disabled={!rating} onClick={submit} className="btn-primary mt-6 w-full">
          Publicar reseña
        </button>
        <p className="mt-3 text-center text-xs text-muted">La reseña se guarda solo en este dispositivo (demo).</p>
      </div>
    </div>
  );
}
