// Favoritos: preferencia personal guardada en el teléfono.
import { useCallback, useState } from 'react';

const KEY = 'bookora-favoritos';
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

export function useFavorites() {
  const [favorites, setFavorites] = useState(read);
  const toggle = useCallback((id) => {
    setFavorites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* sin almacenamiento: queda solo en memoria */
      }
      return next;
    });
  }, []);
  return [favorites, toggle];
}
