import { useState } from "react";
import {
  presentarRecurso,
  usarFiltros,
  type DatosPresentarRecurso,
  type Recurso,
} from "../../../servicios/biblioteca";

interface ModalPresentarRecursoProps {
  /** Se llama tras presentar con éxito (para cerrar y recargar la lista). */
  onPresentado: () => void;
  onCerrar: () => void;
}

const TIPOS: { valor: Recurso["tipo"]; label: string }[] = [
  { valor: "documento", label: "Documento" },
  { valor: "guia", label: "Guía" },
  { valor: "video", label: "Video" },
  { valor: "enlace", label: "Enlace" },
  { valor: "libro", label: "Libro" },
];

export default function ModalPresentarRecurso({ onPresentado, onCerrar }: ModalPresentarRecursoProps) {
  // Las materias salen de la base (Error 2.E.5): no es una lista fija.
  const { filtros } = usarFiltros();

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<Recurso["tipo"]>("documento");
  const [materiaId, setMateriaId] = useState<string>("");
  const [tematicaLibre, setTematicaLibre] = useState("");
  const [enlaceUrl, setEnlaceUrl] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setError("El recurso necesita un título.");
      return;
    }
    if (!archivo && !enlaceUrl.trim()) {
      setError("Adjuntá un archivo o pegá un enlace.");
      return;
    }

    setError("");
    setEnviando(true);
    try {
      const datos: DatosPresentarRecurso = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo,
        materiaId: materiaId ? Number(materiaId) : null,
        tematicaLibre: tematicaLibre.trim() || undefined,
        enlaceUrl: enlaceUrl.trim() || undefined,
        archivo,
      };
      await presentarRecurso(datos);
      onPresentado();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo presentar el recurso.");
      setEnviando(false);
    }
  };

  const inputClase =
    "w-full px-4 py-2.5 bg-[#1C1030] border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-[#C548F5] focus:outline-none transition-colors";
  const labelClase = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md bg-[#2D1B4E] rounded-3xl p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold text-white font-headline">Presentar recurso</h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="p-1.5 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Entra a la cola de revisión del bibliotecario. Al aprobarlo, se decide
          si queda en tu institución o pasa a la Biblioteca Nacional.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="titulo" className={labelClase}>Título</label>
            <input
              id="titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Guía de funciones cuadráticas"
              className={inputClase}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="descripcion" className={labelClase}>Descripción (opcional)</label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="¿De qué trata el recurso?"
              className={`${inputClase} resize-none`}
            />
          </div>

          <div>
            <label htmlFor="tipo" className={labelClase}>Tipo</label>
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as Recurso["tipo"])}
              className={inputClase}
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="materia" className={labelClase}>Materia (opcional)</label>
            <select
              id="materia"
              value={materiaId}
              onChange={(e) => setMateriaId(e.target.value)}
              className={inputClase}
            >
              <option value="">Sin materia (temática libre)</option>
              {filtros?.materias.map((m) => (
                <option key={m.id} value={String(m.id)}>{m.nombre}</option>
              ))}
            </select>
          </div>

          {!materiaId && (
            <div>
              <label htmlFor="tematica" className={labelClase}>Temática libre (opcional)</label>
              <input
                id="tematica"
                type="text"
                value={tematicaLibre}
                onChange={(e) => setTematicaLibre(e.target.value)}
                placeholder="Ej: inversiones, ajedrez…"
                className={inputClase}
              />
            </div>
          )}

          <div>
            <label htmlFor="enlace" className={labelClase}>Enlace</label>
            <input
              id="enlace"
              type="url"
              value={enlaceUrl}
              onChange={(e) => setEnlaceUrl(e.target.value)}
              placeholder="https://…"
              className={inputClase}
            />
          </div>

          <div>
            <label htmlFor="archivo" className={labelClase}>o subí un archivo</label>
            <input
              id="archivo"
              type="file"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#C548F5]/20 file:text-[#C548F5] hover:file:bg-[#C548F5]/30 file:cursor-pointer"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-3 border border-white/10 text-slate-300 font-bold rounded-full hover:bg-white/5 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex-1 py-3 bg-[#C548F5] hover:bg-[#d15aff] text-white font-bold rounded-full transition-all active:scale-95 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {enviando ? "Presentando…" : "Presentar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
