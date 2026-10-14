import { Capacitor } from '@capacitor/core';
import { Bell } from 'lucide-react';
import { updateProfile } from '../lib/api';
import { useStore } from '../store/AppStore';
import { Toggle } from './ui';

/** Avisos de citas (solo en el APK): activar/desactivar y con o sin sonido. */
export default function NotificationSettings() {
  const { profile, refreshProfile, toast } = useStore();
  if (!Capacitor.isNativePlatform() || !profile) return null;

  const save = async (patch) => {
    try {
      await updateProfile(profile.id, patch);
      await refreshProfile();
    } catch (e) {
      toast(e.message, 'warn');
    }
  };

  return (
    <>
      <h2 className="mb-3 mt-7 flex items-center gap-2 font-semibold">
        <Bell size={16} /> Notificaciones
      </h2>
      <div className="card divide-y divide-line/60">
        <div className="flex items-center justify-between gap-3 p-4">
          <span className="text-sm">Avisos de citas</span>
          <Toggle checked={profile.notify_enabled} onChange={(v) => save({ notify_enabled: v })} label="Avisos de citas" />
        </div>
        {profile.notify_enabled && (
          <div className="flex items-center justify-between gap-3 p-4">
            <span className="text-sm">Con sonido</span>
            <Toggle checked={profile.notify_sound} onChange={(v) => save({ notify_sound: v })} label="Con sonido" />
          </div>
        )}
      </div>
    </>
  );
}
