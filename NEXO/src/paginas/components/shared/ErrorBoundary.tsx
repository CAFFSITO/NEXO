import { Component, type ErrorInfo, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() { return { fallo: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Error de interfaz en NEXO", error, info.componentStack); }
  render() {
    if (!this.state.fallo) return this.props.children;
    return <main className="min-h-dvh grid place-items-center bg-background p-6">
      <div role="alert" className="max-w-md text-center rounded-2xl border border-outline-variant/40 bg-surface-container p-8">
        <span className="material-symbols-outlined text-primary text-4xl mb-4" aria-hidden="true">healing</span>
        <h1 className="text-xl font-headline font-bold mb-3">No pudimos abrir esta vista</h1>
        <p className="text-sm text-on-surface-variant mb-6">Podés volver a cargarla o regresar al inicio. Tus cambios guardados siguen disponibles.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => window.location.reload()} className="px-5 py-3 bg-primary text-on-primary rounded-xl font-semibold text-sm">Volver a cargar</button>
          <a href="/" className="px-5 py-3 border border-outline-variant rounded-xl text-sm">Ir al inicio</a>
        </div>
      </div>
    </main>;
  }
}
