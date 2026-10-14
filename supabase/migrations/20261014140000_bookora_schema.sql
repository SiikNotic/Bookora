-- Esquema de Bookora: perfiles, barberos, servicios, portafolio, citas y reseñas.
create extension if not exists btree_gist with schema extensions;

-- ---------- Perfiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'cliente' check (role in ('cliente', 'barbero')),
  full_name text not null default '' check (char_length(full_name) <= 60),
  phone text check (char_length(phone) <= 25),
  created_at timestamptz not null default now()
);

-- ---------- Barberos (perfil público) ----------
create table public.barbers (
  id uuid primary key references public.profiles (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  shop text not null default '' check (char_length(shop) <= 60),
  municipio text not null default 'San Juan' check (char_length(municipio) <= 40),
  address text not null default '' check (char_length(address) <= 120),
  phone text not null default '' check (char_length(phone) <= 25),
  years int not null default 0 check (years between 0 and 80),
  bio text not null default '' check (char_length(bio) <= 300),
  avatar_url text check (char_length(avatar_url) <= 500),
  schedule jsonb not null default '{
    "0": {"open": false, "start": "09:00", "end": "18:00", "breakStart": null, "breakEnd": null},
    "1": {"open": false, "start": "09:00", "end": "18:00", "breakStart": null, "breakEnd": null},
    "2": {"open": true,  "start": "09:00", "end": "18:00", "breakStart": "12:30", "breakEnd": "13:30"},
    "3": {"open": true,  "start": "09:00", "end": "18:00", "breakStart": "12:30", "breakEnd": "13:30"},
    "4": {"open": true,  "start": "09:00", "end": "18:00", "breakStart": "12:30", "breakEnd": "13:30"},
    "5": {"open": true,  "start": "09:00", "end": "18:00", "breakStart": "12:30", "breakEnd": "13:30"},
    "6": {"open": true,  "start": "08:00", "end": "16:00", "breakStart": null, "breakEnd": null}
  }'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Servicios ----------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 200),
  duration_min int not null check (duration_min between 5 and 480),
  price numeric(8, 2) not null check (price > 0 and price <= 10000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.services (barber_id);

-- ---------- Portafolio ----------
create table public.portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id) on delete cascade,
  path text not null check (char_length(path) <= 300),
  label text not null default '' check (char_length(label) <= 40),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.portfolio_photos (barber_id, position);

-- ---------- Citas ----------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  barber_id uuid not null references public.barbers (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  client_name text not null default '',
  service_name text not null,
  duration_min int not null,
  price numeric(8, 2) not null,
  tip numeric(8, 2) not null default 0 check (tip >= 0 and tip <= 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmada' check (status in ('confirmada', 'cancelada')),
  payment_method text not null check (payment_method in ('barberia', 'stripe')),
  payment_status text not null default 'pendiente' check (payment_status in ('pendiente', 'pagado', 'reembolsado')),
  stripe_session_id text,
  paid_at timestamptz,
  rescheduled boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Un barbero no puede tener dos citas vigentes que se solapen
  constraint bookings_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelada')
);
create index on public.bookings (client_id, starts_at);
create index on public.bookings (barber_id, starts_at);
create index on public.bookings (service_id);

-- ---------- Reseñas ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  barber_id uuid not null references public.barbers (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  author text not null default '',
  rating int not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 400),
  created_at timestamptz not null default now()
);
create index on public.reviews (barber_id, created_at desc);
create index on public.reviews (client_id);

-- ---------- Permisos y RLS ----------
grant select on public.barbers, public.services, public.portfolio_photos, public.reviews to anon;
grant select, insert, update on public.profiles to authenticated;
grant select, update on public.barbers to authenticated;
grant select, insert, update, delete on public.services, public.portfolio_photos to authenticated;
grant select on public.bookings to authenticated;
grant select, insert on public.reviews to authenticated;

alter table public.profiles enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.portfolio_photos enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;

create policy "perfil propio: leer" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "perfil propio: editar" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "barberos: lectura pública" on public.barbers for select to anon, authenticated using (true);
create policy "barbero: editar su perfil" on public.barbers for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "servicios: lectura pública" on public.services for select to anon, authenticated using (true);
create policy "servicios: el barbero crea" on public.services for insert to authenticated with check (barber_id = (select auth.uid()));
create policy "servicios: el barbero edita" on public.services for update to authenticated
  using (barber_id = (select auth.uid())) with check (barber_id = (select auth.uid()));
create policy "servicios: el barbero borra" on public.services for delete to authenticated using (barber_id = (select auth.uid()));

create policy "fotos: lectura pública" on public.portfolio_photos for select to anon, authenticated using (true);
create policy "fotos: el barbero crea" on public.portfolio_photos for insert to authenticated with check (barber_id = (select auth.uid()));
create policy "fotos: el barbero edita" on public.portfolio_photos for update to authenticated
  using (barber_id = (select auth.uid())) with check (barber_id = (select auth.uid()));
create policy "fotos: el barbero borra" on public.portfolio_photos for delete to authenticated using (barber_id = (select auth.uid()));

-- Citas: solo las ven el cliente y el barbero. Se crean/modifican por funciones.
create policy "citas: cliente o barbero" on public.bookings for select to authenticated
  using (client_id = (select auth.uid()) or barber_id = (select auth.uid()));

create policy "reseñas: lectura pública" on public.reviews for select to anon, authenticated using (true);
create policy "reseñas: el cliente de una cita terminada" on public.reviews for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.client_id = (select auth.uid()) and b.barber_id = reviews.barber_id
        and b.status = 'confirmada' and b.ends_at <= now()
    )
  );

-- ---------- Alta de usuario: crea perfil (y ficha de barbero si aplica) ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'cliente');
  v_name text := left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 60);
begin
  if v_role not in ('cliente', 'barbero') then v_role := 'cliente'; end if;
  insert into public.profiles (id, role, full_name) values (new.id, v_role, v_name);
  if v_role = 'barbero' then
    insert into public.barbers (id, name) values (new.id, v_name);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- El rol no se puede cambiar desde la app
create or replace function public.protect_profile_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role <> old.role then raise exception 'No se puede cambiar el rol'; end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------- Calificación por barbero ----------
create view public.barber_ratings with (security_invoker = true) as
  select barber_id, round(avg(rating)::numeric, 2) as avg_rating, count(*)::int as review_count
  from public.reviews group by barber_id;
grant select on public.barber_ratings to anon, authenticated;
