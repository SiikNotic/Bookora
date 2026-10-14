import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { EmptyState, LoadError, Loading, Stars, TopBar } from '../../components/ui';
import { listReviews } from '../../lib/api';
import { useAsync, useStore } from '../../store/AppStore';
import { ReviewItem } from '../client/BarberProfile';

export default function Reviews() {
  const { userId } = useStore();
  const [stars, setStars] = useState(0); // 0 = todas
  const res = useAsync(() => listReviews(userId), [userId]);
  if (!res.data) {
    return (
      <div>
        <TopBar back="/barbero" title="Reseñas" />
        {res.error ? <LoadError error={res.error} onRetry={res.reload} /> : <Loading />}
      </div>
    );
  }
  const list = res.data;
  const count = list.length;
  const avg = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => [n, list.filter((r) => r.rating === n).length]);
  const shown = list.filter((r) => !stars || r.rating === stars).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="pb-8">
      <TopBar back="/barbero" title="Reseñas" />
      <div className="px-4 pt-4">
        <div className="card flex gap-5 p-4">
          <div className="text-center">
            <p className="silver-text text-5xl font-bold">{count ? avg.toFixed(1) : '—'}</p>
            <Stars value={avg} size={13} className="mt-1" />
            <p className="mt-1 text-xs text-muted">{count} reseñas</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {dist.map(([n, c]) => (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-muted">{n}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${count ? (c / count) * 100 : 0}%` }} />
                </div>
                <span className="w-6 text-right text-muted">{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {[0, 5, 4, 3, 2, 1].map((n) => (
            <button key={n} className={`chip ${stars === n ? 'chip-active' : ''}`} onClick={() => setStars(n)}>
              {n ? `${n} ★` : 'Todas'}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {shown.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
          {!shown.length && <EmptyState icon={MessageSquareText} title="Sin reseñas con ese filtro" />}
        </div>
      </div>
    </div>
  );
}
