// Cancela una cita pagada en línea y reembolsa el pago completo.
// Puede hacerlo el cliente (hasta 2 h antes) o el barbero de la cita.
import { admin, callerId, cors, fail, json, stripe } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fail(405, 'Método no permitido');
  try {
    const uid = await callerId(req);
    if (!uid) return fail(401, 'Tu sesión expiró. Vuelve a entrar.');
    const { booking_id } = await req.json().catch(() => ({}));
    if (typeof booking_id !== 'string') return fail(400, 'Falta la cita');

    const db = admin();
    const { data: b } = await db.from('bookings').select('*').eq('id', booking_id).maybeSingle();
    if (!b || (b.client_id !== uid && b.barber_id !== uid)) return fail(404, 'Cita no encontrada');
    if (b.status !== 'confirmada' || b.payment_method !== 'stripe' || b.payment_status !== 'pagado' || !b.stripe_session_id) {
      return fail(409, 'Esta cita no tiene un pago en línea para reembolsar');
    }
    if (new Date(b.ends_at) <= new Date()) return fail(409, 'La cita ya pasó');
    if (b.client_id === uid && new Date(b.starts_at).getTime() - Date.now() < 2 * 3600 * 1000) {
      return fail(409, 'Faltan menos de 2 horas: llama a la barbería');
    }

    const session = await stripe(`checkout/sessions/${b.stripe_session_id}`);
    // La clave de idempotencia evita reembolsar dos veces si se repite la petición
    await stripe('refunds', { payment_intent: session.payment_intent }, `refund-${b.id}`);
    await db.from('bookings').update({ status: 'cancelada', payment_status: 'reembolsado' }).eq('id', b.id);
    return json({ ok: true });
  } catch (e) {
    if ((e as Error).message === 'STRIPE_NOT_CONFIGURED') return fail(503, 'El pago en línea no está activado.');
    console.error(e);
    return fail(502, 'No se pudo hacer el reembolso. Inténtalo otra vez o contacta a la barbería.');
  }
});
