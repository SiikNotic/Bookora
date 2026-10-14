import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { installDiagnostics } from './lib/diagnostics';
import { consumeAuthRedirect } from './lib/supabase';
import './index.css';

const root = document.getElementById('root');
installDiagnostics(root);

consumeAuthRedirect().finally(() =>
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  ),
);

// Service worker solo en producción (en desarrollo estorba con la caché).
// En el APK (Capacitor) los archivos ya van dentro de la app: no hace falta.
if ('serviceWorker' in navigator && import.meta.env.PROD && !window.Capacitor?.isNativePlatform?.()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
