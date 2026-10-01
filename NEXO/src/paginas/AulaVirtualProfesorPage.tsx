// AulaVirtualProfesorPage.tsx
// Aula Virtual (Profesor) — Etapa 9, sección 14.3.
//
// Dos momentos en una sola página, según la dirección:
//  · sin `?clase=…`  → PLANIFICACIÓN: la lista de clases planificadas y el
//    formulario para crear una nueva con sus etapas (Errores 3.B.9 y 3.B.10).
//    Cuando llegó la fecha, cada clase muestra "Iniciar" y un clic abre la sala.
//  · con `?clase=ID` → la SALA en vivo de esa clase (componente SalaClase),
//    que convive con el menú lateral (Error 3.B.3).
//
// Ningún dato es inventado: las clases, cátedras y etapas salen de nexo.db a
// través del servidor (regla de oro 3). El permiso de crear/iniciar se valida
// en la cocina (regla de oro 4): esta página solo dibuja lo que el servidor deja.

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import { useNavegacion } from "../navegacion";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import SalaClase from "./components/aula-virtual/SalaClase";
import {
  crearClase,
  iniciarClase,
  useCatedras,
  useClasesPlanificadas,
  type ClasePlanificada,
} from "../servicios/aula";
import { fechaCorta } from "../servicios/fechas";

export default function AulaVirtualProfesorPage() {
  const { usuario, navegar, cerrarSesion } = useNavegacion();
  const [params] = useSearchParams();
  const claseActiva = params.get("clase");

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen">
        <TopBar title="Aula Virtual" subtitle={claseActiva ? "En vivo" : undefined} />
        <div className="flex-1 overflow-y-auto bg-[#190d2d] p-6">
          {claseActiva ? (
            <SalaClase key={claseActiva}
              claseId={claseActiva}
              onSalir={() => navegar("/portafolio-docente/aula-virtual")}
            />
          ) : (
            <Planificacion onEntrar={(id) => navegar(`/portafolio-docente/aula-virtual?clase=${id}`)} />
          )}
        </div>
      </main>
    </div>
  );
}

// ── Vista de planificación: lista + formulario ────────────────────────────────

function Planificacion({ onEntrar }: { onEntrar: (claseId: string) => void }) {
  const { clases, cargando, error, recargar } = useClasesPlanificadas();
  const [creando, setCreando] = useState(false);
  useEffect(() => { const t = window.setInterval(recargar, 30000); return () => window.clearInterval(t); }, [recargar]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Mis clases</h1>
          <p className="text-slate-400 mt-1">Planificá tus clases y entrá en vivo cuando llegue la hora.</p>
        </div>
        <button
          onClick={() => setCreando((v) => !v)}
          className="px-4 py-2 bg-primary text-white rounded-full font-bold flex items-center gap-2 hover:opacity-90 active:scale-95"
        >
          <span className="material-symbols-outlined">{creando ? "close" : "add"}</span>
          {creando ? "Cerrar" : "Planificar clase"}
        </button>
      </div>

      {creando && (
        <FormularioClase
          onCreada={() => {
            setCreando(false);
            recargar();
          }}
        />
      )}

      {cargando && <Cargando que="tus clases" />}
      {error && <Fallo error={error} onReintentar={recargar} />}
      {clases && clases.length === 0 && (
        <Vacio icono="event_note" mensaje="Todavía no planificaste ninguna clase." />
      )}

      <div className="flex flex-col gap-3">
        {clases?.map((c) => (
          <TarjetaClase key={c.id} clase={c} onEntrar={onEntrar} onIniciada={recargar} />
        ))}
      </div>
    </div>
  );
}

function TarjetaClase({
  clase,
  onEntrar,
  onIniciada,
}: {
  clase: ClasePlanificada;
  onEntrar: (id: string) => void;
  onIniciada: () => void;
}) {
  const [iniciando, setIniciando] = useState(false);
  const [errorInicio, setErrorInicio] = useState("");
  const iniciar = async () => {
    if (iniciando) return;
    setIniciando(true); setErrorInicio("");
    try { await iniciarClase(clase.id); onIniciada(); onEntrar(clase.id); }
    catch (e) { setErrorInicio(e instanceof Error ? e.message : "No se pudo iniciar la clase."); }
    finally { setIniciando(false); }
  };
  const etiquetaEstado: Record<ClasePlanificada["estado"], { texto: string; clase: string }> = {
    planificada: { texto: "Planificada", clase: "bg-slate-500/20 text-slate-300" },
    "en-vivo": { texto: "En vivo", clase: "bg-red-500/20 text-red-400 animate-pulse" },
    finalizada: { texto: "Finalizada", clase: "bg-green-500/20 text-green-400" },
    cancelada: { texto: "Cancelada", clase: "bg-slate-600/20 text-slate-400" },
  };
  const badge = etiquetaEstado[clase.estado];

  return (
    <div className="bg-surface-container-low/60 rounded-2xl border border-white/5 p-4 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-white font-bold truncate">{clase.titulo}</h3>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.clase}`}>{badge.texto}</span>
        </div>
        <p className="text-sm text-slate-400 mt-0.5">
          {clase.materiaCurso} · {fechaCorta(clase.fechaHora)}{" "}
          {new Date(clase.fechaHora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        {errorInicio && <p role="alert" className="mt-2 text-sm text-red-300">{errorInicio}</p>}
      </div>
      {clase.enVivo ? (
        <button
          onClick={() => onEntrar(clase.id)}
          className="px-4 py-2 bg-red-500 text-white rounded-full font-bold flex items-center gap-2 hover:opacity-90 active:scale-95"
        >
          <span className="material-symbols-outlined">videocam</span>
          Entrar
        </button>
      ) : clase.iniciable ? (
        <button
          onClick={iniciar}
          disabled={iniciando}
          className="px-4 py-2 bg-primary text-white rounded-full font-bold flex items-center gap-2 hover:opacity-90 active:scale-95"
        >
          <span className="material-symbols-outlined">play_circle</span>
          {iniciando ? "Iniciando…" : "Iniciar"}
        </button>
      ) : clase.estado === "finalizada" ? (
        <span className="text-xs text-slate-500">Terminada</span>
      ) : (
        <span className="text-xs text-slate-500">{clase.estado === "cancelada" ? "Cancelada" : "Aún no es la hora"}</span>
      )}
    </div>
  );
}

// ── Formulario de nueva clase con etapas ──────────────────────────────────────

interface EtapaBorrador {
  titulo: string;
  duracion: string;
}

function FormularioClase({ onCreada }: { onCreada: () => void }) {
  const { catedras, cargando, error: errorCatedras } = useCatedras();
  const [catedraId, setCatedraId] = useState<number | "">("");
  const [titulo, setTitulo] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [objetivos, setObjetivos] = useState("");
  const [materiales, setMateriales] = useState("");
  const [etapas, setEtapas] = useState<EtapaBorrador[]>([{ titulo: "", duracion: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const catedraElegida = catedraId || catedras?.[0]?.id || "";

  const cambiarEtapa = (i: number, campo: keyof EtapaBorrador, valor: string) => {
    setEtapas((prev) => prev.map((e, idx) => (idx === i ? { ...e, [campo]: valor } : e)));
  };
  const agregarEtapa = () => setEtapas((prev) => [...prev, { titulo: "", duracion: "" }]);
  const quitarEtapa = (i: number) => setEtapas((prev) => prev.filter((_, idx) => idx !== i));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    setError(null);
    if (catedraElegida === "") return setError("Elegí la materia y el curso.");
    if (!titulo.trim()) return setError("Escribí el título de la clase.");
    if (!fechaHora) return setError("Elegí la fecha y la hora.");

    setGuardando(true);
    try {
      await crearClase({
        catedraId: Number(catedraElegida),
        titulo: titulo.trim(),
        // El input datetime-local da "2026-07-20T10:00"; le sumamos segundos.
        fechaHora: new Date(fechaHora).toISOString(),
        objetivos: objetivos.trim(),
        materiales: materiales.trim(),
        etapas: etapas
          .filter((et) => et.titulo.trim())
          .map((et) => ({
            titulo: et.titulo.trim(),
            duracion: et.duracion ? Number(et.duracion) : undefined,
          })),
      });
      onCreada();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo crear la clase.");
    } finally {
      setGuardando(false);
    }
  };

  const campo = "w-full bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary";

  return (
    <form onSubmit={guardar} className="bg-surface-container-low/60 rounded-2xl border border-white/5 p-5 space-y-3">
      <h2 className="text-lg font-bold text-white">Nueva clase</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs text-slate-400 flex flex-col gap-1">
          Materia y curso
          <select
            value={catedraElegida}
            onChange={(e) => setCatedraId(e.target.value === "" ? "" : Number(e.target.value))}
            className={campo}
            disabled={cargando || !!errorCatedras}
          >
            {cargando && <option>Cargando…</option>}
            {!cargando && !catedras?.length && <option value="">Sin cátedras asignadas</option>}
            {catedras?.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#190d2d]">
                {c.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400 flex flex-col gap-1">
          Fecha y hora
          <input
            type="datetime-local"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
            className={campo}
          />
        </label>
      </div>

      <label className="text-xs text-slate-400 flex flex-col gap-1">
        Título
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Repaso antes del parcial" className={campo} />
      </label>

      <label className="text-xs text-slate-400 flex flex-col gap-1">
        Objetivos
        <textarea value={objetivos} onChange={(e) => setObjetivos(e.target.value)} rows={2} className={`${campo} resize-none`} />
      </label>

      <label className="text-xs text-slate-400 flex flex-col gap-1">
        Materiales
        <input value={materiales} onChange={(e) => setMateriales(e.target.value)} className={campo} />
      </label>

      <div>
        <p className="text-xs text-slate-400 mb-2">Etapas de la clase (trayectoria)</p>
        <div className="flex flex-col gap-2">
          {etapas.map((et, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={et.titulo}
                onChange={(e) => cambiarEtapa(i, "titulo", e.target.value)}
                placeholder={`Etapa ${i + 1} (ej: Repaso)`}
                className={`${campo} flex-1 min-w-0`}
              />
              <input
                type="number"
                min={1}
                value={et.duracion}
                onChange={(e) => cambiarEtapa(i, "duracion", e.target.value)}
                placeholder="min"
                className={`${campo} !w-20 shrink-0`}
              />
              {etapas.length > 1 && (
                <button type="button" onClick={() => quitarEtapa(i)} className="text-slate-400 hover:text-red-400" aria-label="Quitar etapa">
                  <span className="material-symbols-outlined">remove_circle</span>
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={agregarEtapa} className="mt-2 text-xs text-primary hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">add</span>
          Agregar etapa
        </button>
      </div>

      {(error || errorCatedras) && <p role="alert" className="text-sm text-red-400">{error || errorCatedras}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={guardando || cargando || !!errorCatedras || !catedras?.length}
          className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Crear clase"}
        </button>
      </div>
    </form>
  );
}
