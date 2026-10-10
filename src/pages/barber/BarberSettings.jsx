import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, LogOut, RotateCcw, UserRound } from 'lucide-react';
import DiagnosticsCard from '../../components/DiagnosticsCard';
import { Avatar, Confirm, TopBar } from '../../components/ui';
import { MUNICIPIOS } from '../../data/demoData';
import { resizeImage } from '../../lib/images';
import { useStore } from '../../store/AppStore';
import { MenuButton } from '../client/ClientProfile';
import { useMyBarber } from './Dashboard';

/** Perfil público del barbero (lo que ven los clientes) + opciones de la demo. */
export default function BarberSettings() {
  const { actions } = useStore();
  const nav = useNavigate();
  const me = useMyBarber();
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
  const [confirmReset, setConfirmReset] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.name.trim() && form.shop.trim();

  const onAvatar = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      actions.updateBarber(me.id, { avatar: await resizeImage(f, 400) });
      actions.toast('Foto de perfil actualizada');
    } catch (err) {
      actions.toast(err.message, 'warn');
    }
  };

  const exit = () => {
    actions.logout();
    nav('/');
  };

  return (
    <div className="pb-10">
      <TopBar back="/barbero" title="Mi perfil" />
      <div className="px-4 pt-6">
        <div className="flex flex-col items-center">
          <button onClick={() => photoInput.current.click()} className="relative" aria-label="Cambiar foto">
            <Avatar name={me.name} src={me.avatar} size={96} />
            <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-ink">
              <Camera size={16} />
            </span>
          </button>
          <input ref={photoInput} type="file" accept="image/*" hidden onChange={onAvatar} />
          <p className="mt-2 text-xs text-muted">Así te ven los clientes</p>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            actions.updateBarber(me.id, {
              ...form,
              name: form.name.trim(),
              shop: form.shop.trim(),
              years: Math.max(0, Number(form.years) || 0),
            });
            actions.toast('Perfil guardado');
          }}
        >
          <Field label="Nombre público">
            <input className="input" value={form.name} onChange={set('name')} maxLength={40} />
          </Field>
          <Field label="Barbería">
            <input className="input" value={form.shop} onChange={set('shop')} maxLength={40} />
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
              <input className="input" type="number" min="0" max="60" value={form.years} onChange={set('years')} />
            </Field>
          </div>
          <Field label="Dirección">
            <input className="input" value={form.address} onChange={set('address')} maxLength={80} />
          </Field>
          <Field label="Teléfono">
            <input className="input" inputMode="tel" value={form.phone} onChange={set('phone')} maxLength={20} />
          </Field>
          <Field label="Sobre mí">
            <textarea className="input min-h-[100px] resize-none" value={form.bio} onChange={set('bio')} maxLength={240} />
          </Field>
          <button type="submit" disabled={!valid} className="btn-primary w-full">
            Guardar cambios
          </button>
        </form>

        <h2 className="mb-3 mt-8 font-semibold">Demo</h2>
        <div className="card divide-y divide-line/60">
          <MenuButton icon={UserRound} label="Cambiar a modo cliente / otro barbero" onClick={exit} />
          <MenuButton icon={RotateCcw} label="Reiniciar datos de la demo" onClick={() => setConfirmReset(true)} />
          <MenuButton icon={LogOut} label="Salir" onClick={exit} />
        </div>
        <DiagnosticsCard />
      </div>

      <Confirm
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="¿Reiniciar la demo?"
        text="Se perderán tus cambios (servicios, horario, fotos, citas) y se cargarán los datos de ejemplo."
        confirmLabel="Reiniciar"
        danger
        onConfirm={() => {
          actions.resetDemo();
          actions.toast('Demo reiniciada');
          nav('/barbero');
        }}
      />
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
