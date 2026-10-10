const usd = new Intl.NumberFormat('es-PR', { style: 'currency', currency: 'USD' });

/** 25 -> '$25.00' */
export const money = (n) => usd.format(n || 0);

/** 90 -> '1 h 30 min' */
export function duration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
