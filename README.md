# Bookora — barberos de Puerto Rico

App para Android (APK) y web donde los **clientes** buscan barberos en Puerto Rico, reservan, pagan y dejan
reseñas, y los **barberos** gestionan su agenda, servicios, fotos, cobros y calificaciones.

- **Frontend:** React 18 + Vite + Tailwind, en español. Rutas con `HashRouter` para que funcione igual en la web
  (Netlify) y dentro del APK (Capacitor).
- **Backend:** [Supabase](https://supabase.com) — Auth (email y contraseña), Postgres con RLS, Storage para
  fotos y Edge Functions para los pagos con Stripe.
- **Pagos:** el cliente elige **pagar en la barbería** (el barbero lo marca como cobrado) o **en línea con
  Stripe Checkout** (la tarjeta se introduce en la página de Stripe; la app nunca la ve).

## Estructura

```
src/
  lib/api.js           # Todo el acceso a Supabase (las pantallas no hablan con la BD directamente)
  lib/supabase.js      # Cliente de Supabase + manejo de los enlaces de los emails (confirmar / recuperar)
  lib/dates.js         # Fechas y horas siempre en hora de Puerto Rico (AST, UTC-4)
  lib/slots.js         # Cálculo de turnos libres (el servidor vuelve a validar al reservar)
  store/AppStore.jsx   # Sesión, perfil, avisos y useAsync() para cargar datos
  pages/               # Entrada/registro, cliente (client/) y barbero (barber/)
supabase/
  migrations/          # Esquema, RLS, funciones de reserva, Storage y tarea programada
  functions/           # stripe-checkout, stripe-webhook, stripe-refund
android/               # Proyecto nativo de Capacitor
.github/workflows/     # Compila el APK en cada push
```

### Reglas que aplica el servidor (no solo la app)

- Solo se reserva dentro del horario del barbero (hora de PR), con 30 min de anticipación y hasta 90 días.
- Un barbero no puede tener dos citas que se solapen (restricción en la base de datos).
- El cliente cancela o reprograma hasta 2 horas antes; el barbero puede cancelar siempre.
- El barbero puede **proponer otra hora**; la cita no cambia hasta que el cliente la acepta (si la rechaza, queda
  como estaba).
- Las citas con pago en línea que no se pagan en ~30 min se cancelan solas y liberan el turno.
- Cada usuario solo ve sus citas; el rol (cliente/barbero) no se puede cambiar desde la app.
- Los barberos aparecen para los clientes cuando tienen al menos un servicio.

## Correr en local

Requisitos: Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas de fechas en hora de PR
npm run build
```

La configuración pública está en `.env` (URL del proyecto y clave *publishable* de Supabase, pensada para ir en
la app; los datos los protege RLS). **Nunca** pongas claves secretas en `.env`.

## Configuración pendiente en los paneles (una sola vez)

### Supabase → Authentication → URL Configuration

- **Site URL:** `https://bookora-pr.netlify.app`
- **Redirect URLs:** agrega `https://bookora-pr.netlify.app/**`

Sin esto, los enlaces de "confirmar cuenta" y "recuperar contraseña" de los emails no llevan a la app.

### Emails (recomendado antes de lanzar)

El servidor de email incluido en Supabase solo permite unos pocos emails por hora. Para usuarios reales
configura un SMTP propio en **Authentication → Emails → SMTP Settings** (por ejemplo Resend, SendGrid o
Amazon SES).

### Stripe (pago en línea)

1. En Stripe → **Developers → API keys**, copia la clave secreta (`sk_live_...`, o `sk_test_...` para pruebas).
2. En Stripe → **Developers → Webhooks → Add endpoint**:
   - URL: `https://hvxvodqnbjwslwizlwob.supabase.co/functions/v1/stripe-webhook`
   - Eventos: `checkout.session.completed` y `checkout.session.expired`
   - Copia el **Signing secret** (`whsec_...`).
3. En Supabase → **Edge Functions → Secrets**, crea `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` con esos valores.

Mientras no estén, la opción "En línea" responde que el pago en línea aún no está activado y el cliente
puede elegir pagar en la barbería. Con Stripe, el dinero entra a **tu** cuenta de Stripe; el pago a cada barbero
se hace por fuera de la app (Stripe Connect sería el siguiente paso si quieres pagos automáticos a barberos).

## APK de Android

### Se actualiza solo

El APK carga la app desde `https://bookora-pr.netlify.app` (`server.url` en `capacitor.config.json`). Cada vez que
Netlify publica `main`, todos los teléfonos ven la versión nueva al abrir la app: **no hay que reinstalar el APK**.
Solo hace falta un APK nuevo si cambia algo nativo (un plugin nuevo de Capacitor, permisos, el ícono). Sin internet
se muestra una pantalla de "Sin conexión" con botón para reintentar.

### Notificaciones (Firebase)

Avisos en el teléfono con sonido: al barbero cuando le reservan, cancelan o responden a un cambio de hora; al cliente
cuando el barbero propone otra hora o cancela. Cada usuario puede apagarlos o quitarles el sonido en su Perfil (y
Android también deja silenciarlos desde los ajustes del sistema). Configuración, una sola vez:

1. En [Firebase](https://console.firebase.google.com) crea un proyecto y agrega una app **Android** con el paquete
   `pr.bookora.app`. Descarga `google-services.json`.
2. GitHub → **Settings → Secrets and variables → Actions** → secreto `GOOGLE_SERVICES_JSON` con el contenido completo
   de ese archivo. Vuelve a compilar el APK (Actions → APK Android → Run workflow) e instálalo una vez.
3. Firebase → **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. En Supabase →
   **Edge Functions → Secrets** crea `FIREBASE_SERVICE_ACCOUNT` con el contenido completo de ese JSON.
   **Es una clave secreta: no la subas al repositorio ni la compartas.**

Sin el paso 2 el APK se compila sin notificaciones (todo lo demás funciona). Los avisos se generan en la base de datos
(tabla `notification_queue`) y los envía la Edge Function `push`.

Cada push a `main` o a la rama de trabajo ejecuta **GitHub → Actions → APK Android**, que compila la app y deja el
APK en **Artifacts → bookora-apk** de esa ejecución.

**Instalar en el teléfono:** descarga el zip del artifact, sácale el `.apk`, ábrelo en Android y permite
"instalar apps de origen desconocido" cuando lo pida. Cada compilación tiene un número de versión mayor, así que
se instala encima de la anterior **si está firmada con la misma clave** (ver abajo).

### Firma de producción (necesaria para actualizar sin desinstalar y para Google Play)

Sin secretos, el workflow genera un APK de prueba (*debug*) firmado con una clave temporal: sirve para probar,
pero cada compilación puede requerir desinstalar la anterior. Para un APK firmado (*release*):

```bash
keytool -genkey -v -keystore bookora.keystore -alias bookora -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 bookora.keystore   # copia el resultado
```

En GitHub → **Settings → Secrets and variables → Actions** crea:
`ANDROID_KEYSTORE_BASE64` (el texto base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`bookora`) y
`ANDROID_KEY_PASSWORD`. **Guarda el `.keystore` y las contraseñas en un lugar seguro:** sin ellos no podrás
publicar actualizaciones de la app.

### Compilar el APK en tu computadora (opcional)

Con Android Studio instalado: `npm run build && npx cap sync android && npx cap open android`, y en Android Studio
**Build → Build APK(s)**.

## Íconos

`npm i -D playwright && npm run icons` regenera los íconos de la web y de Android desde
`scripts/logo-source.png` y `scripts/wordmark-source.png`.

## Pendiente / siguientes pasos

- SMTP propio para los emails de Auth (ver arriba).
- Stripe Connect si se quiere pagar automáticamente a cada barbero.
- Recordatorio automático antes de la cita (las notificaciones ya existen; falta la tarea programada).
- Venta de productos por el barbero.
- Publicación en Google Play (requiere la firma de producción y una cuenta de desarrollador).
- Actualizar react-router a la v7 (las alertas de `npm audit` actuales no afectan a esta app).
