// Datos de demostración de Bookora. Todo es ficticio: barberos, barberías,
// direcciones, clientes y reseñas fueron inventados para la demo.
import { portfolioArt } from '../lib/art';
import { addDays, fromMinutes, today, toMinutes, weekday } from '../lib/dates';

export const MUNICIPIOS = [
  'San Juan',
  'Bayamón',
  'Carolina',
  'Guaynabo',
  'Caguas',
  'Ponce',
  'Mayagüez',
  'Arecibo',
  'Humacao',
  'Dorado',
];

// Horario base: martes a sábado (el lunes y el domingo muchas barberías cierran)
const H = (open, start = '09:00', end = '18:00', breakStart = '12:30', breakEnd = '13:30') =>
  open ? { open: true, start, end, breakStart, breakEnd } : { open: false, start, end, breakStart, breakEnd };

const scheduleTueSat = {
  0: H(false),
  1: H(false),
  2: H(true),
  3: H(true),
  4: H(true),
  5: H(true, '09:00', '20:00'),
  6: H(true, '08:00', '16:00', null, null),
};
const scheduleMonSat = {
  0: H(false),
  1: H(true),
  2: H(true),
  3: H(true),
  4: H(true),
  5: H(true),
  6: H(true, '08:00', '15:00', null, null),
};
const scheduleLate = {
  0: H(true, '10:00', '15:00', null, null),
  1: H(false),
  2: H(true, '11:00', '20:00', '15:00', '15:30'),
  3: H(true, '11:00', '20:00', '15:00', '15:30'),
  4: H(true, '11:00', '21:00', '15:00', '15:30'),
  5: H(true, '11:00', '21:00', '15:00', '15:30'),
  6: H(true, '09:00', '18:00', null, null),
};

const svc = (id, name, duration, price, description) => ({ id, name, duration, price, description });

const pf = (barberId, items) =>
  items.map(([label, motif], i) => ({ id: `${barberId}-pf${i + 1}`, src: portfolioArt(`${barberId}${i}`, label, motif), label }));

export const BARBERS = [
  {
    id: 'b1',
    name: 'Carlos “El Maestro” Rivera',
    shop: 'Maestro Barber Studio',
    municipio: 'San Juan',
    address: 'Calle Loíza 1820, Santurce',
    phone: '(787) 555-0142',
    years: 12,
    bio: 'Especialista en fades y diseños a navaja. Más de 12 años en Santurce, atención por cita y buen ambiente.',
    specialties: ['Fade', 'Diseños', 'Navaja'],
    schedule: scheduleTueSat,
    services: [
      svc('b1s1', 'Recorte clásico', 45, 20, 'Corte a tijera y máquina, lavado y peinado.'),
      svc('b1s2', 'Fade + barba', 60, 30, 'Fade a tu gusto con perfilado de barba y toalla caliente.'),
      svc('b1s3', 'Diseño a navaja', 30, 12, 'Líneas o diseño personalizado (añádelo a tu corte).'),
      svc('b1s4', 'Corte de niño (hasta 12)', 30, 15, 'Recorte rápido y cómodo para los más pequeños.'),
    ],
    portfolio: pf('b1', [
      ['Low fade', 'maquina'],
      ['Diseño lateral', 'navaja'],
      ['Fade + barba', 'barba'],
      ['Taper', 'tijera'],
      ['Burst fade', 'maquina'],
      ['Clásico', 'peine'],
    ]),
  },
  {
    id: 'b2',
    name: 'Javier Ortiz',
    shop: 'Ortiz Cuts',
    municipio: 'Bayamón',
    address: 'Ave. Main 45, Santa Rosa',
    phone: '(787) 555-0177',
    years: 7,
    bio: 'Cortes modernos, texturizados y cerquillos. Te asesoro según tu tipo de pelo.',
    specialties: ['Texturizado', 'Crop', 'Cejas'],
    schedule: scheduleMonSat,
    services: [
      svc('b2s1', 'Corte moderno', 45, 18, 'Crop, texturizado o el estilo que traigas en foto.'),
      svc('b2s2', 'Corte + cejas', 45, 22, 'Incluye perfilado de cejas.'),
      svc('b2s3', 'Barba completa', 30, 12, 'Arreglo de barba con navaja y aceite.'),
    ],
    portfolio: pf('b2', [
      ['French crop', 'tijera'],
      ['Texturizado', 'peine'],
      ['Mid fade', 'maquina'],
      ['Barba', 'barba'],
    ]),
  },
  {
    id: 'b3',
    name: 'Luis “Luigi” Santiago',
    shop: 'La Barbería del Sur',
    municipio: 'Ponce',
    address: 'Calle Comercio 12, Ponce Centro',
    phone: '(787) 555-0105',
    years: 20,
    bio: 'Barbería de tradición en el centro de Ponce. Afeitado clásico con toalla caliente.',
    specialties: ['Afeitado clásico', 'Clásico', 'Caballeros'],
    schedule: scheduleMonSat,
    services: [
      svc('b3s1', 'Corte de caballero', 40, 16, 'Corte tradicional con terminación a navaja.'),
      svc('b3s2', 'Afeitado clásico', 30, 15, 'Toalla caliente, espuma y navaja.'),
      svc('b3s3', 'Combo corte + afeitado', 70, 28, 'La experiencia completa.'),
    ],
    portfolio: pf('b3', [
      ['Afeitado', 'navaja'],
      ['Clásico', 'peine'],
      ['Side part', 'tijera'],
      ['Barbería', 'silla'],
    ]),
  },
  {
    id: 'b4',
    name: 'Ángel Morales',
    shop: 'Fade Factory PR',
    municipio: 'Carolina',
    address: 'Ave. Roberto Clemente 300, Villa Carolina',
    phone: '(787) 555-0190',
    years: 5,
    bio: 'Fades limpios y rápidos. Abro tarde y domingos para que no tengas excusa.',
    specialties: ['Fade', 'Domingos', 'Tarde'],
    schedule: scheduleLate,
    services: [
      svc('b4s1', 'Fade', 40, 18, 'Skin, low, mid o high fade.'),
      svc('b4s2', 'Fade + diseño', 50, 25, 'Fade con diseño a navaja.'),
      svc('b4s3', 'Line up', 20, 8, 'Solo perfilado de contornos.'),
    ],
    portfolio: pf('b4', [
      ['Skin fade', 'maquina'],
      ['High fade', 'maquina'],
      ['Line up', 'navaja'],
      ['Diseño', 'navaja'],
      ['Mid fade', 'tijera'],
    ]),
  },
  {
    id: 'b5',
    name: 'Yarelis Cruz',
    shop: 'Studio Y',
    municipio: 'Caguas',
    address: 'Calle Padial 58, Caguas Pueblo',
    phone: '(787) 555-0133',
    years: 9,
    bio: 'Barbera y estilista. Cortes para caballeros, niños y estilos cortos para damas.',
    specialties: ['Unisex', 'Niños', 'Color'],
    schedule: scheduleTueSat,
    services: [
      svc('b5s1', 'Corte caballero', 45, 20, 'Corte con lavado incluido.'),
      svc('b5s2', 'Corte corto dama', 60, 30, 'Pixie, undercut y estilos cortos.'),
      svc('b5s3', 'Color / decoloración', 90, 55, 'Tinte o platinado (precio base).'),
      svc('b5s4', 'Corte de niño', 30, 14, 'Paciencia incluida 😉'),
    ],
    portfolio: pf('b5', [
      ['Platinado', 'peine'],
      ['Undercut', 'maquina'],
      ['Pixie', 'tijera'],
      ['Niño', 'tijera'],
    ]),
  },
  {
    id: 'b6',
    name: 'Pedro “Pito” Vélez',
    shop: 'Vélez Barber Shop',
    municipio: 'Mayagüez',
    address: 'Calle Méndez Vigo 77, Mayagüez',
    phone: '(787) 555-0161',
    years: 15,
    bio: 'Clásicos y modernos en el oeste. Estudiantes del RUM con descuento (en la versión real 😉).',
    specialties: ['Estudiantes', 'Clásico', 'Fade'],
    schedule: scheduleMonSat,
    services: [
      svc('b6s1', 'Recorte', 30, 15, 'Recorte rápido.'),
      svc('b6s2', 'Fade + barba', 60, 25, 'Fade con barba perfilada.'),
      svc('b6s3', 'Arreglo de barba', 25, 10, 'Perfilado y aceite.'),
    ],
    portfolio: pf('b6', [
      ['Fade', 'maquina'],
      ['Barba', 'barba'],
      ['Clásico', 'peine'],
    ]),
  },
  {
    id: 'b7',
    name: 'Kevin Rosario',
    shop: 'Kings Barber Lounge',
    municipio: 'Guaynabo',
    address: 'Carr. 177 Km 2.1, Guaynabo',
    phone: '(787) 555-0118',
    years: 6,
    bio: 'Lounge premium: corte, barba, mascarilla y bebida de cortesía.',
    specialties: ['Premium', 'Barba', 'Spa'],
    schedule: scheduleTueSat,
    services: [
      svc('b7s1', 'Corte premium', 60, 35, 'Corte, lavado, mascarilla y peinado.'),
      svc('b7s2', 'Barba de lujo', 45, 25, 'Toalla caliente, vapor, navaja y bálsamo.'),
      svc('b7s3', 'Paquete King', 90, 55, 'Corte premium + barba de lujo.'),
    ],
    portfolio: pf('b7', [
      ['Paquete King', 'silla'],
      ['Barba de lujo', 'barba'],
      ['Pompadour', 'peine'],
      ['Taper', 'tijera'],
    ]),
  },
  {
    id: 'b8',
    name: 'Héctor Colón',
    shop: 'Barbería La Esquina',
    municipio: 'Arecibo',
    address: 'Calle Gonzalo Marín 9, Arecibo',
    phone: '(787) 555-0156',
    years: 11,
    bio: 'Barbería de barrio con precios justos. Rápido, limpio y con buena conversación.',
    specialties: ['Económico', 'Rápido', 'Fade'],
    schedule: scheduleMonSat,
    services: [
      svc('b8s1', 'Recorte', 30, 12, 'Recorte con máquina y tijera.'),
      svc('b8s2', 'Fade', 40, 15, 'Fade bien difuminado.'),
      svc('b8s3', 'Barba', 20, 8, 'Perfilado de barba.'),
    ],
    portfolio: pf('b8', [
      ['Fade', 'maquina'],
      ['Recorte', 'tijera'],
      ['Barba', 'barba'],
    ]),
  },
];

const CLIENT_NAMES = [
  'José A.',
  'Miguel R.',
  'Gabriel T.',
  'Andrés L.',
  'Daniel M.',
  'Christian P.',
  'Ramón F.',
  'Edwin S.',
  'Jonathan V.',
  'Xavier N.',
  'Luis D.',
  'Kelvin O.',
  'Manuel G.',
  'Ricardo B.',
];

const COMMENTS = {
  5: [
    'El mejor fade que me han hecho. Puntual y súper limpio.',
    'Excelente servicio, ya tengo barbero fijo. 💯',
    'Bien detallista con la barba. Lo recomiendo.',
    'Ambiente brutal y el corte quedó perfecto.',
    'Llegué con una foto y me lo dejó igualito.',
  ],
  4: [
    'Muy buen corte, tuve que esperar unos minutos.',
    'Buen trabajo y buen precio. Volveré.',
    'Me gustó, aunque el parking es complicado.',
  ],
  3: ['Bien, pero esperaba un poco más de detalle en los contornos.'],
};

// Generador pseudoaleatorio con semilla: los datos son iguales en cada reinicio.
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

export const DEMO_CLIENT_NAME = 'Alex Rivera';
export const DEMO_CARD = 'Visa •••• 4242';

/**
 * Crea el estado inicial de la demo con fechas relativas a hoy:
 * citas pasadas (con pagos y reseñas) y algunas próximas.
 */
export function createInitialState() {
  const r = rng(787);
  const t = today();
  const bookings = [];
  const payments = [];
  const reviews = [];
  let n = 1;

  // Busca el primer turno libre "redondo" para un barbero en una fecha
  const placeOn = (barber, date, service, preferred) => {
    const day = barber.schedule[weekday(date)];
    if (!day.open) return null;
    const taken = bookings.filter((b) => b.barberId === barber.id && b.date === date);
    for (const startMin of preferred) {
      const s = Math.max(toMinutes(day.start), startMin);
      const e = s + service.duration;
      if (e > toMinutes(day.end)) continue;
      if (day.breakStart && s < toMinutes(day.breakEnd) && e > toMinutes(day.breakStart)) continue;
      if (taken.some((b) => s < toMinutes(b.time) + b.duration && e > toMinutes(b.time))) continue;
      return fromMinutes(s);
    }
    return null;
  };

  const addBooking = ({ barber, service, date, time, clientName, isMe, tipPct = 0, method = DEMO_CARD }) => {
    const id = `bk${n++}`;
    const tip = Math.round(service.price * tipPct * 100) / 100;
    const booking = {
      id,
      barberId: barber.id,
      serviceId: service.id,
      serviceName: service.name,
      duration: service.duration,
      price: service.price,
      tip,
      date,
      time,
      clientName,
      isMe,
      status: 'confirmada',
      paymentId: `pay-${id}`,
      reviewId: null,
      createdAt: addDays(date, -3),
    };
    bookings.push(booking);
    payments.push({
      id: `pay-${id}`,
      bookingId: id,
      barberId: barber.id,
      clientName,
      amount: service.price,
      tip,
      method,
      date: booking.createdAt,
      status: 'pagado',
    });
    return booking;
  };

  const hours = [9, 10, 11, 14, 15, 16, 17].map((h) => h * 60);

  // Historial de otros clientes (para que cada barbero tenga agenda, pagos y reseñas)
  for (const barber of BARBERS) {
    for (let d = -45; d <= 10; d++) {
      const date = addDays(t, d);
      const perDay = d < 0 ? Math.floor(r() * 3) : Math.floor(r() * 3) + (barber.id === 'b1' ? 1 : 0);
      for (let k = 0; k < perDay; k++) {
        const service = pick(r, barber.services);
        const time = placeOn(
          barber,
          date,
          service,
          [...hours].sort(() => r() - 0.5),
        );
        if (!time) continue;
        const bk = addBooking({
          barber,
          service,
          date,
          time,
          clientName: pick(r, CLIENT_NAMES),
          isMe: false,
          tipPct: pick(r, [0, 0, 0.1, 0.15, 0.2]),
          method: r() < 0.3 ? 'ATH Móvil' : DEMO_CARD,
        });
        // ~60% de las citas pasadas dejan reseña
        if (d < -1 && r() < 0.6) {
          const rating = r() < 0.65 ? 5 : r() < 0.85 ? 4 : 3;
          const review = {
            id: `rv-${bk.id}`,
            barberId: barber.id,
            bookingId: bk.id,
            author: bk.clientName,
            rating,
            comment: pick(r, COMMENTS[rating]),
            date: addDays(date, 1),
          };
          reviews.push(review);
          bk.reviewId = review.id;
        }
      }
    }
  }

  // Citas del cliente demo: dos pasadas (una sin reseñar) y una próxima
  const firstOpenDay = (barber, from, step) => {
    let d = from;
    for (let i = 0; i < 14; i++, d = addDays(d, step)) if (barber.schedule[weekday(d)].open) return d;
    return from;
  };
  const [b1, b2, b4] = [BARBERS[0], BARBERS[1], BARBERS[3]];
  const me = (barber, service, date, prefs, tipPct) => {
    const time = placeOn(barber, date, service, prefs) || placeOn(barber, date, service, hours);
    return time ? addBooking({ barber, service, date, time, clientName: DEMO_CLIENT_NAME, isMe: true, tipPct }) : null;
  };
  const past1 = me(b2, b2.services[0], firstOpenDay(b2, addDays(t, -20), -1), [600, 660], 0.15);
  if (past1) {
    const review = {
      id: `rv-${past1.id}`,
      barberId: b2.id,
      bookingId: past1.id,
      author: DEMO_CLIENT_NAME,
      rating: 5,
      comment: 'Javier es un duro con el crop. ¡Gracias!',
      date: addDays(past1.date, 1),
    };
    reviews.push(review);
    past1.reviewId = review.id;
  }
  me(b1, b1.services[1], firstOpenDay(b1, addDays(t, -4), -1), [900, 960], 0.2); // pendiente de reseña
  me(b4, b4.services[0], firstOpenDay(b4, addDays(t, 2), 1), [1020, 1080], 0.1);

  return {
    version: 1,
    role: null, // 'cliente' | 'barbero'
    barberId: 'b1', // perfil activo en modo barbero
    clientName: DEMO_CLIENT_NAME,
    favorites: ['b1'],
    barbers: structuredClone(BARBERS),
    bookings,
    payments,
    reviews,
  };
}
