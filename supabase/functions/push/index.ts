// Envía por Firebase (FCM) un aviso pendiente de notification_queue a los teléfonos del usuario.
// La llama la base de datos (pg_net) con { id }. Sin JWT: solo envía filas aún no enviadas
// y las marca, así que repetir la llamada no hace nada.
// Secreto necesario: FIREBASE_SERVICE_ACCOUNT (el JSON de la cuenta de servicio de Firebase).
import { admin } from '../_shared/common.ts';

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

const b64url = (data: Uint8Array | string) =>
  btoa(typeof data === 'string' ? data : String.fromCharCode(...data))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let cached: { token: string; exp: number } | null = null;

async function googleToken(sa: ServiceAccount) {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))}`;
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----|\s/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64url(sig)}` }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Google token: ${body.error_description ?? res.status}`);
  cached = { token: body.access_token, exp: Date.now() + body.expires_in * 1000 };
  return cached.token;
}

Deno.serve(async (req) => {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!raw) return new Response('Push no configurado', { status: 503 });
  const { id } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id)) return new Response('Falta id', { status: 400 });

  const db = admin();
  // Reclama la fila: si ya se envió (o no existe), no hay nada que hacer
  const { data: n } = await db
    .from('notification_queue')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', id)
    .is('sent_at', null)
    .select('user_id, title, body, route')
    .maybeSingle();
  if (!n) return new Response('ok');

  const { data: profile } = await db.from('profiles').select('notify_enabled, notify_sound').eq('id', n.user_id).single();
  if (!profile?.notify_enabled) return new Response('ok');
  const { data: tokens } = await db.from('push_tokens').select('token').eq('user_id', n.user_id);
  if (!tokens?.length) return new Response('ok');

  const sa: ServiceAccount = JSON.parse(raw);
  const access = await googleToken(sa);
  await Promise.all(tokens.map(async ({ token }) => {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: n.title, body: n.body },
          data: { route: n.route },
          android: {
            priority: 'HIGH',
            // Canales creados por la app: "reservas" suena, "reservas-silencio" no
            notification: profile.notify_sound
              ? { channel_id: 'reservas', sound: 'default' }
              : { channel_id: 'reservas-silencio' },
          },
        },
      }),
    });
    if (res.status === 404) {
      // UNREGISTERED: el teléfono desinstaló la app; se olvida el token
      await db.from('push_tokens').delete().eq('token', token);
    } else if (!res.ok) {
      console.error('FCM', res.status, await res.text());
    }
  }));
  return new Response('ok');
});
