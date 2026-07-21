// SalaClase.tsx
// La clase en vivo, para docente y estudiantes (sección 14.3).
//
// Un solo componente para los dos roles (no dos copias, sección 1.4): lo que
// cambia según quién mira lo decide `esDocente`, que viene del SERVIDOR en el
// detalle de la clase. El docente dibuja, marca la trayectoria, ve el pulso con
// nombres, la alerta de ritmo y las preguntas; el estudiante ve todo, marca cómo
// va y pregunta. El video (Jitsi), la pizarra y el chat son los mismos para todos.
//
// Convive con el menú lateral (Error 3.B.3): esta sala se dibuja DENTRO del área
// de contenido de la página, no a pantalla completa. Al salir, la página decide a
// dónde volver (Error 3.B.12): el docente a su lista de clases, el estudiante a
// sus clases.

import { useCallback, useEffect, useState } from "react";
import {
  conectadosDeClase,
  detalleClase,
  entrarASala,
  enviarPregunta,
  finalizarClase,
  iniciarClase,
  marcarComprension,
  marcarEtapa,
  preguntasPendientes,
  pulsoDeClase,
  responderPregunta,
  salirDeSala,
  ajustarUmbral,
  type DetalleClase,
  type Etapa,
  type Persona,
  type PreguntaClase,
  type Pulso,
} from "../../../servicios/aula";
import { useTiempoReal, type EventoVivo } from "../../../servicios/tiempoReal";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import SalaJitsi from "./SalaJitsi";
import PizarraClase from "./PizarraClase";
import TrayectoriaVivo from "./TrayectoriaVivo";
import ChatClase from "./ChatClase";

interface SalaClaseProps {
  claseId: string;
  onSalir: () => void;
}

export default function SalaClase({ claseId, onSalir }: SalaClaseProps) {
  const [detalle, setDetalle] = useState<DetalleClase | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Datos de la sala (se piden al "entrar", que registra la asistencia).
  const [sala, setSala] = useState<string | null>(null);
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");

  const [cargarNum, setCargarNum] = useState(0);
  const recargarDetalle = useCallback(() => setCargarNum((n) => n + 1), []);

  // ── Traer el detalle de la clase ────────────────────────────────────────────
  useEffect(() => {
    let vigente = true;
    setError(null);
    detalleClase(claseId)
      .then(({ clase, etapas }) => {
        if (!vigente) return;
        setDetalle(clase);
        setEtapas(etapas);
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof Error ? e.message : "No se pudo abrir la clase.");
      });
    return () => {
      vigente = false;
    };
  }, [claseId, cargarNum]);

  // ── Entrar a la sala cuando la clase está en vivo (registra asistencia) ─────
  const enVivo = detalle?.estado === "en-vivo";
  useEffect(() => {
    if (!enVivo) return;
    let vigente = true;
    entrarASala(claseId)
      .then((entrada) => {
        if (!vigente) return;
        setSala(entrada.sala);
        setConversacionId(entrada.conversacionId);
        setNombre(entrada.nombre);
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof Error ? e.message : "No se pudo entrar a la sala.");
      });
    return () => {
      vigente = false;
      // Al salir de la pantalla se marca la hora de salida (Error 3.B.11).
      salirDeSala(claseId).catch(() => {});
    };
  }, [enVivo, claseId]);

  // ── Eventos en vivo comunes: la trayectoria y el fin de la clase ────────────
  const alRecibir = useCallback(
    (evento: EventoVivo) => {
      if (evento.claseId !== claseId) return;
      if (evento.tipo === "aula-etapas" && evento.etapas) {
        setEtapas(evento.etapas as Etapa[]);
      } else if (evento.tipo === "aula-estado" && evento.estado === "finalizada") {
        onSalir();
      }
    },
    [claseId, onSalir]
  );
  useTiempoReal(alRecibir);

  if (error) return <Fallo error={error} onReintentar={recargarDetalle} />;
  if (!detalle) return <Cargando que="la clase" />;

  const esDocente = detalle.esDocente;

  // ── La clase todavía no empezó ──────────────────────────────────────────────
  if (!enVivo) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <span className="material-symbols-outlined text-6xl text-primary">
          {detalle.estado === "finalizada" ? "history_edu" : "schedule"}
        </span>
        <h2 className="text-2xl font-bold text-white">{detalle.titulo}</h2>
        <p className="text-slate-400 max-w-md">{detalle.materiaCurso}</p>
        {detalle.estado === "finalizada" ? (
          <p className="text-slate-400">Esta clase ya finalizó.</p>
        ) : esDocente ? (
          <button
            onClick={() =>
              iniciarClase(claseId)
                .then(recargarDetalle)
                .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo iniciar."))
            }
            className="px-6 py-2.5 bg-primary text-white rounded-full font-bold flex items-center gap-2 hover:opacity-90 active:scale-95"
          >
            <span className="material-symbols-outlined">play_circle</span>
            Iniciar la clase
          </button>
        ) : (
          <p className="text-slate-400">La clase todavía no empezó. Volvé a entrar cuando el docente la inicie.</p>
        )}
        <button onClick={onSalir} className="text-sm text-slate-400 hover:text-white underline">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 h-full">
      {/* ── Columna principal: video + pizarra ── */}
      <div className="flex flex-col gap-4 min-w-0">
        <div className="h-[42vh] min-h-[280px]">
          {sala ? (
            <SalaJitsi sala={sala} nombre={nombre} esDocente={esDocente} />
          ) : (
            <div className="h-full rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-slate-400">
              Conectando el video…
            </div>
          )}
        </div>
        <div className="h-[38vh] min-h-[260px]">
          <PizarraClase claseId={claseId} esDocente={esDocente} />
        </div>
      </div>

      {/* ── Columna lateral: paneles ── */}
      <aside className="flex flex-col gap-4 min-w-0">
        <TrayectoriaVivo
          etapas={etapas}
          esDocente={esDocente}
          onMarcar={
            esDocente
              ? (etapaId, accion) =>
                  marcarEtapa(claseId, etapaId, accion)
                    .then(setEtapas)
                    .catch(() => {})
              : undefined
          }
        />

        {esDocente ? (
          <PanelDocente claseId={claseId} detalle={detalle} onFinalizar={onSalir} />
        ) : (
          <PanelEstudiante claseId={claseId} onSalir={onSalir} />
        )}

        {conversacionId && <ChatClase conversacionId={conversacionId} />}
      </aside>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Panel del DOCENTE: pulso con nombres, alerta de ritmo, preguntas, conectados.
// ════════════════════════════════════════════════════════════════════════════

function PanelDocente({
  claseId,
  detalle,
  onFinalizar,
}: {
  claseId: string;
  detalle: DetalleClase;
  onFinalizar: () => void;
}) {
  const [pulso, setPulso] = useState<Pulso | null>(null);
  const [preguntas, setPreguntas] = useState<PreguntaClase[]>([]);
  const [conectados, setConectados] = useState<Persona[]>([]);
  const [alerta, setAlerta] = useState<string | null>(null);
  const [umbralPct, setUmbralPct] = useState(detalle.umbralPct);
  const [umbralMin, setUmbralMin] = useState(detalle.umbralMin);

  const refrescarPulso = useCallback(() => {
    pulsoDeClase(claseId).then(setPulso).catch(() => {});
  }, [claseId]);
  const refrescarPreguntas = useCallback(() => {
    preguntasPendientes(claseId).then(setPreguntas).catch(() => {});
  }, [claseId]);
  const refrescarConectados = useCallback(() => {
    conectadosDeClase(claseId).then(setConectados).catch(() => {});
  }, [claseId]);

  useEffect(() => {
    refrescarPulso();
    refrescarPreguntas();
    refrescarConectados();
  }, [refrescarPulso, refrescarPreguntas, refrescarConectados]);

  // Los eventos que empuja el servidor le ahorran al docente recargar la pantalla.
  const alRecibir = useCallback(
    (evento: EventoVivo) => {
      if (evento.claseId !== claseId) return;
      if (evento.tipo === "aula-pulso") refrescarPulso();
      else if (evento.tipo === "aula-pregunta") refrescarPreguntas();
      else if (evento.tipo === "aula-conectados") refrescarConectados();
      else if (evento.tipo === "aula-alerta") {
        setAlerta(
          typeof evento.mensajeAlerta === "string"
            ? evento.mensajeAlerta
            : `El ${evento.pct ?? ""}% de la clase viene demorado.`
        );
      }
    },
    [claseId, refrescarPulso, refrescarPreguntas, refrescarConectados]
  );
  useTiempoReal(alRecibir);

  const guardarUmbral = () => {
    ajustarUmbral(claseId, umbralPct, umbralMin).catch(() => {});
  };

  return (
    <>
      {/* Alerta de ritmo (regla con umbral, no IA — Error 3.B.5) */}
      {alerta && (
        <div className="bg-error-container/20 border border-error/30 p-3 rounded-xl flex items-start gap-2">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
            warning
          </span>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-error">¡Alerta de ritmo!</h4>
            <p className="text-[11px] text-error/80 mt-0.5">{alerta}</p>
          </div>
          <button onClick={() => setAlerta(null)} className="text-error/60 hover:text-error" aria-label="Descartar">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Pulso del aula CON NOMBRES (Error 3.B.4) */}
      <div className="bg-surface-container-low/60 rounded-2xl border border-white/5 p-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mb-3">
          <span className="material-symbols-outlined text-base">monitor_heart</span>
          Pulso del aula
        </h3>
        <GrupoPulso titulo="Entienden" color="text-green-400" personas={pulso?.entiendo ?? []} />
        <GrupoPulso titulo="Más o menos" color="text-orange-400" personas={pulso?.masOMenos ?? []} />
        <GrupoPulso titulo="Perdidos" color="text-red-400" personas={pulso?.perdido ?? []} />
        {pulso && pulso.total === 0 && (
          <p className="text-xs text-slate-500">Nadie marcó su estado todavía.</p>
        )}

        {/* Umbral configurable de la alerta */}
        <div className="mt-3 pt-3 border-t border-white/5 flex items-end gap-2 flex-wrap">
          <label className="text-[10px] text-slate-400 flex flex-col gap-0.5">
            Umbral %
            <input
              type="number"
              min={1}
              max={100}
              value={umbralPct}
              onChange={(e) => setUmbralPct(Number(e.target.value))}
              className="w-16 bg-white/5 rounded-lg px-2 py-1 text-sm text-white outline-none"
            />
          </label>
          <label className="text-[10px] text-slate-400 flex flex-col gap-0.5">
            Durante (min)
            <input
              type="number"
              min={0}
              max={60}
              value={umbralMin}
              onChange={(e) => setUmbralMin(Number(e.target.value))}
              className="w-16 bg-white/5 rounded-lg px-2 py-1 text-sm text-white outline-none"
            />
          </label>
          <button
            onClick={guardarUmbral}
            className="px-3 py-1 rounded-lg bg-primary/20 text-primary text-xs hover:bg-primary/30"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Preguntas pendientes (Error 3.B.6, se conserva) */}
      <div className="bg-surface-container-low/60 rounded-2xl border border-white/5 p-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mb-3">
          <span className="material-symbols-outlined text-base">contact_support</span>
          Preguntas ({preguntas.length})
        </h3>
        {preguntas.length === 0 ? (
          <p className="text-xs text-slate-500">No hay preguntas pendientes.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {preguntas.map((p) => (
              <li key={p.id} className="bg-white/5 rounded-xl p-2">
                <p className="text-[10px] text-slate-400">{p.autor}</p>
                <p className="text-sm text-slate-100">{p.texto}</p>
                <button
                  onClick={() => responderPregunta(p.id).then(refrescarPreguntas).catch(() => {})}
                  className="mt-1 text-[10px] text-primary hover:underline"
                >
                  Marcar respondida
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Conectados NOMINALES (Error 3.B.11) */}
      <div className="bg-surface-container-low/60 rounded-2xl border border-white/5 p-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mb-3">
          <span className="material-symbols-outlined text-base">group</span>
          Conectados ({conectados.length})
        </h3>
        {conectados.length === 0 ? (
          <p className="text-xs text-slate-500">Nadie conectado todavía.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {conectados.map((c) => (
              <li key={c.id} className="text-sm text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                {c.nombre}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => {
          if (window.confirm("¿Finalizar la clase para todos los estudiantes?")) {
            finalizarClase(claseId).then(onFinalizar).catch(() => {});
          }
        }}
        className="px-4 py-2.5 bg-error/20 text-error rounded-full font-bold flex items-center justify-center gap-2 hover:bg-error/30"
      >
        <span className="material-symbols-outlined">call_end</span>
        Finalizar la clase
      </button>
    </>
  );
}

function GrupoPulso({ titulo, color, personas }: { titulo: string; color: string; personas: Persona[] }) {
  return (
    <div className="mb-2">
      <p className={`text-xs font-bold ${color} flex items-center justify-between`}>
        <span>{titulo}</span>
        <span>{personas.length}</span>
      </p>
      {personas.length > 0 && (
        <p className="text-[11px] text-slate-400 leading-snug">
          {personas.map((p) => p.nombre).join(", ")}
        </p>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Panel del ESTUDIANTE: marcar comprensión y preguntar.
// ════════════════════════════════════════════════════════════════════════════

function PanelEstudiante({ claseId, onSalir }: { claseId: string; onSalir: () => void }) {
  const [estado, setEstado] = useState<"entiendo" | "mas-o-menos" | "perdido" | null>(null);
  const [pregunta, setPregunta] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2500);
    return () => clearTimeout(t);
  }, [aviso]);

  const marcar = (nuevo: "entiendo" | "mas-o-menos" | "perdido") => {
    setEstado(nuevo);
    marcarComprension(claseId, nuevo).catch(() => {});
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = pregunta.trim();
    if (!limpio) return;
    setPregunta("");
    try {
      await enviarPregunta(claseId, limpio);
      setAviso("Tu pregunta fue enviada al docente.");
    } catch {
      /* ignore */
    }
  };

  const boton = (valor: "entiendo" | "mas-o-menos" | "perdido", label: string, color: string) => (
    <button
      onClick={() => marcar(valor)}
      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
        estado === valor ? `${color} border-white/40` : "bg-white/5 text-slate-300 border-transparent hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="bg-surface-container-low/60 rounded-2xl border border-white/5 p-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mb-3">
          <span className="material-symbols-outlined text-base">psychology</span>
          ¿Cómo venís?
        </h3>
        <div className="flex gap-2">
          {boton("entiendo", "Entiendo", "bg-green-500/30 text-green-300")}
          {boton("mas-o-menos", "Más o menos", "bg-orange-500/30 text-orange-300")}
          {boton("perdido", "Perdido", "bg-red-500/30 text-red-300")}
        </div>
      </div>

      <form onSubmit={enviar} className="bg-surface-container-low/60 rounded-2xl border border-white/5 p-4 flex flex-col gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">contact_support</span>
          Preguntar al docente
        </h3>
        <textarea
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          rows={2}
          placeholder="Escribí tu pregunta…"
          className="bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none resize-none focus:ring-1 focus:ring-primary"
        />
        <button type="submit" className="self-end px-4 py-1.5 rounded-full bg-primary text-white text-sm font-bold hover:opacity-90">
          Enviar
        </button>
        {aviso && <p className="text-[11px] text-green-400">{aviso}</p>}
      </form>

      <button
        onClick={() => {
          salirDeSala(claseId).catch(() => {});
          onSalir();
        }}
        className="px-4 py-2.5 bg-white/5 text-slate-300 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-white/10"
      >
        <span className="material-symbols-outlined">logout</span>
        Salir de la clase
      </button>
    </>
  );
}
