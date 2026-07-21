import { useState } from "react";
import { decidirCola, type ItemCola } from "../../../servicios/biblioteca";

interface ModalRevisarRecursoProps {
  item: ItemCola;
  /** Se llama tras decidir con éxito (para cerrar y recargar la cola). */
  onDecidido: () => void;
  onCerrar: () => void;
}

// Revisa un recurso de la cola: aprobarlo (institucional o nacional) o
// rechazarlo con un motivo (Errores 9.A.2, 9.B.1). El circuito "institucional
// aprobado → nacional" del Error 2.E.7 vive en el botón "Aprobar para nacional".
export default function ModalRevisarRecurso({ item, onDecidido, onCerrar }: ModalRevisarRecursoProps) {
  const [motivo, setMotivo] = useState("");
  const [modoRechazo, setModoRechazo] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const decidir = async (
    accion:
      | { decision: "aprobar"; destino: "institucional" | "nacional" }
      | { decision: "rechazar"; motivo: string },
  ) => {
    setError("");
    setEnviando(true);
    try {
      await decidirCola(item.id, accion);
      onDecidido();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo registrar la decisión.");
      setEnviando(false);
    }
  };

  const rechazar = () => {
    if (!motivo.trim()) {
      setError("El rechazo necesita un motivo.");
      return;
    }
    void decidir({ decision: "rechazar", motivo: motivo.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md bg-surface-container rounded-3xl p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-white font-headline">Revisar recurso</h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="p-1.5 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-2 mb-6">
          <p className="text-white font-bold">{item.titulo}</p>
          {item.descripcion && (
            <p className="text-sm text-on-surface-variant">{item.descripcion}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full font-bold uppercase">
              {item.categoria}
            </span>
            <span className="text-on-surface-variant">
              {item.presentadoPor} · {item.tipo}
            </span>
          </div>
          {item.enlaceUrl && (
            <a
              href={item.enlaceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#C548F5] hover:underline"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Ver enlace
            </a>
          )}
          {item.archivo && (
            <p className="text-xs text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">attach_file</span>
              {item.archivo}
            </p>
          )}
        </div>

        {error && <p className="text-sm text-error mb-4">{error}</p>}

        {modoRechazo ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="motivo" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Motivo del rechazo
              </label>
              <textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Se le avisa a quien lo presentó."
                className="w-full px-4 py-2.5 bg-[#1C1030] border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-error focus:outline-none transition-colors resize-none"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setModoRechazo(false); setError(""); }}
                disabled={enviando}
                className="flex-1 py-3 border border-white/10 text-slate-300 font-bold rounded-full hover:bg-white/5 transition-colors text-sm disabled:opacity-60"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={rechazar}
                disabled={enviando}
                className="flex-1 py-3 bg-error/15 border border-error/30 text-error font-bold rounded-full hover:bg-error/25 transition-colors text-sm disabled:opacity-60"
              >
                {enviando ? "Rechazando…" : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void decidir({ decision: "aprobar", destino: "institucional" })}
              disabled={enviando}
              className="w-full py-3 bg-[#14B8A6]/15 border border-[#14B8A6]/30 text-[#14B8A6] font-bold rounded-full hover:bg-[#14B8A6]/25 transition-colors text-sm disabled:opacity-60"
            >
              Aprobar para la institución
            </button>
            <button
              type="button"
              onClick={() => void decidir({ decision: "aprobar", destino: "nacional" })}
              disabled={enviando}
              className="w-full py-3 bg-[#C548F5]/15 border border-[#C548F5]/30 text-[#C548F5] font-bold rounded-full hover:bg-[#C548F5]/25 transition-colors text-sm disabled:opacity-60"
            >
              Aprobar para la Biblioteca Nacional
            </button>
            <button
              type="button"
              onClick={() => { setModoRechazo(true); setError(""); }}
              disabled={enviando}
              className="w-full py-3 border border-white/10 text-slate-300 font-bold rounded-full hover:bg-white/5 transition-colors text-sm disabled:opacity-60"
            >
              Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
