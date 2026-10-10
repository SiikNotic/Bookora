import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' => rutas relativas: funciona igual servida en la web, instalada como PWA
// o empaquetada dentro de un APK con Capacitor.
export default defineConfig({
  plugins: [react()],
  base: './',
});
