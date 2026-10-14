-- Guarda el token del teléfono para el usuario actual. Si el teléfono estaba
-- registrado con otra cuenta (otra persona entró en el mismo teléfono), pasa a esta.
create or replace function public.register_push_token(p_token text)
returns void language sql security definer set search_path = '' as $$
  insert into public.push_tokens (token, user_id) values (p_token, auth.uid())
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
$$;
revoke execute on function public.register_push_token(text) from public, anon;
grant execute on function public.register_push_token(text) to authenticated;
