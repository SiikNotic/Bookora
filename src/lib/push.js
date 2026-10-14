// Notificaciones push en el APK (Firebase). En la web no hace nada.
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

let token = null;
let listening = false;

// El APK solo trae el plugin si se compiló con google-services.json (ver workflow)
const available = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications');

/** Pide permiso y registra el teléfono para el usuario con sesión abierta. */
export async function setupPush() {
  if (!available()) return;
  if (!listening) {
    listening = true;
    // Canales de Android: el servidor elige uno según la preferencia de sonido del usuario
    await PushNotifications.createChannel({ id: 'reservas', name: 'Reservas', importance: 5, visibility: 1, vibration: true });
    await PushNotifications.createChannel({ id: 'reservas-silencio', name: 'Reservas (sin sonido)', importance: 2, visibility: 1 });
    await PushNotifications.addListener('registration', async ({ value }) => {
      token = value;
      await supabase.rpc('register_push_token', { p_token: value });
    });
    // Al tocar la notificación, abrir la pantalla de la cita
    await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const route = notification.data?.route;
      if (typeof route === 'string' && route.startsWith('/')) window.location.hash = `#${route}`;
    });
  }
  let { receive } = await PushNotifications.checkPermissions();
  if (receive === 'prompt' || receive === 'prompt-with-rationale') ({ receive } = await PushNotifications.requestPermissions());
  if (receive === 'granted') await PushNotifications.register();
}

/** Al cerrar sesión: este teléfono deja de recibir avisos de esa cuenta. */
export async function forgetPushToken() {
  if (token) await supabase.from('push_tokens').delete().eq('token', token);
}
