import { fromMinutes, toDateTime, toMinutes, weekday } from './dates';

export const SLOT_STEP = 30; // minutos entre un turno y el siguiente

/**
 * Estado "real" de una cita: una cita confirmada cuya hora de fin ya pasó
 * se considera completada (en una versión real lo marcaría el backend).
 */
export function effectiveStatus(booking, now = new Date()) {
  if (booking.status !== 'confirmada') return booking.status;
  const end = toDateTime(booking.date, booking.time);
  end.setMinutes(end.getMinutes() + booking.duration);
  return end <= now ? 'completada' : 'confirmada';
}

/**
 * Turnos libres de un barbero para un día y una duración de servicio.
 * Excluye: días cerrados, choques con otras citas, la pausa de almuerzo
 * y horas que ya pasaron (si es hoy).
 */
export function getAvailableSlots({ barber, date, duration, bookings, excludeBookingId, now = new Date() }) {
  const day = barber.schedule[weekday(date)];
  if (!day?.open) return [];

  const start = toMinutes(day.start);
  const end = toMinutes(day.end);
  const breakStart = day.breakStart ? toMinutes(day.breakStart) : null;
  const breakEnd = day.breakEnd ? toMinutes(day.breakEnd) : null;

  const busy = bookings
    .filter(
      (b) => b.barberId === barber.id && b.date === date && b.status !== 'cancelada' && b.id !== excludeBookingId,
    )
    .map((b) => [toMinutes(b.time), toMinutes(b.time) + b.duration]);
  if (breakStart !== null && breakEnd !== null) busy.push([breakStart, breakEnd]);

  const slots = [];
  for (let t = start; t + duration <= end; t += SLOT_STEP) {
    const clash = busy.some(([s, e]) => t < e && t + duration > s);
    if (clash) continue;
    const time = fromMinutes(t);
    // Margen de 30 min para no reservar algo que empieza "ya mismo".
    if (toDateTime(date, time) <= new Date(now.getTime() + 30 * 60000)) continue;
    slots.push(time);
  }
  return slots;
}

/** ¿El barbero trabaja ese día? (para pintar el calendario) */
export const isOpenOn = (barber, date) => Boolean(barber.schedule[weekday(date)]?.open);
