// Recibe los avisos de Stripe. Verifica la firma (STRIPE_WEBHOOK_SECRET) antes de tocar nada.
//  - checkout.session.completed → la cita queda pagada
//  - checkout.session.expired   → si sigue sin pagar, se cancela y se libera el turno
import { admin, stripe } from '../_shared/common.ts';

const enc = new TextEncoder();

async function validSignature(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
  const t = Number(parts.t);
  const sigs = header
    .split(',')
    .filter((kv) => kv.startsWith('v1='))
    .map((kv) => kv.slice(3));
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`)));
  const expected = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  // Comparación en tiempo constante
  return sigs.some((s) => s.length === expected.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0);
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return new Response('Webhook no configurado', { status: 503 });
  const payload = await req.text();
  if (!(await validSignature(payload, req.headers.get('Stripe-Signature') ?? '', secret))) {
    return new Response('Firma no válida', { status: 400 });
  }

  const event = JSON.parse(payload);
  const session = event.data?.object;
  const bookingId = session?.metadata?.booking_id;
  if (!bookingId) return new Response('ok');
  const db = admin();

  if (event.type === 'checkout.session.completed' && session.payment_status === 'paid') {
    const { data: b } = await db.from('bookings').select('status, payment_status').eq('id', bookingId).maybeSingle();
    if (b?.status === 'cancelada') {
      // Se pagó una cita que ya estaba cancelada: devolver el dinero
      await stripe('refunds', { payment_intent: session.payment_intent }, `refund-${bookingId}`);
      await db.from('bookings').update({ payment_status: 'reembolsado' }).eq('id', bookingId);
    } else {
      await db
        .from('bookings')
        .update({ payment_status: 'pagado', paid_at: new Date().toISOString(), stripe_session_id: session.id })
        .eq('id', bookingId)
        .eq('payment_status', 'pendiente');
    }
  }

  if (event.type === 'checkout.session.expired') {
    // Solo si esta sesión es la vigente de la cita (pudo haberse creado otra al reintentar)
    await db
      .from('bookings')
      .update({ status: 'cancelada' })
      .eq('id', bookingId)
      .eq('stripe_session_id', session.id)
      .eq('status', 'confirmada')
      .eq('payment_status', 'pendiente');
  }

  return new Response('ok');
});
