// Utilidades de fecha. En la app las fechas van como 'YYYY-MM-DD' y las horas como
// 'HH:MM' en hora de Puerto Rico (AST, UTC-4 todo el año, sin cambio de horario),
// sin importar la zona horaria del teléfono. En la base de datos van como timestamptz.

export const PR_TZ = 'America/Puerto_Rico';
const PR_OFFSET = '-04:00';
const prParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: PR_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Instante (Date o ISO) -> { date: 'YYYY-MM-DD', time: 'HH:MM' } en hora de PR */
export function toPR(instant) {
  const p = Object.fromEntries(prParts.formatToParts(new Date(instant)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** 'YYYY-MM-DD' + 'HH:MM' (hora de PR) -> ISO con zona, para la base de datos */
export const toTimestamp = (iso, hhmm) => `${iso}T${hhmm}:00${PR_OFFSET}`;

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

export const today = () => toPR(new Date()).date;

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

/** Fecha+hora (hora de PR) como instante Date. */
export const toDateTime = (iso, hhmm) => new Date(toTimestamp(iso, hhmm));

export function timeAgo(iso) {
  const days = Math.round((fromISODate(today()) - fromISODate(iso)) / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.round(days / 7)} sem.`;
  if (days < 365) return `hace ${Math.round(days / 30)} meses`;
  return `hace ${Math.round(days / 365)} años`;
}
