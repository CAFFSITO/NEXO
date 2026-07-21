import { useCallback, useEffect, useState } from "react";
import type { Rol } from "../shared/roles";
import { ROL_LABELS } from "../shared/roles";
import { textoRelativo } from "../../../servicios/fechas";
import {
  comentar,
  denunciar,
  eliminarContenido,
  traerDetalle,
  votar,
  type Comentario,
  type DetalleComunidad,
  type ObjetoTipo,
  type ObjetoVotable,
} from "../../../servicios/comunidad";
import MenuTresPuntos from "./MenuTresPuntos";
import ModalDenuncia from "./ModalDenuncia";

interface Props {
  tipo: ObjetoTipo;
  id: string;
  rol: Rol;
  usuarioId: number;
  onCerrar: () => void;
  /** Se llama al votar/comentar para que el feed de atrás refresque sus números. */
  onCambio?: () => void;
}

// Vista de detalle de una publicación o un debate con TODO su hilo de comentarios
// (Errores 2.B.2, 2.B.3, 2.B.7). Acá se lee la conversación, se comenta, se vota
// (cada voto privado) y se denuncia/elimina, con el mismo menú de tres puntos que
// el feed. Es la misma pieza para publicación y debate: una sola vista, no una
// por pestaña (sección 1.4).
export default function ModalDetalleComunidad({ tipo, id, rol, usuarioId, onCerrar, onCambio }: Props) {
  const [detalle, setDetalle] = useState<DetalleComunidad | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [denunciaDe, setDenunciaDe] = useState<{ tipo: ObjetoVotable; id: string } | null>(null);

  const cargar = useCallback(() => {
    traerDetalle(tipo, id)
      .then(setDetalle)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo abrir el detalle."));
  }, [tipo, id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Votar sobre el objeto principal o sobre un comentario. Actualiza en el acto
  // sin recargar todo el hilo, y avisa al feed de atrás.
  const votarObjeto = async (objTipo: ObjetoVotable, objId: string, valor: 1 | -1) => {
    try {
      const r = await votar(objTipo, objId, valor);
      setDetalle((prev) => {
        if (!prev) return prev;
        if (objTipo === tipo && objId === prev.objeto.id) {
          return { ...prev, objeto: { ...prev.objeto, ...r } };
        }
        return {
          ...prev,
          comentarios: prev.comentarios.map((c) =>
            c.id === objId ? { ...c, ...r } : c
          ),
        };
      });
      onCambio?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo votar.");
    }
  };

  const enviarComentario = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      await comentar(tipo, id, texto.trim());
      setTexto("");
      cargar();
      onCambio?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo comentar.");
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async (objTipo: ObjetoVotable, objId: string) => {
    try {
      await eliminarContenido(objTipo, objId);
      if (objTipo === tipo) {
        onCambio?.();
        onCerrar();
      } else {
        cargar();
        onCambio?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  };

  const o = detalle?.objeto;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-[#241338] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">
            {tipo === "debate" ? "Debate" : "Publicación"}
          </h3>
          <button onClick={onCerrar} className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {error && <p className="text-red-400 text-sm px-6 pt-4">{error}</p>}
          {!detalle && !error && (
            <p className="text-white/50 text-sm px-6 py-8 text-center">Abriendo…</p>
          )}

          {o && (
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center">
                    {o.autorAvatar ? (
                      <img src={o.autorAvatar} alt={o.autor} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-white">{o.autor.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{o.autor}</h4>
                    <span className="text-xs text-white/40">
                      {ROL_LABELS[o.autorRol]} · {textoRelativo(o.creadoEn)}
                    </span>
                  </div>
                </div>
                <MenuTresPuntos
                  rol={rol}
                  objetoTipo={tipo}
                  objetoId={o.id}
                  esAutor={o.autorId === String(usuarioId)}
                  onDenunciar={(t, i) => setDenunciaDe({ tipo: t, id: i })}
                  onEliminar={eliminar}
                />
              </div>
              {o.titulo && <h2 className="text-lg font-bold text-white mb-2">{o.titulo}</h2>}
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{o.contenido}</p>
              <BarraVotos
                aFavor={o.votosAFavor}
                enContra={o.votosEnContra}
                miVoto={o.miVoto}
                onVotar={(valor) => votarObjeto(tipo, o.id, valor)}
              />
            </div>
          )}

          {/* Comentarios */}
          {detalle && (
            <div className="p-6 space-y-4">
              <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">
                {detalle.comentarios.length} comentario{detalle.comentarios.length === 1 ? "" : "s"}
              </h4>
              {detalle.comentarios.length === 0 && (
                <p className="text-white/40 text-sm">Sé el primero en comentar.</p>
              )}
              {detalle.comentarios.map((c) => (
                <ComentarioFila
                  key={c.id}
                  comentario={c}
                  rol={rol}
                  onVotar={(valor) => votarObjeto("comentario", c.id, valor)}
                  onDenunciar={(t, i) => setDenunciaDe({ tipo: t, id: i })}
                  onEliminar={eliminar}
                />
              ))}
            </div>
          )}
        </div>

        {/* Caja para comentar */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviarComentario()}
            placeholder="Escribí un comentario…"
            className="flex-1 bg-[#1C1030] text-white rounded-full px-4 py-2.5 text-sm border border-[#3b2f50] focus:ring-1 focus:ring-[#C548F5] placeholder-white/30"
          />
          <button
            onClick={enviarComentario}
            disabled={!texto.trim() || enviando}
            className="bg-[#C548F5] text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#d15aff] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </div>
      </div>

      {denunciaDe && (
        <ModalDenuncia
          onCerrar={() => setDenunciaDe(null)}
          onEnviar={async (motivo) => {
            await denunciar(denunciaDe.tipo, denunciaDe.id, motivo);
            setDenunciaDe(null);
          }}
        />
      )}
    </div>
  );
}

function BarraVotos({
  aFavor,
  enContra,
  miVoto,
  onVotar,
}: {
  aFavor: number;
  enContra: number;
  miVoto: "a-favor" | "en-contra" | null;
  onVotar: (valor: 1 | -1) => void;
}) {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-400 pt-3 mt-3 border-t border-white/5">
      <button
        onClick={() => onVotar(1)}
        className={`flex items-center gap-1 transition-colors hover:text-emerald-400 ${
          miVoto === "a-favor" ? "text-emerald-400 font-bold" : ""
        }`}
      >
        <span className="material-symbols-outlined text-sm">thumb_up</span>
        <span>{aFavor}</span>
      </button>
      <button
        onClick={() => onVotar(-1)}
        className={`flex items-center gap-1 transition-colors hover:text-red-400 ${
          miVoto === "en-contra" ? "text-red-400 font-bold" : ""
        }`}
      >
        <span className="material-symbols-outlined text-sm">thumb_down</span>
        <span>{enContra}</span>
      </button>
    </div>
  );
}

function ComentarioFila({
  comentario: c,
  rol,
  onVotar,
  onDenunciar,
  onEliminar,
}: {
  comentario: Comentario;
  rol: Rol;
  onVotar: (valor: 1 | -1) => void;
  onDenunciar: (tipo: ObjetoVotable, id: string) => void;
  onEliminar: (tipo: ObjetoVotable, id: string) => void;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center shrink-0">
        {c.autorAvatar ? (
          <img src={c.autorAvatar} alt={c.autor} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="text-[10px] font-bold text-white">{c.autor.charAt(0)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-[#1C1030] rounded-2xl px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">{c.autor}</span>
            <MenuTresPuntos
              rol={rol}
              objetoTipo="comentario"
              objetoId={c.id}
              esAutor={false}
              onDenunciar={onDenunciar}
              onEliminar={onEliminar}
              orientacion="vert"
            />
          </div>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{c.contenido}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 px-2">
          <span>{textoRelativo(c.creadoEn)}</span>
          <button
            onClick={() => onVotar(1)}
            className={`flex items-center gap-1 hover:text-emerald-400 ${
              c.miVoto === "a-favor" ? "text-emerald-400 font-bold" : ""
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">thumb_up</span>
            {c.votosAFavor}
          </button>
          <button
            onClick={() => onVotar(-1)}
            className={`flex items-center gap-1 hover:text-red-400 ${
              c.miVoto === "en-contra" ? "text-red-400 font-bold" : ""
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">thumb_down</span>
            {c.votosEnContra}
          </button>
        </div>
      </div>
    </div>
  );
}
