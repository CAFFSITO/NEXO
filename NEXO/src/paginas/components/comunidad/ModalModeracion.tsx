import { useCallback, useEffect, useState } from "react";
import { textoRelativo } from "../../../servicios/fechas";
import {
  resolverDenuncia,
  traerDenuncias,
  type DenunciaModeracion,
} from "../../../servicios/comunidad";

interface Props {
  onCerrar: () => void;
}

// Bandeja de moderación (14.4.4): las denuncias pendientes de la escuela, que
// solo ven la dirección y los preceptores. Cada una se resuelve eliminando el
// contenido señalado o descartando la denuncia; todo queda registrado en la base.
export default function ModalModeracion({ onCerrar }: Props) {
  const [denuncias, setDenuncias] = useState<DenunciaModeracion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    traerDenuncias()
      .then((r) => setDenuncias(r.denuncias))
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo abrir la bandeja."));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resolver = async (id: string, resultado: "contenido-eliminado" | "descartada") => {
    try {
      await resolverDenuncia(id, resultado);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo resolver.");
    }
  };

  const ETIQUETA_TIPO: Record<string, string> = {
    publicacion: "Publicación",
    debate: "Debate",
    comentario: "Comentario",
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-[#241338] border border-white/10 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white font-headline flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-400">gavel</span>
            Bandeja de moderación
          </h3>
          <button onClick={onCerrar} className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {denuncias === null && !error && <p className="text-white/50 text-sm">Cargando…</p>}
          {denuncias?.length === 0 && (
            <div className="text-center py-10 text-white/40">
              <span className="material-symbols-outlined text-4xl mb-2">verified</span>
              <p className="text-sm">No hay denuncias pendientes. Todo tranquilo.</p>
            </div>
          )}
          {denuncias?.map((d) => (
            <div key={d.id} className="bg-[#1C1030] rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C548F5]/15 text-[#C548F5]">
                  {ETIQUETA_TIPO[d.objetoTipo]}
                </span>
                <span className="text-xs text-white/40">
                  denunciado por {d.denunciante} · {textoRelativo(d.creadoEn)}
                </span>
              </div>
              <p className="text-gray-300 text-sm mb-1 italic">“{d.extracto}”</p>
              <p className="text-orange-300 text-xs mb-3">Motivo: {d.motivo}</p>
              {d.objetoEliminado ? (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  El contenido ya fue eliminado.
                </p>
              ) : (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => resolver(d.id, "descartada")}
                    className="px-4 py-1.5 rounded-full text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={() => resolver(d.id, "contenido-eliminado")}
                    className="px-4 py-1.5 rounded-full text-xs font-bold bg-red-500/90 text-white hover:bg-red-500 transition-all"
                  >
                    Eliminar contenido
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
