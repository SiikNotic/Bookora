import { Component } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';

/**
 * Si una pantalla falla, muestra el error y un botón para reintentar
 * en lugar de dejar la app en negro.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Bookora: error en pantalla', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="pt-safe flex min-h-screen flex-col items-center justify-center px-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-warn/15 text-warn">
          <TriangleAlert size={30} />
        </div>
        <p className="mt-5 text-lg font-semibold">Algo salió mal en esta pantalla</p>
        <p className="mt-2 break-words font-mono text-xs text-muted">{String(error?.message || error)}</p>
        <div className="mt-6 flex gap-3">
          <button className="btn-secondary" onClick={() => this.setState({ error: null })}>
            Reintentar
          </button>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            <RotateCcw size={16} /> Recargar
          </button>
        </div>
      </div>
    );
  }
}
