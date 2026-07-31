import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import SubNavPortafolio from "./components/portafolio/SubNavPortafolio";
import TarjetaTarea from "./components/portafolio/TarjetaTarea";
import ModalDetalleTarea from "./components/portafolio/ModalDetalleTarea";
import PanelAlumnosProfesor from "./components/portafolio-docente/PanelAlumnosProfesor";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import { useNavegacion } from "../navegacion";
import { textoRelativo } from "../servicios/fechas";
import {
  usarDetalleMateria,
  usarAvisosMateria,
  reaccionarAviso,
  responderAviso,
  publicarAviso,
  editarAviso,
  eliminarAviso,
  editarRespuesta,
  eliminarRespuesta,
  traerDetalleAviso,
  EMOJIS_REACCION,
  type AvisoMateria,
  type EmojiReaccion,
  type HorarioCatedra,
  type ReaccionDetalle,
} from "../servicios/materia";

// Detalle de una materia. Lo abren el ALUMNO inscripto (desde Mis Cursos) y el
// PROFESOR de la cátedra (desde Gestión de Tareas). Todo real, de nexo.db.
// El profesor además publica y gestiona sus avisos; alumno y profesor editan y
// borran sus propias respuestas. El servidor valida cada acción por fila.

const DIA_LABEL: Record<HorarioCatedra["dia"], string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
};

const iniciales = (nombre: string) =>
  nombre.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

export default function DetalleMateriaPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const [params] = useSearchParams();
  const catedraId = params.get("catedra") ?? "";

  const { detalle, cargando, error, recargar } = usarDetalleMateria(catedraId);
  const { avisos: avisosServer } = usarAvisosMateria(catedraId);

  const [avisos, setAvisos] = useState<AvisoMateria[]>([]);
  useEffect(() => {
    if (avisosServer) setAvisos(avisosServer);
  }, [avisosServer]);

  const [tareaDetalleId, setTareaDetalleId] = useState<string | null>(null);

  if (!usuario) return null;
  const esProfesor = usuario.rol === "profesor";

  // ── Reacciones y respuestas (alumno y profesor) ──
  const handleReaccion = async (avisoId: string, emoji: EmojiReaccion) => {
    try {
      const res = await reaccionarAviso(avisoId, emoji);
      setAvisos((prev) =>
        prev.map((a) => (a.id === avisoId ? { ...a, reacciones: res.reacciones, miReaccion: res.miReaccion } : a)),
      );
    } catch (e) {
      console.error("No se pudo reaccionar", e);
    }
  };

  const handleResponder = async (avisoId: string, contenido: string) => {
    const nueva = await responderAviso(avisoId, contenido);
    setAvisos((prev) =>
      prev.map((a) => (a.id === avisoId ? { ...a, respuestas: [...a.respuestas, nueva] } : a)),
    );
  };

  const handleEditarRespuesta = async (avisoId: string, respuestaId: string, contenido: string) => {
    await editarRespuesta(respuestaId, contenido);
    setAvisos((prev) =>
      prev.map((a) =>
        a.id === avisoId
          ? { ...a, respuestas: a.respuestas.map((r) => (r.id === respuestaId ? { ...r, contenido } : r)) }
          : a,
      ),
    );
  };

  const handleEliminarRespuesta = async (avisoId: string, respuestaId: string) => {
    await eliminarRespuesta(respuestaId);
    setAvisos((prev) =>
      prev.map((a) =>
        a.id === avisoId ? { ...a, respuestas: a.respuestas.filter((r) => r.id !== respuestaId) } : a,
      ),
    );
  };

  // ── Publicar / editar / borrar avisos (solo el profesor) ──
  const handlePublicar = async (titulo: string, contenido: string) => {
    const nuevo = await publicarAviso(catedraId, titulo, contenido);
    setAvisos((prev) => [nuevo, ...prev]);
  };

  const handleEditarAviso = async (avisoId: string, titulo: string, contenido: string) => {
    await editarAviso(avisoId, titulo, contenido);
    setAvisos((prev) =>
      prev.map((a) =>
        a.id === avisoId
          ? { ...a, titulo: titulo || null, contenido, editadoEn: new Date().toISOString() }
          : a,
      ),
    );
  };

  const handleEliminarAviso = async (avisoId: string) => {
    await eliminarAviso(avisoId);
    setAvisos((prev) => prev.filter((a) => a.id !== avisoId));
  };

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <TopBar title="Portafolio de aprendizaje" subtitle="Materia" />

        {/* La subnav del Portafolio es del alumno; el profesor no la tiene. */}
        {!esProfesor && <SubNavPortafolio rutaActiva="/portafolio/mis-cursos" />}

        <div className="flex-1 overflow-y-auto bg-[#190d2d] p-8">
          <div className="max-w-5xl mx-auto">
            {/* Volver: el alumno a Mis Cursos; el profesor a Gestión de Tareas. */}
            <button
              onClick={() => navegar(esProfesor ? "/portafolio/gestion" : "/portafolio/mis-cursos")}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-6"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              {esProfesor ? "Gestión de Tareas" : "Mis Cursos"}
            </button>

            {cargando ? (
              <Cargando que="el detalle de la materia" />
            ) : error ? (
              <Fallo error={error} onReintentar={recargar} />
            ) : !detalle ? null : (
              <>
                {/* Encabezado: materia + profesor */}
                <header className="mb-10">
                  <h1 className="text-4xl font-black font-headline text-white tracking-tight">
                    {detalle.materia}
                  </h1>
                  <div className="flex items-center gap-2 mt-3 text-slate-300">
                    <div className="w-8 h-8 rounded-full bg-[#2D1B4E] flex items-center justify-center overflow-hidden text-[10px] font-bold text-white/60">
                      {detalle.profesorAvatar ? (
                        <img src={detalle.profesorAvatar} alt={detalle.profesor} className="w-full h-full object-cover" />
                      ) : (
                        iniciales(detalle.profesor)
                      )}
                    </div>
                    <span className="text-sm">
                      {detalle.profesor}
                      {detalle.soyProfesor && <span className="text-[#C548F5] font-semibold"> · vos</span>}
                    </span>
                  </div>
                </header>

                {/* Horarios / días */}
                <section className="mb-10">
                  <h2 className="text-lg font-bold text-white font-headline mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#C548F5]">schedule</span>
                    Horarios
                  </h2>
                  {detalle.horarios.length === 0 ? (
                    <p className="text-slate-400 text-sm bg-[#2D1B4E]/40 border border-white/5 rounded-[14px] p-5">
                      Esta materia todavía no tiene horarios cargados.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {detalle.horarios.map((h, i) => (
                        <div key={`${h.dia}-${h.horaInicio}-${i}`} className="bg-[#2D1B4E] border border-white/5 rounded-[14px] p-4">
                          <p className="text-white font-bold">{DIA_LABEL[h.dia]}</p>
                          <p className="text-slate-300 text-sm mt-1">{h.horaInicio} – {h.horaFin}</p>
                          {h.aula && <p className="text-slate-500 text-xs mt-1">Aula {h.aula}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Avisos del profesor */}
                <section className="mb-10">
                  <h2 className="text-lg font-bold text-white font-headline mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#C548F5]">campaign</span>
                    Avisos del profesor
                  </h2>

                  {/* Compositor: solo el profesor de la cátedra publica avisos. */}
                  {detalle.soyProfesor && <CompositorAviso onPublicar={handlePublicar} />}

                  {avisos.length === 0 ? (
                    <p className="text-slate-400 text-sm bg-[#2D1B4E]/40 border border-white/5 rounded-[14px] p-5">
                      {detalle.soyProfesor
                        ? "Todavía no publicaste avisos en esta materia."
                        : "El profesor todavía no publicó avisos en esta materia."}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {avisos.map((aviso) => (
                        <TarjetaAviso
                          key={aviso.id}
                          aviso={aviso}
                          catedraId={catedraId}
                          esProfesor={detalle.soyProfesor}
                          onReaccion={handleReaccion}
                          onResponder={handleResponder}
                          onEditarAviso={handleEditarAviso}
                          onEliminarAviso={handleEliminarAviso}
                          onEditarRespuesta={handleEditarRespuesta}
                          onEliminarRespuesta={handleEliminarRespuesta}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Alumnos + progreso: SOLO en la vista del profesor. La vista
                    del alumno (Prompt 9) no tiene nada de esto. */}
                {detalle.soyProfesor && <PanelAlumnosProfesor catedraId={catedraId} />}

                {/* Tareas de la materia: para el alumno (con entrega/feedback).
                    El profesor las gestiona en su propia pantalla. */}
                {!esProfesor && (
                  <section>
                    <h2 className="text-lg font-bold text-white font-headline mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#C548F5]">assignment</span>
                      Tareas de la materia
                    </h2>
                    {detalle.tareas.length === 0 ? (
                      <Vacio icono="task_alt" mensaje="Esta materia todavía no tiene tareas asignadas." />
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {detalle.tareas.map((tarea) => (
                          <TarjetaTarea
                            key={tarea.id}
                            tarea={tarea}
                            onVerDetalle={setTareaDetalleId}
                            onEntregar={setTareaDetalleId}
                            onVerFeedback={setTareaDetalleId}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {tareaDetalleId && (
        <ModalDetalleTarea
          tareaId={tareaDetalleId}
          onCerrar={() => setTareaDetalleId(null)}
          onCambio={recargar}
        />
      )}
    </div>
  );
}

// ─── Compositor de aviso (profesor) ─────────────────────────────────────────
function CompositorAviso({
  onPublicar,
}: {
  onPublicar: (titulo: string, contenido: string) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [enviando, setEnviando] = useState(false);

  const publicar = async () => {
    const texto = contenido.trim();
    if (!texto || enviando) return;
    setEnviando(true);
    try {
      await onPublicar(titulo.trim(), texto);
      setTitulo("");
      setContenido("");
    } catch (e) {
      console.error("No se pudo publicar el aviso", e);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bg-[#2D1B4E] border border-[#C548F5]/20 rounded-[14px] p-5 mb-4">
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título (opcional)"
        className="w-full bg-[#1C1030] text-white text-sm font-bold rounded-lg px-4 py-2 mb-2 border border-white/5 focus:ring-1 focus:ring-[#C548F5] placeholder-white/30"
      />
      <textarea
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        rows={3}
        placeholder="Escribí un aviso para tu curso…"
        className="w-full bg-[#1C1030] text-white text-sm rounded-lg px-4 py-2 border border-white/5 focus:ring-1 focus:ring-[#C548F5] placeholder-white/30 resize-none"
      />
      <div className="flex justify-end mt-3">
        <button
          onClick={publicar}
          disabled={!contenido.trim() || enviando}
          className="px-6 py-2 bg-[#C548F5] text-white rounded-full text-sm font-bold hover:bg-[#d15aff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {enviando ? "Publicando…" : "Publicar aviso"}
        </button>
      </div>
    </div>
  );
}

// ─── Tarjeta de un aviso, con reacciones, respuestas y (si es mío) gestión ──
function TarjetaAviso({
  aviso,
  catedraId,
  esProfesor,
  onReaccion,
  onResponder,
  onEditarAviso,
  onEliminarAviso,
  onEditarRespuesta,
  onEliminarRespuesta,
}: {
  aviso: AvisoMateria;
  catedraId: string;
  esProfesor: boolean;
  onReaccion: (avisoId: string, emoji: EmojiReaccion) => void;
  onResponder: (avisoId: string, contenido: string) => Promise<void>;
  onEditarAviso: (avisoId: string, titulo: string, contenido: string) => Promise<void>;
  onEliminarAviso: (avisoId: string) => Promise<void>;
  onEditarRespuesta: (avisoId: string, respuestaId: string, contenido: string) => Promise<void>;
  onEliminarRespuesta: (avisoId: string, respuestaId: string) => Promise<void>;
}) {
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [editTitulo, setEditTitulo] = useState(aviso.titulo ?? "");
  const [editContenido, setEditContenido] = useState(aviso.contenido);
  // El profesor puede ver QUIÉNES reaccionaron (nombres + emoji). Se pide al
  // servidor bajo demanda (solo el docente dueño lo recibe).
  const [reactores, setReactores] = useState<ReaccionDetalle[] | null>(null);
  const [verReactores, setVerReactores] = useState(false);

  const totalReacciones = Object.values(aviso.reacciones).reduce((a, n) => a + (n ?? 0), 0);

  const alternarReactores = async () => {
    if (verReactores) {
      setVerReactores(false);
      return;
    }
    setVerReactores(true);
    try {
      const d = await traerDetalleAviso(catedraId, aviso.id);
      setReactores(d.reacciones);
    } catch (e) {
      console.error("No se pudo traer quién reaccionó", e);
    }
  };

  const enviar = async () => {
    const texto = respuesta.trim();
    if (!texto || enviando) return;
    setEnviando(true);
    try {
      await onResponder(aviso.id, texto);
      setRespuesta("");
    } catch (e) {
      console.error("No se pudo responder", e);
    } finally {
      setEnviando(false);
    }
  };

  const guardarEdicion = async () => {
    if (!editContenido.trim()) return;
    await onEditarAviso(aviso.id, editTitulo.trim(), editContenido.trim());
    setEditando(false);
  };

  return (
    <div className="bg-[#2D1B4E] border border-white/5 rounded-[14px] p-5">
      {/* Autor + fecha + acciones (si el aviso es mío) */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-[#1C1030] flex items-center justify-center overflow-hidden text-[10px] font-bold text-white/60 shrink-0">
          {aviso.autorAvatar ? (
            <img src={aviso.autorAvatar} alt={aviso.autor} className="w-full h-full object-cover" />
          ) : (
            iniciales(aviso.autor)
          )}
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-bold leading-tight">{aviso.autor}</p>
          <p className="text-white/30 text-[10px]">
            {textoRelativo(aviso.creadoEn)}
            {aviso.editadoEn && " · editado"}
          </p>
        </div>
        {aviso.esMio && !editando && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                setEditTitulo(aviso.titulo ?? "");
                setEditContenido(aviso.contenido);
                setEditando(true);
              }}
              className="p-1.5 text-white/40 hover:text-white transition-colors"
              title="Editar aviso"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
            <button
              onClick={() => onEliminarAviso(aviso.id)}
              className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
              title="Borrar aviso"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        )}
      </div>

      {editando ? (
        <div className="mb-2">
          <input
            type="text"
            value={editTitulo}
            onChange={(e) => setEditTitulo(e.target.value)}
            placeholder="Título (opcional)"
            className="w-full bg-[#1C1030] text-white text-sm font-bold rounded-lg px-3 py-2 mb-2 border border-white/5 focus:ring-1 focus:ring-[#C548F5]"
          />
          <textarea
            value={editContenido}
            onChange={(e) => setEditContenido(e.target.value)}
            rows={3}
            className="w-full bg-[#1C1030] text-white text-sm rounded-lg px-3 py-2 border border-white/5 focus:ring-1 focus:ring-[#C548F5] resize-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setEditando(false)} className="px-3 py-1.5 text-sm text-white/60 hover:text-white">
              Cancelar
            </button>
            <button
              onClick={guardarEdicion}
              disabled={!editContenido.trim()}
              className="px-4 py-1.5 bg-[#C548F5] text-white rounded-full text-sm font-bold hover:bg-[#d15aff] disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <>
          {aviso.titulo && <h3 className="text-white font-bold mb-1">{aviso.titulo}</h3>}
          <p className="text-slate-200 text-sm whitespace-pre-wrap">{aviso.contenido}</p>
        </>
      )}

      {/* Reacciones: set FIJO de emojis, una por persona (se alterna) */}
      <div className="flex flex-wrap gap-2 mt-4">
        {EMOJIS_REACCION.map((emoji) => {
          const cuenta = aviso.reacciones[emoji] ?? 0;
          const mia = aviso.miReaccion === emoji;
          return (
            <button
              key={emoji}
              onClick={() => onReaccion(aviso.id, emoji)}
              aria-pressed={mia}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-colors ${
                mia
                  ? "bg-[#C548F5]/20 border-[#C548F5]/50 text-white"
                  : "bg-[#1C1030] border-white/5 text-slate-300 hover:border-white/20"
              }`}
            >
              <span>{emoji}</span>
              {cuenta > 0 && <span className="text-xs font-bold">{cuenta}</span>}
            </button>
          );
        })}
      </div>

      {/* Solo el profesor: ver quién reaccionó (nombres + emoji). */}
      {esProfesor && totalReacciones > 0 && (
        <div className="mt-3">
          <button
            onClick={alternarReactores}
            className="text-xs text-slate-400 hover:text-[#C548F5] font-semibold flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">{verReactores ? "expand_less" : "expand_more"}</span>
            {verReactores ? "Ocultar reacciones" : `Ver quién reaccionó (${totalReacciones})`}
          </button>
          {verReactores && reactores && (
            <div className="mt-2 flex flex-wrap gap-2">
              {reactores.map((r, i) => (
                <span key={i} className="flex items-center gap-1 bg-[#1C1030] rounded-full pl-1 pr-3 py-1">
                  <span className="w-5 h-5 rounded-full bg-[#2D1B4E] flex items-center justify-center overflow-hidden text-[8px] font-bold text-white/50">
                    {r.avatar ? <img src={r.avatar} alt={r.nombre} className="w-full h-full object-cover" /> : r.nombre.slice(0, 1)}
                  </span>
                  <span className="text-xs text-slate-300">{r.nombre}</span>
                  <span className="text-sm">{r.emoji}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Respuestas */}
      {aviso.respuestas.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
          {aviso.respuestas.map((r) => (
            <Respuesta
              key={r.id}
              avisoId={aviso.id}
              respuesta={r}
              onEditar={onEditarRespuesta}
              onEliminar={onEliminarRespuesta}
            />
          ))}
        </div>
      )}

      {/* Responder */}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") enviar();
          }}
          placeholder="Escribí una respuesta…"
          className="flex-1 bg-[#1C1030] text-white text-sm rounded-full px-4 py-2 border border-white/5 focus:ring-1 focus:ring-[#C548F5] placeholder-white/30"
        />
        <button
          onClick={enviar}
          disabled={!respuesta.trim() || enviando}
          className="px-4 py-2 bg-[#C548F5] text-white rounded-full text-sm font-bold hover:bg-[#d15aff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Responder
        </button>
      </div>
    </div>
  );
}

// ─── Una respuesta, con editar/borrar si es mía ─────────────────────────────
function Respuesta({
  avisoId,
  respuesta,
  onEditar,
  onEliminar,
}: {
  avisoId: string;
  respuesta: AvisoMateria["respuestas"][number];
  onEditar: (avisoId: string, respuestaId: string, contenido: string) => Promise<void>;
  onEliminar: (avisoId: string, respuestaId: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(respuesta.contenido);

  const guardar = async () => {
    if (!texto.trim()) return;
    await onEditar(avisoId, respuesta.id, texto.trim());
    setEditando(false);
  };

  return (
    <div className="flex items-start gap-2 group">
      <div className="w-6 h-6 rounded-full bg-[#1C1030] flex items-center justify-center overflow-hidden text-[9px] font-bold text-white/50 shrink-0">
        {respuesta.autorAvatar ? (
          <img src={respuesta.autorAvatar} alt={respuesta.autor} className="w-full h-full object-cover" />
        ) : (
          iniciales(respuesta.autor)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-white/80 text-xs">
          <span className="font-bold text-white">{respuesta.autor}</span>{" "}
          <span className="text-white/30">· {textoRelativo(respuesta.creadoEn)}</span>
        </p>
        {editando ? (
          <div className="mt-1">
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") guardar();
              }}
              className="w-full bg-[#1C1030] text-white text-sm rounded-lg px-3 py-1.5 border border-white/5 focus:ring-1 focus:ring-[#C548F5]"
            />
            <div className="flex gap-2 mt-1">
              <button onClick={() => setEditando(false)} className="text-xs text-white/50 hover:text-white">
                Cancelar
              </button>
              <button onClick={guardar} disabled={!texto.trim()} className="text-xs text-[#C548F5] font-bold hover:underline disabled:opacity-40">
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-200 text-sm whitespace-pre-wrap">{respuesta.contenido}</p>
        )}
      </div>
      {respuesta.esMia && !editando && (
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              setTexto(respuesta.contenido);
              setEditando(true);
            }}
            className="p-1 text-white/40 hover:text-white transition-colors"
            title="Editar respuesta"
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button
            onClick={() => onEliminar(avisoId, respuesta.id)}
            className="p-1 text-white/40 hover:text-red-400 transition-colors"
            title="Borrar respuesta"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
