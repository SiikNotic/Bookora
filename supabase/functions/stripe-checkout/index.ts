// Crea la página de pago de Stripe para una cita del usuario que llama.
import { admin, APP_URL, callerId, cors, fail, json, stripe } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fail(405, 'Método no permitido');
  try {
    const uid = await callerId(req);
    if (!uid) return fail(401, 'Tu sesión expiró. Vuelve a entrar.');
    const { booking_id } = await req.json().catch(() => ({}));
    if (typeof booking_id !== 'string') return fail(400, 'Falta la cita');

    const db = admin();
    const { data: b } = await db.from('bookings').select('*, barbers(name, shop)').eq('id', booking_id).maybeSingle();
    if (!b || b.client_id !== uid) return fail(404, 'Cita no encontrada');
    if (b.status !== 'confirmada' || b.payment_method !== 'stripe' || b.payment_status !== 'pendiente') {
      return fail(409, 'Esta cita no tiene un pago en línea pendiente');
    }
    if (new Date(b.starts_at) <= new Date()) return fail(409, 'La cita ya pasó');

    const { data: auth } = await db.auth.admin.getUserById(uid);
    const amount = Math.round((Number(b.price) + Number(b.tip)) * 100);
    const back = (estado: string) => `${APP_URL()}/#/pago-resultado?estado=${estado}&cita=${b.id}`;
    const session = await stripe('checkout/sessions', {
      mode: 'payment',
      locale: 'es',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(amount),
      'line_items[0][price_data][product_data][name]': `${b.service_name} · ${b.barbers?.shop || b.barbers?.name || 'Bookora'}`,
      client_reference_id: b.id,
      'metadata[booking_id]': b.id,
      'payment_intent_data[metadata][booking_id]': b.id,
      ...(auth.user?.email ? { customer_email: auth.user.email } : {}),
      // Stripe exige al menos 30 minutos; si no se paga, el webhook libera el turno
      expires_at: String(Math.floor(Date.now() / 1000) + 31 * 60),
      success_url: back('ok'),
      cancel_url: back('cancelado'),
    });

    await db.from('bookings').update({ stripe_session_id: session.id }).eq('id', b.id);
    return json({ url: session.url });
  } catch (e) {
    if ((e as Error).message === 'STRIPE_NOT_CONFIGURED') {
      return fail(503, 'El pago en línea aún no está activado. Elige pagar en la barbería.');
    }
    console.error(e);
    return fail(502, 'No se pudo iniciar el pago en línea. Inténtalo otra vez.');
  }
});
