import { Component, type ErrorInfo, type ReactNode } from "react";

// Si una pantalla falla, se muestra un cartel en vez de una página en blanco.
// Al cambiar de ruta el cartel se va solo (`ruta`). Antes se reiniciaba con una
// `key` por ruta, pero eso desarmaba todo en cada navegación y obligaba a
// mostrar un "cargando" a pantalla completa entre página y página.
interface Props { children: ReactNode; ruta?: string }

export default class ErrorBoundary extends Component<Props, { fallo: boolean; rutaDelFallo?: string }> {
  state: { fallo: boolean; rutaDelFallo?: string } = { fallo: false };
  static getDerivedStateFromError() { return { fallo: true }; }
  static getDerivedStateFromProps(props: Props, state: { fallo: boolean; rutaDelFallo?: string }) {
    if (!state.fallo) return state.rutaDelFallo === props.ruta ? null : { rutaDelFallo: props.ruta };
    // Falló en esta ruta: se recuerda dónde; si después se navega a otra, se reintenta.
    if (state.rutaDelFallo === undefined) return { rutaDelFallo: props.ruta };
    return state.rutaDelFallo !== props.ruta ? { fallo: false, rutaDelFallo: props.ruta } : null;
  }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Error de interfaz en NEXO", error, info.componentStack); }
  render() {
    if (!this.state.fallo) return this.props.children;
    return <main className="min-h-dvh grid place-items-center bg-background p-6">
      <div role="alert" className="max-w-md text-center rounded-2xl border border-outline-variant/40 bg-surface-container p-8">
        <span className="material-symbols-outlined text-primary text-4xl mb-4" aria-hidden="true">healing</span>
        <h1 className="text-xl font-headline font-bold mb-3">No pudimos abrir esta vista</h1>
        <p className="text-sm text-on-surface-variant mb-6">Podés volver a cargarla o regresar al inicio. Tus cambios guardados siguen disponibles.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => window.location.reload()} className="nx-btn nx-btn-primario">Volver a cargar</button>
          <a href="/" className="nx-btn nx-btn-secundario">Ir al inicio</a>
        </div>
      </div>
    </main>;
  }
}
