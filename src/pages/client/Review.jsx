import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar, Loading, StarInput, TopBar } from '../../components/ui';
import { addReview, myBookings } from '../../lib/api';
import { formatDateShort } from '../../lib/dates';
import { effectiveStatus } from '../../lib/slots';
import { useAsync, useStore } from '../../store/AppStore';

/** Nombre público en la reseña: "Alex Rivera" -> "Alex R." */
const publicName = (full) => {
  const [first = 'Cliente', ...rest] = full.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
};

const QUICK = ['Puntual', 'Buen ambiente', 'Corte perfecto', 'Muy limpio', 'Buen precio'];

export default function Review() {
  const { bookingId } = useParams();
  const nav = useNavigate();
  const { profile, toast } = useStore();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const res = useAsync(myBookings);

  if (!res.data) return <Loading />;
  const booking = res.data.find((b) => b.id === bookingId);
  // Solo se reseña una cita propia, completada y sin reseña previa (el servidor también lo exige)
  if (!booking || booking.reviewed || effectiveStatus(booking) !== 'completada') return <Navigate to="/cliente/citas" replace />;
  const barber = booking.barber;

  const submit = async () => {
    setSaving(true);
    try {
      await addReview({ booking, rating, comment: comment.trim(), author: publicName(profile?.full_name || '') });
      toast('¡Gracias por tu reseña!');
      nav('/cliente/citas', { replace: true });
    } catch (e) {
      setSaving(false);
      toast(e.message, 'warn');
    }
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

        <button disabled={!rating || saving} onClick={submit} className="btn-primary mt-6 w-full">
          Publicar reseña
        </button>
        <p className="mt-3 text-center text-xs text-muted">Tu reseña será pública con tu nombre y la inicial de tu apellido.</p>
      </div>
    </div>
  );
}
