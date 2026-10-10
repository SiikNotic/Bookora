import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Clock, Heart, MapPin, Phone, X } from 'lucide-react';
import { Avatar, Segmented, Stars, TopBar } from '../../components/ui';
import { coverArt } from '../../lib/art';
import { DAY_NAMES, formatTime, timeAgo, today, weekday } from '../../lib/dates';
import { duration, money } from '../../lib/format';
import { effectiveStatus } from '../../lib/slots';
import { getBarber, ratingFor, useStore } from '../../store/AppStore';

export default function BarberProfile() {
  const { id } = useParams();
  const { state, actions } = useStore();
  const [tab, setTab] = useState('servicios');
  const [photo, setPhoto] = useState(null);
  const barber = getBarber(state, id);
  if (!barber) return <Navigate to="/cliente" replace />;

  const rating = ratingFor(state.reviews, id);
  const clients = new Set(
    state.bookings.filter((b) => b.barberId === id && effectiveStatus(b) === 'completada').map((b) => b.clientName),
  ).size;
  const fav = state.favorites.includes(id);
  const openNow = barber.schedule[weekday(today())]?.open;

  return (
    <div className="pb-28">
      <div className="relative h-64">
        <img src={barber.cover || coverArt(barber.id)} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-black/30" />
        <TopBar
          back
          transparent
          right={
            <button
              aria-label="Favorito"
              onClick={() => actions.toggleFavorite(id)}
              className="grid h-10 w-10 place-items-center rounded-full bg-black/40"
            >
              <Heart size={20} className={fav ? 'fill-accent text-accent' : ''} />
            </button>
          }
        />
        <div className="absolute bottom-0 left-4 flex translate-y-1/3 items-end gap-3">
          <Avatar name={barber.name} src={barber.avatar} size={84} className="ring-4 ring-bg" />
        </div>
      </div>

      <div className="mt-10 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{barber.name}</h1>
            <p className="text-muted">{barber.shop}</p>
          </div>
          <span
            className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              openNow ? 'bg-ok/15 text-ok' : 'bg-surface2 text-muted'
            }`}
          >
            {openNow ? 'Abierto hoy' : 'Cerrado hoy'}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="font-semibold">{rating.count ? rating.avg.toFixed(1) : '—'}</span>
          <Stars value={rating.avg} />
          <span className="text-muted">({rating.count})</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
          <MapPin size={15} /> {barber.address}, {barber.municipio}
        </p>

        <div className="card mt-4 grid grid-cols-3 divide-x divide-line/70 py-3 text-center">
          <Stat label="Clientes" value={clients} />
          <Stat label="Experiencia" value={`${barber.years} años`} />
          <Stat label="Reseñas" value={rating.count} />
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink/85">{barber.bio}</p>

        <div className="mt-5">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              ['servicios', 'Servicios'],
              ['fotos', 'Fotos'],
              ['resenas', 'Reseñas'],
              ['horario', 'Horario'],
            ]}
          />
        </div>

        {tab === 'servicios' && (
          <div className="mt-4 space-y-3">
            {barber.services.map((s) => (
              <div key={s.id} className="card flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="mt-0.5 text-sm text-muted">{s.description}</p>
                  <p className="mt-2 flex items-center gap-3 text-sm">
                    <span className="font-semibold">{money(s.price)}</span>
                    <span className="flex items-center gap-1 text-muted">
                      <Clock size={13} /> {duration(s.duration)}
                    </span>
                  </p>
                </div>
                <Link to={`/cliente/reservar/${id}?servicio=${s.id}`} className="chip shrink-0 bg-surface2">
                  Reservar
                </Link>
              </div>
            ))}
          </div>
        )}

        {tab === 'fotos' && (
          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {barber.portfolio.map((p) => (
              <button key={p.id} onClick={() => setPhoto(p)} className="aspect-square overflow-hidden rounded-lg">
                <img src={p.src} alt={p.label} className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
            {!barber.portfolio.length && <p className="col-span-3 py-8 text-center text-muted">Aún no hay fotos.</p>}
          </div>
        )}

        {tab === 'resenas' && (
          <div className="mt-4 space-y-3">
            <div className="card flex items-center gap-4 p-4">
              <p className="silver-text text-4xl font-bold">{rating.count ? rating.avg.toFixed(1) : '—'}</p>
              <div>
                <Stars value={rating.avg} size={16} />
                <p className="mt-1 text-sm text-muted">{rating.count} reseñas verificadas</p>
              </div>
            </div>
            {rating.list
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((r) => (
                <ReviewItem key={r.id} review={r} />
              ))}
          </div>
        )}

        {tab === 'horario' && (
          <div className="card mt-4 divide-y divide-line/60">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const day = barber.schedule[d];
              const isToday = weekday(today()) === d;
              return (
                <div key={d} className={`flex justify-between px-4 py-3 text-sm ${isToday ? 'font-semibold' : ''}`}>
                  <span>
                    {DAY_NAMES[d]}
                    {isToday && <span className="ml-2 text-xs text-accent">hoy</span>}
                  </span>
                  <span className={day.open ? '' : 'text-muted'}>
                    {day.open ? `${formatTime(day.start)} – ${formatTime(day.end)}` : 'Cerrado'}
                  </span>
                </div>
              );
            })}
            <a href={`tel:${barber.phone.replace(/\D/g, '')}`} className="flex items-center gap-2 px-4 py-3 text-sm text-accent">
              <Phone size={15} /> {barber.phone}
            </a>
          </div>
        )}
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line/60 bg-bg px-4 pt-3">
        <div className="flex items-center gap-4 pb-3">
          <div>
            <p className="text-xs text-muted">Desde</p>
            <p className="text-lg font-semibold">{money(Math.min(...barber.services.map((s) => s.price)))}</p>
          </div>
          <Link to={`/cliente/reservar/${id}`} className="btn-primary flex-1">
            Reservar cita
          </Link>
        </div>
      </div>

      {photo && (
        <div className="animate-fade fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setPhoto(null)}>
          <div className="pt-safe flex justify-end p-3">
            <button aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full bg-surface2">
              <X size={20} />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            <img src={photo.src} alt={photo.label} className="max-h-full max-w-full rounded-xl" />
          </div>
          <p className="pb-safe pb-8 text-center text-muted">{photo.label}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

export function ReviewItem({ review }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <Avatar name={review.author} size={36} />
        <div className="flex-1">
          <p className="text-sm font-medium">{review.author}</p>
          <Stars value={review.rating} size={12} />
        </div>
        <span className="text-xs text-muted">{timeAgo(review.date)}</span>
      </div>
      {review.comment && <p className="mt-3 text-sm text-ink/85">{review.comment}</p>}
    </div>
  );
}
