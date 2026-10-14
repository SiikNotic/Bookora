import { useState } from 'react';
import { Clock, Pencil, Plus, Scissors, Trash2 } from 'lucide-react';
import { Confirm, EmptyState, Sheet, TopBar } from '../../components/ui';
import { deleteService, saveService } from '../../lib/api';
import { duration, money } from '../../lib/format';
import { useStore } from '../../store/AppStore';
import { BarberGate, useMyBarber } from './Dashboard';

const DURATIONS = [15, 20, 25, 30, 40, 45, 50, 60, 70, 75, 90, 120];
const EMPTY = { name: '', description: '', duration: 30, price: '' };

export default function Services() {
  const res = useMyBarber();
  return (
    <BarberGate title="Servicios y precios" res={res}>
      {(me) => <ServicesView me={me} reload={res.reload} />}
    </BarberGate>
  );
}

function ServicesView({ me, reload }) {
  const { toast } = useStore();
  const [editing, setEditing] = useState(null);
  const save = async (fn, okMsg) => {
    try {
      await fn();
      toast(okMsg);
      reload();
      return true;
    } catch (e) {
      toast(e.message, 'warn');
      return false;
    }
  };
  const [toDelete, setToDelete] = useState(null);

  return (
    <div>
      <TopBar
        title="Servicios y precios"
        right={
          <button onClick={() => setEditing(EMPTY)} className="btn-ghost">
            <Plus size={18} /> Nuevo
          </button>
        }
      />
      <div className="space-y-3 px-4 pt-4">
        {me.services.map((s) => (
          <div key={s.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.name}</p>
                {s.description && <p className="mt-0.5 text-sm text-muted">{s.description}</p>}
                <p className="mt-2 flex items-center gap-3 text-sm">
                  <span className="font-semibold">{money(s.price)}</span>
                  <span className="flex items-center gap-1 text-muted">
                    <Clock size={13} /> {duration(s.duration)}
                  </span>
                </p>
              </div>
              <button
                aria-label="Editar"
                onClick={() => setEditing(s)}
                className="grid h-9 w-9 place-items-center rounded-full bg-surface2"
              >
                <Pencil size={16} />
              </button>
              <button
                aria-label="Eliminar"
                onClick={() => setToDelete(s)}
                className="grid h-9 w-9 place-items-center rounded-full bg-surface2 text-bad"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {!me.services.length && (
          <EmptyState
            icon={Scissors}
            title="Aún no tienes servicios"
            text="Añade al menos uno para que los clientes puedan reservar."
            action={
              <button className="btn-primary" onClick={() => setEditing(EMPTY)}>
                Añadir servicio
              </button>
            }
          />
        )}
      </div>

      {editing && (
        <ServiceForm
          service={editing}
          onClose={() => setEditing(null)}
          onSave={async (svc) => {
            if (await save(() => saveService(me.id, svc), svc.id ? 'Servicio actualizado' : 'Servicio añadido')) setEditing(null);
          }}
        />
      )}
      <Confirm
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="¿Eliminar servicio?"
        text={`"${toDelete?.name}" dejará de aparecer para nuevas reservas. Las citas ya hechas se mantienen.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={() => save(() => deleteService(toDelete.id), 'Servicio eliminado')}
      />
    </div>
  );
}

function ServiceForm({ service, onClose, onSave }) {
  const [form, setForm] = useState(service);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const price = Number(form.price);
  const valid = form.name.trim() && price > 0 && price <= 1000;

  return (
    <Sheet open onClose={onClose} title={service?.id ? 'Editar servicio' : 'Nuevo servicio'}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid)
            onSave({
              ...form,
              name: form.name.trim(),
              description: form.description.trim(),
              price,
              duration: Number(form.duration),
            });
        }}
      >
        <label className="block">
          <span className="label">Nombre</span>
          <input
            className="input"
            value={form.name}
            onChange={set('name')}
            placeholder="Ej. Fade + barba"
            maxLength={40}
            autoFocus
          />
        </label>
        <label className="block">
          <span className="label">Descripción</span>
          <textarea
            className="input min-h-[80px] resize-none"
            value={form.description}
            onChange={set('description')}
            maxLength={140}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Precio (USD)</span>
            <input
              className="input"
              inputMode="decimal"
              type="number"
              min="1"
              step="0.5"
              value={form.price}
              onChange={set('price')}
              placeholder="20"
            />
          </label>
          <label className="block">
            <span className="label">Duración</span>
            <select className="input" value={form.duration} onChange={set('duration')}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {duration(d)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" disabled={!valid} className="btn-primary w-full">
          Guardar
        </button>
      </form>
    </Sheet>
  );
}
