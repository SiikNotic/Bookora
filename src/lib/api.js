// Acceso a datos (Supabase). Las pantallas usan estas funciones y reciben objetos
// ya adaptados a la app (fechas en hora de PR, números como Number, etc.).
import { supabase } from './supabase';
import { forgetPushToken } from './push';
import { addDays, toPR, toTimestamp } from './dates';

/** Devuelve data o lanza un Error con el mensaje del servidor (en español). */
function must({ data, error }) {
  if (error) throw new Error(friendly(error));
  return data;
}

function friendly(error) {
  const msg = error?.message || String(error);
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Sin conexión. Revisa tu internet e inténtalo otra vez.';
  if (/Invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirma tu email con el enlace que te enviamos antes de entrar.';
  if (/User already registered/i.test(msg)) return 'Ya existe una cuenta con ese email.';
  if (/Password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/rate limit/i.test(msg)) return 'Demasiados intentos. Espera unos minutos.';
  return msg;
}

const uid = async () => {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('Tu sesión expiró. Vuelve a entrar.');
  return id;
};

const publicUrl = (path) => supabase.storage.from('media').getPublicUrl(path).data.publicUrl;

// ---------- Adaptadores ----------
export const mapService = (r) => ({
  id: r.id,
  name: r.name,
  description: r.description,
  duration: r.duration_min,
  price: Number(r.price),
  active: r.active,
});

const mapPhoto = (r) => ({ id: r.id, path: r.path, label: r.label, position: r.position, src: publicUrl(r.path) });

export function mapBarber(r, rating) {
  return {
    id: r.id,
    name: r.name,
    shop: r.shop,
    municipio: r.municipio,
    address: r.address,
    phone: r.phone,
    years: r.years,
    bio: r.bio,
    avatar: r.avatar_url,
    schedule: r.schedule,
    services: (r.services || [])
      .filter((s) => s.active)
      .map(mapService)
      .sort((a, b) => a.price - b.price),
    portfolio: (r.portfolio_photos || []).map(mapPhoto).sort((a, b) => a.position - b.position),
    rating: { avg: Number(rating?.avg_rating || 0), count: rating?.review_count || 0 },
  };
}

export function mapBooking(r) {
  const { date, time } = toPR(r.starts_at);
  return {
    id: r.id,
    barberId: r.barber_id,
    clientId: r.client_id,
    clientName: r.client_name,
    serviceId: r.service_id,
    serviceName: r.service_name,
    duration: r.duration_min,
    price: Number(r.price),
    tip: Number(r.tip),
    date,
    time,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    status: r.status,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    paidAt: r.paid_at,
    rescheduled: r.rescheduled,
    // Hora nueva que propuso el barbero y el cliente aún no responde
    proposed: r.proposed_starts_at ? toPR(r.proposed_starts_at) : null,
    barber: r.barbers
      ? {
          id: r.barber_id,
          name: r.barbers.name,
          shop: r.barbers.shop,
          municipio: r.barbers.municipio,
          avatar: r.barbers.avatar_url,
        }
      : null,
  };
}

const mapReview = (r) => ({
  id: r.id,
  bookingId: r.booking_id,
  barberId: r.barber_id,
  author: r.author,
  rating: r.rating,
  comment: r.comment,
  date: toPR(r.created_at).date,
});

async function ratingsFor(ids) {
  if (!ids.length) return {};
  const rows = must(await supabase.from('barber_ratings').select('*').in('barber_id', ids));
  return Object.fromEntries(rows.map((r) => [r.barber_id, r]));
}

// ---------- Cuenta ----------
export async function signIn(email, password) {
  must(await supabase.auth.signInWithPassword({ email: email.trim(), password }));
}

export async function signUp({ email, password, fullName, role }) {
  const data = must(
    await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), role },
        emailRedirectTo: window.location.origin.startsWith('http') ? window.location.origin : undefined,
      },
    }),
  );
  return { needsConfirmation: !data.session };
}

export async function resetPassword(email) {
  must(await supabase.auth.resetPasswordForEmail(email.trim()));
}

export async function signOut() {
  await forgetPushToken().catch(() => {});
  await supabase.auth.signOut();
}

export async function getProfile(id) {
  return must(await supabase.from('profiles').select('*').eq('id', id).single());
}

export async function updateProfile(id, patch) {
  return must(await supabase.from('profiles').update(patch).eq('id', id).select().single());
}

// ---------- Barberos ----------
const BARBER_SELECT = '*, services(*), portfolio_photos(*)';

/** Barberos con al menos un servicio activo (los demás aún no completan su perfil). */
export async function listBarbers() {
  const rows = must(await supabase.from('barbers').select(BARBER_SELECT));
  const ratings = await ratingsFor(rows.map((r) => r.id));
  return rows.map((r) => mapBarber(r, ratings[r.id])).filter((b) => b.services.length);
}

export async function getBarber(id) {
  const row = must(await supabase.from('barbers').select(BARBER_SELECT).eq('id', id).maybeSingle());
  if (!row) return null;
  const ratings = await ratingsFor([id]);
  return mapBarber(row, ratings[id]);
}

export async function listReviews(barberId) {
  const rows = must(
    await supabase.from('reviews').select('*').eq('barber_id', barberId).order('created_at', { ascending: false }),
  );
  return rows.map(mapReview);
}

export async function updateBarber(id, patch) {
  const db = {};
  for (const [k, v] of Object.entries(patch)) db[k === 'avatar' ? 'avatar_url' : k] = v;
  must(await supabase.from('barbers').update(db).eq('id', id));
}

/** Citas ocupadas (solo horas) de un barbero entre dos fechas, en el formato que usa slots.js */
export async function getBusy(barberId, fromDate, toDate) {
  const rows = must(
    await supabase.rpc('get_busy_ranges', {
      p_barber: barberId,
      p_from: toTimestamp(fromDate, '00:00'),
      p_to: toTimestamp(addDays(toDate, 1), '00:00'),
    }),
  );
  return rows.map((r) => {
    const { date, time } = toPR(r.starts_at);
    return {
      id: r.starts_at,
      barberId,
      date,
      time,
      startsAt: r.starts_at,
      duration: Math.round((new Date(r.ends_at) - new Date(r.starts_at)) / 60000),
      status: 'confirmada',
    };
  });
}

// ---------- Servicios ----------
export async function saveService(barberId, s) {
  const row = { name: s.name, description: s.description, duration_min: Number(s.duration), price: Number(s.price) };
  if (s.id) must(await supabase.from('services').update(row).eq('id', s.id));
  else must(await supabase.from('services').insert({ ...row, barber_id: barberId }));
}

/** Se desactiva (no se borra) para no perder el historial de citas */
export async function deleteService(id) {
  must(await supabase.from('services').update({ active: false }).eq('id', id));
}

// ---------- Fotos ----------
async function upload(blob, name) {
  const path = `${await uid()}/${name}`;
  must(await supabase.storage.from('media').upload(path, blob, { contentType: 'image/jpeg', upsert: false }));
  return path;
}

export async function addPhoto(barberId, blob, position) {
  const path = await upload(blob, `${crypto.randomUUID()}.jpg`);
  must(await supabase.from('portfolio_photos').insert({ barber_id: barberId, path, position }));
}

export async function removePhoto(photo) {
  must(await supabase.from('portfolio_photos').delete().eq('id', photo.id));
  await supabase.storage.from('media').remove([photo.path]);
}

/** Guarda el nuevo orden: cada foto queda con su índice como posición */
export async function reorderPhotos(photos) {
  const changed = photos.map((p, i) => [p, i]).filter(([p, i]) => p.position !== i);
  for (const [p, i] of changed) must(await supabase.from('portfolio_photos').update({ position: i }).eq('id', p.id));
}

export async function uploadAvatar(barberId, blob) {
  const path = await upload(blob, `avatar-${Date.now()}.jpg`);
  await updateBarber(barberId, { avatar: publicUrl(path) });
}

// ---------- Citas ----------
const BOOKING_SELECT = '*, barbers(name, shop, municipio, avatar_url)';

export async function book({ serviceId, date, time, tip, method }) {
  return mapBooking(
    must(
      await supabase.rpc('book_appointment', {
        p_service_id: serviceId,
        p_starts_at: toTimestamp(date, time),
        p_tip: tip,
        p_payment_method: method,
      }),
    ),
  );
}

export async function reschedule(bookingId, date, time) {
  return mapBooking(
    must(await supabase.rpc('reschedule_booking', { p_booking_id: bookingId, p_starts_at: toTimestamp(date, time) })),
  );
}

/** El barbero propone otra hora; el cliente la acepta o la rechaza */
export async function proposeReschedule(bookingId, date, time) {
  return mapBooking(
    must(await supabase.rpc('propose_reschedule', { p_booking_id: bookingId, p_starts_at: toTimestamp(date, time) })),
  );
}

export async function respondProposal(bookingId, accept) {
  return mapBooking(must(await supabase.rpc('respond_proposal', { p_booking_id: bookingId, p_accept: accept })));
}

export async function cancelBooking(bookingId) {
  return mapBooking(must(await supabase.rpc('cancel_booking', { p_booking_id: bookingId })));
}

export async function markPaid(bookingId) {
  return mapBooking(must(await supabase.rpc('mark_paid', { p_booking_id: bookingId })));
}

export async function getBooking(id) {
  const row = must(await supabase.from('bookings').select(BOOKING_SELECT).eq('id', id).maybeSingle());
  return row && mapBooking(row);
}

/** Citas del cliente + ids de las que ya reseñó */
export async function myBookings() {
  const me = await uid();
  const [rows, reviewed] = await Promise.all([
    supabase.from('bookings').select(BOOKING_SELECT).eq('client_id', me).order('starts_at', { ascending: false }).then(must),
    supabase.from('reviews').select('booking_id').eq('client_id', me).then(must),
  ]);
  const done = new Set(reviewed.map((r) => r.booking_id));
  return rows.map((r) => ({ ...mapBooking(r), reviewed: done.has(r.id) }));
}

/** Citas del barbero entre dos fechas (hora de PR, inclusive) */
export async function barberBookings(fromDate, toDate) {
  const me = await uid();
  const rows = must(
    await supabase
      .from('bookings')
      .select('*')
      .eq('barber_id', me)
      .gte('starts_at', toTimestamp(fromDate, '00:00'))
      .lt('starts_at', toTimestamp(addDays(toDate, 1), '00:00'))
      .order('starts_at'),
  );
  return rows.map(mapBooking);
}

/** Pagos cobrados o reembolsados del barbero */
export async function barberPayments(fromDate) {
  const me = await uid();
  let q = supabase.from('bookings').select('*').eq('barber_id', me).in('payment_status', ['pagado', 'reembolsado']);
  if (fromDate) q = q.gte('paid_at', toTimestamp(fromDate, '00:00'));
  return must(await q.order('paid_at', { ascending: false })).map(mapBooking);
}

export async function addReview({ booking, rating, comment, author }) {
  must(
    await supabase.from('reviews').insert({
      booking_id: booking.id,
      barber_id: booking.barberId,
      client_id: await uid(),
      author,
      rating,
      comment,
    }),
  );
}

// ---------- Pago en línea (Stripe, vía funciones del servidor) ----------
async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    try {
      msg = (await error.context.json()).error || msg;
    } catch {
      /* respuesta sin JSON */
    }
    throw new Error(friendly({ message: msg }));
  }
  return data;
}

/** Crea la sesión de pago de Stripe y devuelve su URL */
export async function startCheckout(bookingId) {
  return (await invoke('stripe-checkout', { booking_id: bookingId })).url;
}

/** Cancela una cita pagada en línea y reembolsa el pago */
export async function refundBooking(bookingId) {
  return invoke('stripe-refund', { booking_id: bookingId });
}
