import { useLayoutEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { RoleGuard, TabsLayout } from './components/Layout';
import { Toasts } from './components/ui';
import { AppStoreProvider } from './store/AppStore';
import Welcome from './pages/Welcome';
import Explore from './pages/client/Explore';
import BarberProfile from './pages/client/BarberProfile';
import Booking from './pages/client/Booking';
import Checkout from './pages/client/Checkout';
import BookingSuccess from './pages/client/BookingSuccess';
import MyBookings from './pages/client/MyBookings';
import Review from './pages/client/Review';
import ClientProfile from './pages/client/ClientProfile';
import Dashboard from './pages/barber/Dashboard';
import Agenda from './pages/barber/Agenda';
import Services from './pages/barber/Services';
import Portfolio from './pages/barber/Portfolio';
import Payments from './pages/barber/Payments';
import Reviews from './pages/barber/Reviews';
import BarberSettings from './pages/barber/BarberSettings';

// Al cambiar de pantalla: vuelve arriba antes de pintar y, si una pantalla
// falla, aísla el error (se reinicia al navegar a otra).
function Screen({ children }) {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    // Con llaves a propósito: si el efecto devolviera el resultado de scrollTo,
    // React lo trataría como función de limpieza. En algunos navegadores (o con
    // scripts inyectados) scrollTo devuelve un valor y la app se caía con
    // "n is not a function" al cambiar de pantalla.
    window.scrollTo(0, 0);
  }, [pathname]);
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>;
}

// HashRouter: las rutas viven tras el "#", así funciona igual como PWA
// estática o dentro de un APK de Capacitor sin configurar el servidor.
export default function App() {
  return (
    <AppStoreProvider>
      <HashRouter>
        <div className="relative mx-auto min-h-full max-w-md bg-bg">
          <Screen>
            <Routes>
              <Route path="/" element={<Welcome />} />

              <Route element={<TabsLayout role="cliente" />}>
                <Route path="/cliente" element={<Explore />} />
                <Route path="/cliente/citas" element={<MyBookings />} />
                <Route path="/cliente/perfil" element={<ClientProfile />} />
              </Route>
              <Route element={<RoleGuard role="cliente" />}>
                <Route path="/cliente/barbero/:id" element={<BarberProfile />} />
                <Route path="/cliente/reservar/:id" element={<Booking />} />
                <Route path="/cliente/pago" element={<Checkout />} />
                <Route path="/cliente/confirmada/:bookingId" element={<BookingSuccess />} />
                <Route path="/cliente/resena/:bookingId" element={<Review />} />
              </Route>

              <Route element={<TabsLayout role="barbero" />}>
                <Route path="/barbero" element={<Dashboard />} />
                <Route path="/barbero/agenda" element={<Agenda />} />
                <Route path="/barbero/servicios" element={<Services />} />
                <Route path="/barbero/portafolio" element={<Portfolio />} />
                <Route path="/barbero/pagos" element={<Payments />} />
              </Route>
              <Route element={<RoleGuard role="barbero" />}>
                <Route path="/barbero/resenas" element={<Reviews />} />
                <Route path="/barbero/perfil" element={<BarberSettings />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Screen>
        </div>
        <Toasts />
      </HashRouter>
    </AppStoreProvider>
  );
}
