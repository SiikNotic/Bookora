// Estado global de la demo. Vive en memoria (React) y se copia en localStorage
// para que sobreviva al cerrar la app. No hay backend ni servidores.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createInitialState, DEMO_CARD } from '../data/demoData';
import { today } from '../lib/dates';

const STORAGE_KEY = 'bookora-demo-v1';

const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version === 1) return saved;
  } catch {
    /* datos corruptos o sin acceso: empezamos de cero */
  }
  return createInitialState();
}

const mapBarber = (state, id, fn) => ({
  ...state,
  barbers: state.barbers.map((b) => (b.id === id ? fn(b) : b)),
});

function reducer(state, action) {
  switch (action.type) {
    case 'setRole':
      return { ...state, role: action.role, barberId: action.barberId ?? state.barberId };
    case 'setClientName':
      return { ...state, clientName: action.name };
    case 'toggleFavorite': {
      const fav = state.favorites.includes(action.barberId)
        ? state.favorites.filter((x) => x !== action.barberId)
        : [...state.favorites, action.barberId];
      return { ...state, favorites: fav };
    }

    // ---- Cliente ----
    case 'createBooking': {
      const { booking, payment } = action;
      return { ...state, bookings: [...state.bookings, booking], payments: [...state.payments, payment] };
    }
    case 'cancelBooking':
      return {
        ...state,
        bookings: state.bookings.map((b) => (b.id === action.id ? { ...b, status: 'cancelada' } : b)),
        // Cancelación = reembolso simulado del pago
        payments: state.payments.map((p) => (p.bookingId === action.id ? { ...p, status: 'reembolsado' } : p)),
      };
    case 'rescheduleBooking':
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? { ...b, date: action.date, time: action.time, rescheduled: true } : b,
        ),
      };
    case 'addReview':
      return {
        ...state,
        reviews: [action.review, ...state.reviews],
        bookings: state.bookings.map((b) => (b.id === action.review.bookingId ? { ...b, reviewId: action.review.id } : b)),
      };

    // ---- Barbero ----
    case 'updateBarber':
      return mapBarber(state, action.id, (b) => ({ ...b, ...action.patch }));
    case 'updateDay':
      return mapBarber(state, action.id, (b) => ({
        ...b,
        schedule: { ...b.schedule, [action.day]: { ...b.schedule[action.day], ...action.patch } },
      }));
    case 'saveService':
      return mapBarber(state, action.id, (b) => {
        const exists = b.services.some((s) => s.id === action.service.id);
        return {
          ...b,
          services: exists
            ? b.services.map((s) => (s.id === action.service.id ? action.service : s))
            : [...b.services, action.service],
        };
      });
    case 'deleteService':
      return mapBarber(state, action.id, (b) => ({ ...b, services: b.services.filter((s) => s.id !== action.serviceId) }));
    case 'addPhotos':
      return mapBarber(state, action.id, (b) => ({ ...b, portfolio: [...action.photos, ...b.portfolio] }));
    case 'removePhoto':
      return mapBarber(state, action.id, (b) => ({ ...b, portfolio: b.portfolio.filter((p) => p.id !== action.photoId) }));
    case 'movePhoto':
      return mapBarber(state, action.id, (b) => {
        const list = [...b.portfolio];
        const i = list.findIndex((p) => p.id === action.photoId);
        const j = i + action.delta;
        if (i < 0 || j < 0 || j >= list.length) return b;
        [list[i], list[j]] = [list[j], list[i]];
        return { ...b, portfolio: list };
      });

    case 'reset':
      return { ...createInitialState(), role: state.role, barberId: state.barberId };
    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function AppStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [toasts, setToasts] = useState([]);
  const storageWarned = useRef(false);

  const toast = useCallback((message, tone = 'ok') => {
    const id = uid('t');
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  // Guardado local en cada cambio
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      if (!storageWarned.current) {
        storageWarned.current = true;
        toast('Almacenamiento local lleno: algunas fotos no se guardarán al cerrar.', 'warn');
      }
    }
  }, [state, toast]);

  const actions = useMemo(
    () => ({
      setRole: (role, barberId) => dispatch({ type: 'setRole', role, barberId }),
      setClientName: (name) => dispatch({ type: 'setClientName', name }),
      toggleFavorite: (barberId) => dispatch({ type: 'toggleFavorite', barberId }),

      /** Crea la cita y su pago simulado. Devuelve el id de la cita. */
      createBooking: ({ barber, service, date, time, tip, method, clientName }) => {
        const id = uid('bk');
        const booking = {
          id,
          barberId: barber.id,
          serviceId: service.id,
          serviceName: service.name,
          duration: service.duration,
          price: service.price,
          tip,
          date,
          time,
          clientName,
          isMe: true,
          status: 'confirmada',
          paymentId: `pay-${id}`,
          reviewId: null,
          createdAt: today(),
        };
        const payment = {
          id: `pay-${id}`,
          bookingId: id,
          barberId: barber.id,
          clientName,
          amount: service.price,
          tip,
          method: method || DEMO_CARD,
          date: today(),
          status: 'pagado',
        };
        dispatch({ type: 'createBooking', booking, payment });
        return id;
      },
      cancelBooking: (id) => dispatch({ type: 'cancelBooking', id }),
      rescheduleBooking: (id, date, time) => dispatch({ type: 'rescheduleBooking', id, date, time }),
      addReview: ({ booking, rating, comment, author }) =>
        dispatch({
          type: 'addReview',
          review: { id: uid('rv'), barberId: booking.barberId, bookingId: booking.id, author, rating, comment, date: today() },
        }),

      updateBarber: (id, patch) => dispatch({ type: 'updateBarber', id, patch }),
      updateDay: (id, day, patch) => dispatch({ type: 'updateDay', id, day, patch }),
      saveService: (id, service) => dispatch({ type: 'saveService', id, service: { ...service, id: service.id || uid('s') } }),
      deleteService: (id, serviceId) => dispatch({ type: 'deleteService', id, serviceId }),
      addPhotos: (id, photos) => dispatch({ type: 'addPhotos', id, photos: photos.map((p) => ({ ...p, id: uid('pf') })) }),
      removePhoto: (id, photoId) => dispatch({ type: 'removePhoto', id, photoId }),
      movePhoto: (id, photoId, delta) => dispatch({ type: 'movePhoto', id, photoId, delta }),

      resetDemo: () => dispatch({ type: 'reset' }),
      logout: () => dispatch({ type: 'setRole', role: null }),
      toast,
    }),
    [toast],
  );

  const value = useMemo(() => ({ state, actions, toasts }), [state, actions, toasts]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <AppStoreProvider>');
  return ctx;
}

// ---- Selectores ----

export function ratingFor(reviews, barberId) {
  const list = reviews.filter((r) => r.barberId === barberId);
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  return { avg, count: list.length, list };
}

export const getBarber = (state, id) => state.barbers.find((b) => b.id === id);
