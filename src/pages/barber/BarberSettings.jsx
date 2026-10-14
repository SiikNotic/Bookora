import { useRef, useState } from 'react';
import { Camera, Loader2, LogOut } from 'lucide-react';
import DiagnosticsCard from '../../components/DiagnosticsCard';
import { Avatar, TopBar } from '../../components/ui';
import { signOut, updateBarber, uploadAvatar } from '../../lib/api';
import { resizeImage } from '../../lib/images';
import { MUNICIPIOS } from '../../lib/municipios';
import { useStore } from '../../store/AppStore';
import { MenuButton } from '../client/ClientProfile';
import { BarberGate, useMyBarber } from './Dashboard';

/** Perfil público del barbero (lo que ven los clientes). */
export default function BarberSettings() {
  const res = useMyBarber();
  return (
    <BarberGate title="Mi perfil" res={res}>
      {(me) => <SettingsForm me={me} reload={res.reload} />}
    </BarberGate>
  );
}

function SettingsForm({ me, reload }) {
  const { session, toast } = useStore();
  const photoInput = useRef(null);
  const [form, setForm] = useState({
    name: me.name,
    shop: me.shop,
    municipio: me.municipio,
    address: me.address,
    phone: me.phone,
    years: me.years,
    bio: me.bio,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.name.trim().length >= 2 && form.shop.trim() && form.address.trim();

  const onAvatar = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    try {
      await uploadAvatar(me.id, await resizeImage(f, 500));
      toast('Foto de perfil actualizada');
      reload();
    } catch (err) {
      toast(err.message, 'warn');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateBarber(me.id, {
        ...form,
        name: form.name.trim(),
        shop: form.shop.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim(),
        years: Math.min(80, Math.max(0, Number(form.years) || 0)),
      });
      toast('Perfil guardado');
      reload();
    } catch (err) {
      toast(err.message, 'warn');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-10">
      <TopBar back="/barbero" title="Mi perfil" />
      <div className="px-4 pt-6">
        <div className="flex flex-col items-center">
          <button onClick={() => photoInput.current.click()} className="relative" aria-label="Cambiar foto" disabled={uploading}>
            <Avatar name={me.name || 'Barbero'} src={me.avatar} size={96} />
            <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-ink">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            </span>
          </button>
          <input ref={photoInput} type="file" accept="image/*" hidden onChange={onAvatar} />
          <p className="mt-2 text-xs text-muted">{session?.user?.email}</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={save}>
          <Field label="Nombre público">
            <input className="input" value={form.name} onChange={set('name')} maxLength={60} />
          </Field>
          <Field label="Barbería">
            <input className="input" value={form.shop} onChange={set('shop')} maxLength={60} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Municipio">
              <select className="input" value={form.municipio} onChange={set('municipio')}>
                {MUNICIPIOS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Años de experiencia">
              <input className="input" type="number" min="0" max="80" value={form.years} onChange={set('years')} />
            </Field>
          </div>
          <Field label="Dirección">
            <input className="input" value={form.address} onChange={set('address')} maxLength={120} />
          </Field>
          <Field label="Teléfono">
            <input className="input" inputMode="tel" value={form.phone} onChange={set('phone')} maxLength={25} />
          </Field>
          <Field label="Sobre mí">
            <textarea className="input min-h-[100px] resize-none" value={form.bio} onChange={set('bio')} maxLength={300} />
          </Field>
          <button type="submit" disabled={!valid || saving} className="btn-primary w-full">
            Guardar cambios
          </button>
        </form>

        <div className="card mt-8 divide-y divide-line/60">
          <MenuButton icon={LogOut} label="Cerrar sesión" onClick={() => signOut()} />
        </div>
        <DiagnosticsCard />
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
