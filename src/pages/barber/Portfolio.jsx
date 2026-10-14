import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Images, Loader2, Trash2 } from 'lucide-react';
import { Confirm, EmptyState, TopBar } from '../../components/ui';
import { addPhoto, removePhoto, reorderPhotos } from '../../lib/api';
import { resizeImage } from '../../lib/images';
import { useStore } from '../../store/AppStore';
import { BarberGate, useMyBarber } from './Dashboard';

/** Portafolio: subir fotos desde la galería/cámara, reordenar y borrar. */
export default function Portfolio() {
  const res = useMyBarber();
  return (
    <BarberGate title="Portafolio" res={res}>
      {(me) => <PortfolioView me={me} reload={res.reload} />}
    </BarberGate>
  );
}

function PortfolioView({ me, reload }) {
  const { toast } = useStore();
  const input = useRef(null);
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const onFiles = async (e) => {
    const files = [...e.target.files].filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    const batch = files.slice(0, 10);
    // Las nuevas van primero, en el orden elegido
    const first = (me.portfolio[0]?.position ?? 0) - batch.length;
    let done = 0;
    try {
      for (const [i, f] of batch.entries()) {
        await addPhoto(me.id, await resizeImage(f), first + i);
        done++;
      }
      toast(done === 1 ? 'Foto añadida' : `${done} fotos añadidas`);
    } catch (err) {
      toast(done ? `${done} fotos añadidas; falló el resto: ${err.message}` : err.message, 'warn');
    } finally {
      setUploading(false);
      reload();
    }
  };

  const index = me.portfolio.findIndex((p) => p.id === selected);
  const move = async (delta) => {
    const list = [...me.portfolio];
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
    try {
      await reorderPhotos(list);
    } catch (e) {
      toast(e.message, 'warn');
    }
    reload();
  };

  return (
    <div>
      <TopBar
        title="Portafolio"
        right={
          <button onClick={() => input.current.click()} className="btn-ghost" disabled={uploading}>
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />} Subir
          </button>
        }
      />
      {/* accept="image/*" abre galería o cámara en Android */}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={onFiles} />

      <div className={`px-4 pt-4 ${index >= 0 ? 'pb-24' : ''}`}>
        <p className="mb-4 text-sm text-muted">
          {me.portfolio.length} fotos · La primera es la portada en tu perfil. Toca una foto para moverla o borrarla.
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => input.current.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-muted"
          >
            <ImagePlus size={22} />
            <span className="text-xs">Añadir</span>
          </button>
          {me.portfolio.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelected(selected === p.id ? null : p.id)}
              className={`relative aspect-square overflow-hidden rounded-lg ${selected === p.id ? 'ring-2 ring-accent' : ''}`}
            >
              <img src={p.src} alt={p.label} className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px]">Portada</span>}
            </button>
          ))}
        </div>
        {!me.portfolio.length && (
          <EmptyState icon={Images} title="Sin fotos" text="Sube tus mejores cortes para atraer clientes." />
        )}
      </div>

      {index >= 0 && (
        <div className="pb-safe fixed inset-x-0 bottom-[72px] z-30 mx-auto max-w-md px-4">
          <div className="card flex items-center gap-2 bg-surface2 p-2 shadow-2xl">
            <button className="btn-secondary flex-1 py-2.5" disabled={index === 0} onClick={() => move(-1)}>
              <ArrowLeft size={16} /> Antes
            </button>
            <button className="btn-secondary flex-1 py-2.5" disabled={index === me.portfolio.length - 1} onClick={() => move(1)}>
              Después <ArrowRight size={16} />
            </button>
            <button aria-label="Borrar foto" className="btn-danger px-4 py-2.5" onClick={() => setToDelete(selected)}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      <Confirm
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="¿Borrar foto?"
        text="La foto se quitará de tu portafolio."
        confirmLabel="Borrar"
        danger
        onConfirm={async () => {
          try {
            await removePhoto(me.portfolio.find((p) => p.id === toDelete));
            setSelected(null);
            toast('Foto borrada');
          } catch (e) {
            toast(e.message, 'warn');
          }
          reload();
        }}
      />
    </div>
  );
}
