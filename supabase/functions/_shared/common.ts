// Utilidades compartidas por las funciones de pago.
import { createClient } from 'jsr:@supabase/supabase-js@2';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export const fail = (status: number, error: string) => json({ error }, status);

/** Cliente con permisos de servidor (salta RLS). Nunca se expone a la app. */
export const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/** Usuario que llama, a partir de su token de sesión */
export async function callerId(req: Request): Promise<string | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await admin().auth.getUser(token);
  return data.user?.id ?? null;
}

/** Llamada a la API de Stripe (form-urlencoded, sin SDK) */
export async function stripe(path: string, params?: Record<string, string>, idempotencyKey?: string) {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_NOT_CONFIGURED');
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: params ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: params ? new URLSearchParams(params) : undefined,
  });
  const body = await res.json();
  if (!res.ok) {
    console.error('Stripe', path, res.status, body?.error?.message);
    throw new Error('STRIPE_ERROR');
  }
  return body;
}

export const APP_URL = () => Deno.env.get('APP_URL') ?? 'https://bookora-pr.netlify.app';
