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

/** Número de tarjeta plausible: 13–19 dígitos y dígito verificador Luhn correcto. */
export function validCardNumber(digits) {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  }
  return sum % 10 === 0;
}
