# Bookora — app para barberos en Puerto Rico (demo)

Una sola app donde los **clientes** buscan barberos, ven sus trabajos, agendan, pagan y dejan reseñas,
y los **barberos** gestionan su agenda, fotos, servicios, cobros y calificaciones.

> **Esta versión es una DEMO.** No hay backend, ni base de datos, ni servidores. Todo funciona con datos
> ficticios guardados solo en el teléfono (`localStorage`). Los pagos son **simulados**: no se cobra nada.

## Stack

**React 18 + Vite + Tailwind CSS**, empaquetada como **PWA** (instalable en Android, pantalla completa,
funciona sin conexión) y lista para convertirse en **APK con Capacitor**. Usa `HashRouter` y rutas
relativas para que funcione igual en la web, instalada como PWA o dentro de un APK.

## Estructura del proyecto

```
Bookora/
├── index.html                 # HTML base (meta de tema, manifest, íconos)
├── capacitor.config.json      # Config para empaquetar como APK (opcional)
├── public/
│   ├── manifest.webmanifest   # Manifest PWA (nombre, colores, pantalla completa)
│   ├── sw.js                  # Service worker: caché para uso sin conexión
│   ├── icons/                 # Íconos de la app (normal y "maskable" para Android)
│   └── brand/                 # Logo (B) y wordmark "Bookora"
├── scripts/
│   ├── generate-icons.mjs     # Regenera íconos/marca desde el logo original
│   ├── logo-source.png        # Logo original
│   └── wordmark-source.png    # Wordmark original
└── src/
    ├── main.jsx               # Arranque + registro del service worker
    ├── App.jsx                # Rutas (cliente / barbero)
    ├── index.css              # Tema oscuro negro/plateado (tokens de color)
    ├── data/demoData.js       # Barberos ficticios de PR, servicios, citas, pagos y reseñas
    ├── store/AppStore.jsx     # Estado global (useReducer) + guardado local
    ├── lib/                   # Fechas, disponibilidad de turnos, formato, imágenes
    ├── components/            # UI reutilizable (barras, hojas inferiores, estrellas…)
    └── pages/
        ├── Welcome.jsx        # Elegir rol: cliente o barbero
        ├── client/            # Explorar, Perfil del barbero, Reservar, Pago, Mis citas, Reseña, Perfil
        └── barber/            # Panel, Agenda + horario, Servicios, Fotos, Pagos, Reseñas, Mi perfil
```

## Funciones incluidas

**Cliente**
- Explorar barberos con foto, nombre, rating y municipio; búsqueda, filtro por municipio,
  "Disponible hoy", favoritos y orden por rating/precio.
- Perfil del barbero: portafolio (con visor), servicios y precios, horario y reseñas.
- Reservar: servicio → fecha → hora, solo entre turnos realmente libres (respeta horario,
  pausa de almuerzo y citas existentes).
- Pago simulado con tarjeta o **ATH Móvil**, propina opcional y aviso de **modo demo** visible.
- Mis citas: próximas, completadas y canceladas; **reprogramar** y **cancelar** (con reembolso simulado)
  hasta 2 h antes.
- Reseñas de 1 a 5 estrellas + comentario después de la cita.

**Barbero**
- Panel con citas de hoy, cobrado del mes y rating promedio.
- Agenda por día y editor de horario semanal (días abiertos, horas, pausa de almuerzo).
- Servicios y precios: crear, editar y eliminar.
- Portafolio: subir fotos desde galería/cámara, reordenar (la primera es la portada) y borrar.
- Historial de pagos recibidos (simulados) con propinas y reembolsos.
- Reseñas con promedio, distribución por estrellas y filtro.
- Editar perfil público (nombre, barbería, municipio, foto, bio…).

En **Perfil** (cliente) o **Mi perfil** (barbero) puedes cambiar de rol o **reiniciar la demo**.

## Correrla en local

Requisitos: **Node.js 18+**.

```bash
npm install
npm run dev        # http://localhost:5173 (también se muestra la IP de tu red)
```

Versión de producción (con service worker activo):

```bash
npm run build
npm run preview    # http://localhost:4173
```

### Probarla en tu Android desde la computadora

1. Teléfono y computadora en la **misma red Wi-Fi**.
2. Corre `npm run dev` y abre en Chrome del teléfono la dirección `Network:` que muestra la terminal
   (ej. `http://192.168.1.20:5173`).

> Para **instalarla** como app, Chrome exige **HTTPS** (o `localhost`). Usa una de las opciones de abajo.

## Instalarla como PWA en Android

1. Publica la carpeta `dist/` en cualquier hosting estático con HTTPS (Netlify, Vercel, GitHub Pages,
   Cloudflare Pages…). Ejemplo rápido: `npm run build` y arrastra `dist/` a <https://app.netlify.com/drop>.
   - Alternativa sin publicar: `npm run build && npm run preview` y, con el teléfono conectado por USB y
     depuración activada, en Chrome de la computadora ve a `chrome://inspect` → *Port forwarding* `4173 → localhost:4173`,
     y abre `http://localhost:4173` en el teléfono.
2. Abre la URL en **Chrome para Android**.
3. Toca el menú **⋮** → **Instalar app** (o **Agregar a la pantalla principal**).
4. Bookora aparece con su ícono, abre a **pantalla completa** con tema oscuro y funciona sin conexión.

## (Opcional) Generar un APK con Capacitor

La configuración ya está en `capacitor.config.json` (`appId: pr.bookora.app`, `webDir: dist`).
Requiere **Android Studio**.

```bash
npm i @capacitor/core @capacitor/android
npm i -D @capacitor/cli
npm run build
npx cap add android
npx cap sync android
npx cap open android      # En Android Studio: Build → Build APK(s)
```

Tras cada cambio: `npm run build && npx cap sync android`.

## Personalizar

- **Colores:** `src/index.css` → variables `--accent`, `--bg`, etc. (p. ej. dorado: `--accent: 201 164 104;`).
- **Barberos y datos de ejemplo:** `src/data/demoData.js`.
- **Íconos y logo:** reemplaza `scripts/logo-source.png` / `scripts/wordmark-source.png` y corre
  `npm i -D playwright && npm run icons`.
- Si cambias `public/sw.js`, sube la versión `CACHE` para forzar la actualización en los teléfonos.

## Qué faltaría para una versión real

1. **Backend y base de datos** (p. ej. Supabase/Firebase o API propia con PostgreSQL) para barberos,
   servicios, horarios, citas, pagos y reseñas compartidos entre usuarios.
2. **Cuentas y autenticación** (teléfono/SMS, Google, email) con roles cliente/barbero y verificación
   de barberos.
3. **Reservas sin choques en el servidor**: bloqueo transaccional del turno, zona horaria AST,
   días libres/feriados, políticas de cancelación y de no-show.
4. **Pagos reales**: Stripe Connect (o similar) para cobrar y pagar a cada barbero, **ATH Business/ATH
   Móvil**, reembolsos, comisiones de la plataforma, recibos y manejo del **IVU**.
5. **Almacenamiento de fotos** en la nube (S3/Supabase Storage) con compresión y moderación.
6. **Notificaciones**: push (FCM), SMS/WhatsApp y email para confirmaciones y recordatorios.
7. **Reseñas verificadas** y moderación/reportes de contenido.
8. **Mapas y ubicación** (Google Maps) para buscar por cercanía y llegar a la barbería.
9. **Legal y cumplimiento**: términos, privacidad, manejo de datos de pago (PCI vía el proveedor).
10. **Calidad y operación**: pruebas automatizadas, analítica, monitoreo de errores, CI/CD y
    publicación en **Google Play** (TWA o Capacitor) con firma de la app.
