// src/paginas/components/portafolio-docente/ModalPanelCorreccion.tsx
// Panel de corrección del profesor (14.7 paso 4, Errores 3.C.9 y 2.C.6).
//
// Muestra la lista COMPLETA del curso con el estado de cada estudiante (entregó
// / tarde / no entregó), abre cada entregable (con sus archivos) y permite
// cargar la nota y la devolución. Esa corrección va a `correcciones`, la misma
// tabla que lee Calificaciones del alumno: una sola nota por trabajo (Error
// 13.1). Antes "corregir" no existía: la tarjeta mostraba números fijos.

import { useCallback, useEffect, useState } from "react";
import {
  traerPanel,
  corregirEntrega,
  type PanelCorreccion,
  type FilaCorreccion,
} from "../../../servicios/tareas";
import { urlDescarga, tamanoLegible } from "../../../servicios/archivos";
import { ErrorDeApi } from "../../../servicios/api";
import { textoRelativo } from "../../../servicios/fechas";

const BADGE: Record<FilaCorreccion["estado"], { label: string; clase: string }> = {
  entregado: { label: "A tiempo", clase: "bg-emerald-500/10 text-emerald-400" },
  tarde: { label: "Tarde", clase: "bg-amber-500/10 text-amber-400" },
  "no-entrego": { label: "Sin entregar", clase: "bg-rose-500/10 text-rose-400" },
};

interface Props {
  tareaId: string;
  onCerrar: () => void;
  /** Tras corregir, refresca la lista de fondo (cambian los conteos). */
  onCambio: () => void;
}

export default function ModalPanelCorreccion({ tareaId, onCerrar, onCambio }: Props) {
  const [panel, setPanel] = useState<PanelCorreccion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null); // estudianteId expandido

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    traerPanel(tareaId)
      .then((p) => {
        setPanel(p);
        setCargando(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "No se pudo abrir el panel.");
        setCargando(false);
      });
  }, [tareaId]);

  useEffect(() => cargar(), [cargar]);

  const entregados = panel?.alumnos.filter((a) => a.estado !== "no-entrego").length ?? 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#2D1B4E] rounded-2xl border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-white/10 sticky top-0 bg-[#2D1B4E] z-10">
          <div>
            <h3 className="text-xl font-extrabold text-white font-headline">
              {panel?.tarea.titulo ?? "Panel de corrección"}
            </h3>
            {panel && (
              <p className="text-slate-400 text-sm mt-1">
                {panel.tarea.materia} — {panel.tarea.curso} · {entregados}/
                {panel.alumnos.length} entregaron
              </p>
            )}
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-3">
          {cargando ? (
            <p className="text-slate-400 text-sm">Cargando el curso…</p>
          ) : error ? (
            <p className="text-rose-400 text-sm">{error}</p>
          ) : panel ? (
            panel.alumnos.map((al) => (
              <FilaAlumno
                key={al.estudianteId}
                fila={al}
                expandido={abierto === al.estudianteId}
                onToggle={() =>
                  setAbierto((prev) => (prev === al.estudianteId ? null : al.estudianteId))
                }
                onCorregido={() => {
                  onCambio();
                  cargar();
                }}
              />
            ))
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilaAlumno({
  fila,
  expandido,
  onToggle,
  onCorregido,
}: {
  fila: FilaCorreccion;
  expandido: boolean;
  onToggle: () => void;
  onCorregido: () => void;
}) {
  const badge = BADGE[fila.estado];
  const tieneEntrega = fila.entregaId !== null;

  return (
    <div className="bg-[#1C1030] rounded-[12px] border border-white/5">
      {/* Cabecera de la fila */}
      <button
        onClick={tieneEntrega ? onToggle : undefined}
        disabled={!tieneEntrega}
        className={`w-full flex items-center gap-4 p-4 text-left ${
          tieneEntrega ? "hover:bg-white/5" : "cursor-default"
        } transition-colors rounded-[12px]`}
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
          {fila.nombre.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{fila.nombre}</p>
          {fila.entregadoEn && (
            <p className="text-slate-500 text-xs">
              Entregó {textoRelativo(fila.entregadoEn).toLowerCase()}
            </p>
          )}
        </div>
        {fila.correccion && (
          <span className="text-lg font-black text-[#C548F5]">
            {fila.correccion.nota}
            <span className="text-xs text-slate-400">/10</span>
          </span>
        )}
        <span className={`px-3 py-1 text-[10px] font-bold rounded-full tracking-wider ${badge.clase}`}>
          {badge.label}
        </span>
        {tieneEntrega && (
          <span className="material-symbols-outlined text-slate-400">
            {expandido ? "expand_less" : "expand_more"}
          </span>
        )}
      </button>

      {/* Detalle expandible con la entrega y el formulario de corrección */}
      {expandido && tieneEntrega && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {fila.comentario && (
            <p className="text-slate-300 text-sm bg-[#2D1B4E] rounded-lg p-3">
              {fila.comentario}
            </p>
          )}

          {fila.archivos.length > 0 && (
            <ul className="space-y-2">
              {fila.archivos.map((a) => (
                <li key={a.id}>
                  <a
                    href={urlDescarga(a.id)}
                    className="flex items-center gap-3 bg-[#2D1B4E] rounded-lg px-4 py-2.5 hover:bg-[#37205c] transition-colors group"
                  >
                    <span className="material-symbols-outlined text-[#C548F5]">description</span>
                    <span className="text-slate-200 text-sm flex-1 truncate group-hover:text-white">
                      {a.nombre}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {tamanoLegible(a.tamanoBytes)}
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-lg">
                      download
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <FormularioCorreccion fila={fila} onCorregido={onCorregido} />
        </div>
      )}
    </div>
  );
}

function FormularioCorreccion({
  fila,
  onCorregido,
}: {
  fila: FilaCorreccion;
  onCorregido: () => void;
}) {
  const [nota, setNota] = useState<string>(
    fila.correccion ? String(fila.correccion.nota) : ""
  );
  const [devolucion, setDevolucion] = useState<string>(fila.correccion?.devolucion ?? "");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const guardar = async () => {
    const n = Number(nota);
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      setAviso("La nota tiene que ir de 1 a 10.");
      return;
    }
    setGuardando(true);
    setAviso(null);
    try {
      await corregirEntrega(fila.entregaId as string, n, devolucion.trim());
      onCorregido();
    } catch (e: unknown) {
      setAviso(e instanceof ErrorDeApi ? e.message : "No se pudo guardar la corrección.");
      setGuardando(false);
    }
  };

  return (
    <div className="bg-[#2D1B4E] rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-slate-300">Nota</label>
        <input
          type="number"
          min={1}
          max={10}
          step={0.5}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className="w-24 bg-[#1C1030] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#C548F5]"
        />
        <span className="text-slate-500 text-sm">/ 10</span>
      </div>
      <textarea
        value={devolucion}
        onChange={(e) => setDevolucion(e.target.value)}
        rows={3}
        placeholder="Devolución para el estudiante…"
        className="w-full bg-[#1C1030] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C548F5] resize-none"
      />
      {aviso && <p className="text-sm text-rose-400 font-medium">{aviso}</p>}
      <div className="flex justify-end">
        <button
          onClick={guardar}
          disabled={guardando}
          className="px-5 py-2 bg-[#C548F5] text-black font-bold rounded-full hover:bg-white transition-colors disabled:opacity-40"
        >
          {guardando
            ? "Guardando…"
            : fila.correccion
            ? "Actualizar corrección"
            : "Guardar corrección"}
        </button>
      </div>
    </div>
  );
}
