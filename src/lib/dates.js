// Utilidades de fecha. Las fechas se guardan como 'YYYY-MM-DD' y las horas como 'HH:MM'
// en hora local del dispositivo (Puerto Rico = AST, sin cambio de horario).

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const pad = (n) => String(n).padStart(2, '0');

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export const today = () => toISODate(new Date());

export function weekday(iso) {
  return fromISODate(iso).getDay();
}

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(min) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

/** '14:30' -> '2:30 PM' */
export function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** '2026-10-12' -> 'Lun 12 oct' (o 'Hoy' / 'Mañana' / 'Ayer') */
export function formatDateShort(iso, { relative = true } = {}) {
  if (relative) {
    const t = today();
    if (iso === t) return 'Hoy';
    if (iso === addDays(t, 1)) return 'Mañana';
    if (iso === addDays(t, -1)) return 'Ayer';
  }
  const d = fromISODate(iso);
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** '2026-10-12' -> 'lunes, 12 de octubre de 2026' */
export function formatDateLong(iso) {
  return fromISODate(iso).toLocaleDateString('es-PR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Fecha+hora de una cita como objeto Date local. */
export function toDateTime(iso, hhmm) {
  const d = fromISODate(iso);
  const min = toMinutes(hhmm);
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d;
}

export function timeAgo(iso) {
  const days = Math.round((fromISODate(today()) - fromISODate(iso)) / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.round(days / 7)} sem.`;
  if (days < 365) return `hace ${Math.round(days / 30)} meses`;
  return `hace ${Math.round(days / 365)} años`;
}
