import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownUp, Check, ChevronDown, Heart, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { EmptyState, LoadError, Loading, RatingPill, Sheet, Wordmark } from '../../components/ui';
import { listBarbers } from '../../lib/api';
import { coverArt } from '../../lib/art';
import { today } from '../../lib/dates';
import { useFavorites } from '../../lib/favorites';
import { money } from '../../lib/format';
import { MUNICIPIOS } from '../../lib/municipios';
import { isOpenOn } from '../../lib/slots';
import { useAsync, useStore } from '../../store/AppStore';

const SORTS = [
  ['rating', 'Mejor valorados'],
  ['priceAsc', 'Precio: menor a mayor'],
  ['priceDesc', 'Precio: mayor a menor'],
  ['name', 'Nombre (A-Z)'],
];

export default function Explore() {
  const { profile } = useStore();
  const barbers = useAsync(listBarbers);
  const [favorites, toggleFavorite] = useFavorites();
  const [query, setQuery] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [filter, setFilter] = useState('todos'); // todos | hoy | favoritos
  const [sort, setSort] = useState('rating');
  const [sheet, setSheet] = useState(null); // 'municipio' | 'sort'

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const t = today();
    return (barbers.data || [])
      .map((b) => ({
        barber: b,
        rating: b.rating,
        from: Math.min(...b.services.map((s) => s.price)),
        openToday: isOpenOn(b, t),
      }))
      .filter(({ barber: b, openToday }) => {
        if (municipio && b.municipio !== municipio) return false;
        if (filter === 'favoritos' && !favorites.includes(b.id)) return false;
        if (filter === 'hoy' && !openToday) return false;
        if (!q) return true;
        return [b.name, b.shop, b.municipio, ...b.services.map((s) => s.name)].join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sort === 'priceAsc') return a.from - b.from;
        if (sort === 'priceDesc') return b.from - a.from;
        if (sort === 'name') return a.barber.name.localeCompare(b.barber.name);
        return b.rating.avg - a.rating.avg || b.rating.count - a.rating.count;
      });
  }, [barbers.data, favorites, query, municipio, filter, sort]);

  return (
    <div>
      <header className="pt-safe px-4">
        <div className="flex h-14 items-center justify-between">
          <Wordmark className="h-6" />
          <button className="chip" onClick={() => setSheet('municipio')}>
            <MapPin size={15} />
            {municipio || 'Todo Puerto Rico'}
            <ChevronDown size={15} />
          </button>
        </div>
        <p className="mt-2 text-2xl font-semibold">Hola{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋</p>
        <p className="text-muted">¿Quién te va a recortar hoy?</p>

        <label className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 focus-within:border-accent/70">
          <Search size={18} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca barbero, barbería o servicio"
            className="w-full bg-transparent outline-none placeholder:text-muted/70"
            type="search"
          />
        </label>
      </header>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4">
        <button className="chip" onClick={() => setSheet('sort')} aria-label="Ordenar">
          <ArrowDownUp size={15} />
          {SORTS.find(([k]) => k === sort)[1]}
        </button>
        {[
          ['todos', 'Todos'],
          ['hoy', 'Abierto hoy'],
          ['favoritos', 'Favoritos'],
        ].map(([k, label]) => (
          <button key={k} className={`chip ${filter === k ? 'chip-active' : ''}`} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>

      {barbers.loading && !barbers.data && <Loading />}
      {barbers.error && !barbers.data && <LoadError error={barbers.error} onRetry={barbers.reload} />}
      {barbers.data && (
        <>
          <p className="mt-5 px-4 text-sm text-muted">
            {list.length} {list.length === 1 ? 'barbero' : 'barberos'} {municipio ? `en ${municipio}` : 'en Puerto Rico'}
          </p>

          <div className="mt-3 space-y-4 px-4">
            {list.map(({ barber: b, rating, from, openToday }) => {
              const fav = favorites.includes(b.id);
              return (
                <Link key={b.id} to={`/cliente/barbero/${b.id}`} className="card block overflow-hidden active:opacity-90">
                  <div className="relative h-40">
                    <img src={b.portfolio[0]?.src || coverArt(b.id)} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
                    <button
                      aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFavorite(b.id);
                      }}
                      className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60"
                    >
                      <Heart size={18} className={fav ? 'fill-accent text-accent' : 'text-ink'} />
                    </button>
                    {openToday && (
                      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-ok">
                        Abierto hoy
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{b.name}</p>
                        <p className="truncate text-sm text-muted">{b.shop}</p>
                      </div>
                      <RatingPill avg={rating.avg} count={rating.count} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted">
                        <MapPin size={14} /> {b.municipio}
                      </span>
                      <span>
                        <span className="text-muted">desde </span>
                        <span className="font-semibold">{money(from)}</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
            {list.length === 0 && (
              <EmptyState
                icon={SlidersHorizontal}
                title={barbers.data.length ? 'Sin resultados' : 'Aún no hay barberos disponibles'}
                text={
                  barbers.data.length
                    ? 'Prueba con otro municipio o quita los filtros.'
                    : 'Vuelve pronto: los barberos se están uniendo a Bookora.'
                }
                action={
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setQuery('');
                      setMunicipio('');
                      setFilter('todos');
                    }}
                  >
                    Limpiar filtros
                  </button>
                }
              />
            )}
          </div>
        </>
      )}

      <Sheet open={sheet === 'municipio'} onClose={() => setSheet(null)} title="Municipio">
        <OptionList
          options={[['', 'Todo Puerto Rico'], ...MUNICIPIOS.map((m) => [m, m])]}
          value={municipio}
          onPick={(v) => {
            setMunicipio(v);
            setSheet(null);
          }}
        />
      </Sheet>
      <Sheet open={sheet === 'sort'} onClose={() => setSheet(null)} title="Ordenar por">
        <OptionList
          options={SORTS}
          value={sort}
          onPick={(v) => {
            setSort(v);
            setSheet(null);
          }}
        />
      </Sheet>
    </div>
  );
}

function OptionList({ options, value, onPick }) {
  return (
    <div className="divide-y divide-line/60">
      {options.map(([k, label]) => (
        <button key={k || 'all'} onClick={() => onPick(k)} className="flex w-full items-center justify-between py-3.5 text-left">
          {label}
          {value === k && <Check size={18} className="text-accent" />}
        </button>
      ))}
    </div>
  );
}
