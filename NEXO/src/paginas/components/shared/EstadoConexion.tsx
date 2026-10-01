import { useSyncExternalStore } from "react";

function escuchar(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => { window.removeEventListener("online", onChange); window.removeEventListener("offline", onChange); };
}

export default function EstadoConexion() {
  const conectado = useSyncExternalStore(escuchar, () => navigator.onLine, () => true);
  return conectado ? null : <div role="status" className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-lg rounded-xl border border-tertiary/40 bg-surface-container p-4 text-sm shadow-xl">
    <strong className="text-tertiary">Sin conexión.</strong> Revisá tu conexión antes de guardar o enviar. Podés reintentar cuando vuelva.
  </div>;
}
