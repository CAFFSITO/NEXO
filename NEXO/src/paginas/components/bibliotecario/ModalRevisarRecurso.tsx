import { useState } from "react";
import { decidirCola, type ItemCola } from "../../../servicios/biblioteca";
import { urlDescarga, urlPreview } from "../../../servicios/archivos";
import { ROL_LABELS } from "../shared/roles";

/** ¿El archivo es una imagen? Por su tipo MIME real o, si falta, por extensión. */
function esImagen(item: ItemCola): boolean {
  if (item.mime?.startsWith("image/")) return true;
  return ["PNG", "JPG", "JPEG", "GIF", "WEBP"].includes(item.etiquetaArchivo ?? "");
}

/** ¿El archivo es un PDF? Por su tipo MIME real o, si falta, por extensión. */
function esPdf(item: ItemCola): boolean {
  return item.mime === "application/pdf" || item.etiquetaArchivo === "PDF";
}

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

  // Botón de descarga con el MISMO patrón que la biblioteca: abre
  // /api/archivos/:id en otra pestaña, donde el servidor valida el permiso.
  const descargar = (archivoId: string) =>
    window.open(urlDescarga(archivoId), "_blank", "noopener");

  // La previsualización sale del archivo REAL vía /api/archivos/:id (nada
  // inventado): imagen embebida, PDF embebido, o —si no se puede mostrar— el
  // nombre + peso + un botón de descarga que funciona. Un enlace externo no se
  // mete en un iframe (la mayoría lo bloquea): se muestra la URL y se abre aparte.
  const renderPreview = () => {
    // Enlace externo: URL completa visible, dominio destacado, abrir en pestaña nueva.
    if (item.enlaceUrl) {
      let dominio = item.enlaceUrl;
      try {
        dominio = new URL(item.enlaceUrl).hostname;
      } catch {
        /* si no parsea, se muestra la URL entera igual */
      }
      return (
        <div className="rounded-2xl border border-white/10 bg-[#1C1030] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span className="material-symbols-outlined text-sm">link</span>
            Enlace externo
          </div>
          <p className="text-sm font-bold text-white break-all">{dominio}</p>
          <p className="text-xs text-on-surface-variant break-all">{item.enlaceUrl}</p>
          <a
            href={item.enlaceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 mt-1 px-3 py-2 bg-[#C548F5]/15 border border-[#C548F5]/30 text-[#C548F5] font-bold rounded-full hover:bg-[#C548F5]/25 transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            Abrir en pestaña nueva
          </a>
        </div>
      );
    }

    // A partir de acá: archivo. Si por lo que sea no hay id, no hay qué mostrar.
    if (!item.archivoId) return null;

    const meta = (
      <p className="text-xs text-on-surface-variant flex items-center gap-1">
        <span className="material-symbols-outlined text-sm">attach_file</span>
        {item.archivo}
        {item.tamano && <span className="text-slate-500">· {item.tamano}</span>}
        {item.etiquetaArchivo && <span className="text-slate-500">· {item.etiquetaArchivo}</span>}
      </p>
    );

    // Imagen: embebida y clicable (abre a tamaño real en otra pestaña).
    if (esImagen(item)) {
      return (
        <div className="space-y-2">
          <a href={urlPreview(item.archivoId)} target="_blank" rel="noreferrer noopener">
            <img
              src={urlPreview(item.archivoId)}
              alt={item.archivo ?? item.titulo}
              className="w-full max-h-[50vh] object-contain rounded-2xl border border-white/10 bg-[#1C1030] cursor-zoom-in"
            />
          </a>
          {meta}
        </div>
      );
    }

    // PDF: previsualización embebida con scroll propio + botón de descarga.
    if (esPdf(item)) {
      return (
        <div className="space-y-2">
          <iframe
            src={urlPreview(item.archivoId)}
            title={item.archivo ?? item.titulo}
            className="w-full h-[55vh] rounded-2xl border border-white/10 bg-white"
          />
          <div className="flex items-center justify-between gap-2">
            {meta}
            <button
              type="button"
              onClick={() => descargar(item.archivoId!)}
              className="inline-flex items-center gap-1 px-3 py-2 bg-white/5 border border-white/10 text-slate-200 font-bold rounded-full hover:bg-white/10 transition-colors text-sm shrink-0"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Descargar
            </button>
          </div>
        </div>
      );
    }

    // Cualquier otro archivo (docx, xlsx…): sin preview embebida, pero con nombre,
    // peso y un botón de descarga que funciona de verdad.
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1C1030] p-4 flex items-center justify-between gap-3">
        {meta}
        <button
          type="button"
          onClick={() => descargar(item.archivoId!)}
          className="inline-flex items-center gap-1 px-3 py-2 bg-white/5 border border-white/10 text-slate-200 font-bold rounded-full hover:bg-white/10 transition-colors text-sm shrink-0"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Descargar
        </button>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-2xl bg-surface-container rounded-3xl p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
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

        <div className="space-y-3 mb-6">
          <p className="text-white font-bold">{item.titulo}</p>
          {/* Descripción completa, sin truncar: hay que poder leerla toda para decidir. */}
          {item.descripcion && (
            <p className="text-sm text-on-surface-variant whitespace-pre-wrap">{item.descripcion}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full font-bold uppercase">
              {item.categoria}
            </span>
            {/* Quién lo presentó, con su rol (no solo el nombre). */}
            <span className="text-on-surface-variant">
              Presentado por {item.presentadoPor} · {ROL_LABELS[item.presentadoPorRol]} · {item.tipo}
            </span>
          </div>

          {/* ── Previsualización real del contenido ─────────────────────────── */}
          {renderPreview()}
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
