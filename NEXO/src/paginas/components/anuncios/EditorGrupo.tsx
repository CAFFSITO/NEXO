// Crear o editar un grupo de difusión: nombre, tipo (uno a muchos, muchos a
// uno, todos con todos), color de sus tarjetas (primero los del diseño de la
// escuela) y quiénes envían y reciben. Cada preceptor muestra su turno,
// especialidad y cursos, y la lista se filtra por turno, ciclo y especialidad
// para sumar de una vez, por ejemplo, a "todos los del turno tarde". Las reglas
// de cada tipo las vuelve a validar el servidor (anuncios.js).

import { useMemo, useState, type CSSProperties } from "react";
import { useNavegacion } from "../../../navegacion";
import { useDialogo } from "../../../servicios/useDialogo";
import {
  PALETA_GRUPOS,
  TIPOS_GRUPO,
  archivarGrupo,
  crearGrupo,
  editarGrupo,
  estiloAviso,
  rolEnAvisos,
  type GrupoAnuncios,
  type PersonaAnuncio,
  type TipoGrupo,
} from "../../../servicios/anuncios";
import { NOMBRE_CICLO, cicloDe } from "../../../servicios/gestionAcademica";
import Avatar from "./Avatar";
import InfoPersona from "./InfoPersona";
import Selector from "../shared/Selector";

/** El dibujito de cada tipo de grupo: quién le habla a quién. */
function Diagrama({ tipo }: { tipo: TipoGrupo }) {
  const punto = (x: number, y: number, r = 7) => <circle cx={x} cy={y} r={r} fill="currentColor" />;
  const flecha = (x1: number, y1: number, x2: number, y2: number, k: string) => (
    <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity=".45" strokeWidth="2" markerEnd={`url(#av-punta-${tipo})`} />
  );
  return (
    <svg viewBox="0 0 160 54" aria-hidden="true" style={{ color: "var(--av-color)" }}>
      <defs>
        <marker id={`av-punta-${tipo}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0L10 5L0 10z" fill="currentColor" fillOpacity=".6" />
        </marker>
      </defs>
      {tipo === "uno-a-muchos" && <>
        {punto(30, 27, 10)}
        {[9, 27, 45].map((y, i) => flecha(44, 27, 116, y, "f" + i))}
        {[9, 27, 45].map((y) => <g key={y}>{punto(128, y)}</g>)}
      </>}
      {tipo === "muchos-a-uno" && <>
        {[9, 27, 45].map((y) => <g key={y}>{punto(32, y)}</g>)}
        {[9, 27, 45].map((y, i) => flecha(44, y, 114, 27, "f" + i))}
        {punto(130, 27, 10)}
      </>}
      {tipo === "muchos-a-muchos" && <>
        {[[52, 10], [108, 10], [52, 44], [108, 44]].map(([x, y], i, todos) =>
          todos.slice(i + 1).map(([x2, y2], j) => <line key={`${i}-${j}`} x1={x} y1={y} x2={x2} y2={y2} stroke="currentColor" strokeOpacity=".35" strokeWidth="2" />))}
        {[[52, 10], [108, 10], [52, 44], [108, 44]].map(([x, y]) => <g key={`${x}-${y}`}>{punto(x, y)}</g>)}
      </>}
    </svg>
  );
}

const ATAJO_ROL: Record<string, string> = {
  "admin-academico": "Toda la dirección",
  preceptor: "Toda la preceptoría",
  profesor: "Todos los docentes",
};

function SelectorPersonas({
  personas, elegidas, varias, deshabilitadas = [], onCambiar,
}: {
  personas: PersonaAnuncio[];
  elegidas: string[];
  varias: boolean;
  deshabilitadas?: string[];
  onCambiar: (ids: string[]) => void;
}) {
  // Filtros por turno, ciclo y especialidad (de los cursos de cada preceptor).
  const [turno, setTurno] = useState("");
  const [ciclo, setCiclo] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const todosLosCursos = personas.flatMap((p) => p.cursos ?? []);
  const unicos = (lista: (string | null)[]) => [...new Set(lista.filter((x): x is string => Boolean(x)))];
  const turnos = unicos(todosLosCursos.map((c) => c.turno));
  const especialidades = unicos(todosLosCursos.map((c) => c.especialidad));
  const ciclos = ["basico", "superior"] as const;
  const filtrando = Boolean(turno || ciclo || especialidad);
  // Un preceptor entra si tiene AL MENOS UN curso que cumple todo a la vez.
  const pasaFiltro = (p: PersonaAnuncio) =>
    !filtrando ||
    (p.cursos ?? []).some((c) =>
      (!turno || c.turno === turno) && (!ciclo || cicloDe(c.anio) === ciclo) && (!especialidad || c.especialidad === especialidad));
  const visibles = personas.filter(pasaFiltro);

  const disponibles = personas.filter((p) => !deshabilitadas.includes(p.id));
  const porRol = (rol: string) => disponibles.filter((p) => p.rol === rol).map((p) => p.id);
  const roles = [...new Set(disponibles.map((p) => p.rol))];
  const visiblesLibres = visibles.filter((p) => !deshabilitadas.includes(p.id)).map((p) => p.id);
  return (
    <div>
      {todosLosCursos.length > 0 && (
        <div className="av-filtros" role="group" aria-label="Filtrar por turno, ciclo y especialidad">
          <Selector aria-label="Turno" className="av-campo" value={turno} onChange={(e) => setTurno(e.target.value)}>
            <option value="">Todos los turnos</option>
            {turnos.map((t) => <option key={t} value={t}>Turno {t.toLocaleLowerCase("es")}</option>)}
          </Selector>
          <Selector aria-label="Ciclo" className="av-campo" value={ciclo} onChange={(e) => setCiclo(e.target.value)}>
            <option value="">Todos los ciclos</option>
            {ciclos.map((c) => <option key={c} value={c}>{NOMBRE_CICLO[c]}{c === "basico" ? " (1° a 3°)" : ""}</option>)}
          </Selector>
          {especialidades.length > 0 && (
            <Selector aria-label="Especialidad" className="av-campo" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)}>
              <option value="">Todas las especialidades</option>
              {especialidades.map((x) => <option key={x} value={x}>{x}</option>)}
            </Selector>
          )}
        </div>
      )}
      {varias && filtrando && (
        <div className="av-atajos">
          <button type="button" className="av-boton chico" disabled={visiblesLibres.length === 0} onClick={() => onCambiar([...new Set([...elegidas, ...visiblesLibres])])}>
            <span className="material-symbols-outlined" aria-hidden="true">group_add</span>
            {visiblesLibres.length === 1 ? "Agregar al que se ve" : `Agregar a los ${visiblesLibres.length} que se ven`}
          </button>
          <button type="button" className="av-boton suave chico" onClick={() => { setTurno(""); setCiclo(""); setEspecialidad(""); }}>
            Ver a todos
          </button>
        </div>
      )}
      {varias && !filtrando && (
        <div className="av-atajos">
          {roles.map((rol) => (
            <button key={rol} type="button" className="av-boton suave chico" onClick={() => onCambiar([...new Set([...elegidas, ...porRol(rol)])])}>
              <span className="material-symbols-outlined" aria-hidden="true">group_add</span>
              {ATAJO_ROL[rol] ?? `Todos: ${rolEnAvisos(rol)}`}
            </button>
          ))}
          {elegidas.length > 0 && (
            <button type="button" className="av-boton suave chico" onClick={() => onCambiar([])}>Quitar a todos</button>
          )}
        </div>
      )}
      <div className="av-personas" role="group">
        {visibles.length === 0 && <p className="text-sm text-on-surface-variant">Nadie tiene cursos con ese turno, ciclo y especialidad.</p>}
        {visibles.map((p) => {
          const elegida = elegidas.includes(p.id);
          const bloqueada = deshabilitadas.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              className="av-persona"
              aria-pressed={elegida}
              disabled={bloqueada}
              style={bloqueada ? { opacity: 0.4 } : undefined}
              title={bloqueada ? "Ya está del otro lado del grupo" : undefined}
              onClick={() => onCambiar(varias ? (elegida ? elegidas.filter((x) => x !== p.id) : [...elegidas, p.id]) : [p.id])}
            >
              <Avatar persona={p} />
              <InfoPersona persona={p} />
              <span className="av-check" aria-hidden="true" style={varias ? undefined : { borderRadius: "50%" }}>
                <span className="material-symbols-outlined">check</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  grupo: GrupoAnuncios | null;
  personas: PersonaAnuncio[];
  /** Los colores del diseño de la escuela (el acento primero). */
  paleta?: string[];
  institucionId?: string;
  onCerrar: () => void;
  onGuardado: () => void;
}

export default function EditorGrupo({ grupo, personas, paleta = [], institucionId, onCerrar, onGuardado }: Props) {
  const { usuario } = useNavegacion();
  const dialogo = useDialogo<HTMLDivElement>(onCerrar);
  const ids = (lista: PersonaAnuncio[] | undefined) => (lista ?? []).map((p) => p.id);
  const yo = usuario && personas.some((p) => p.id === String(usuario.id)) ? String(usuario.id) : null;

  const [nombre, setNombre] = useState(grupo?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(grupo?.descripcion ?? "");
  const [tipo, setTipo] = useState<TipoGrupo>(grupo?.tipo ?? "uno-a-muchos");
  // Un grupo nuevo arranca con el color de la escuela.
  const [color, setColor] = useState(grupo?.color ?? paleta[0] ?? PALETA_GRUPOS[0].color);
  const deLaEscuela = paleta.map((c, i) => ({ color: c, nombre: i === 0 ? "Color de la escuela" : `Color de la escuela ${i + 1}` }));
  const otros = PALETA_GRUPOS.filter((c) => !paleta.includes(c.color.toLowerCase()));
  const [emisores, setEmisores] = useState<string[]>(grupo ? ids(grupo.emisores) : yo ? [yo] : []);
  const [receptores, setReceptores] = useState<string[]>(grupo ? ids(grupo.receptores) : []);
  const [miembros, setMiembros] = useState<string[]>(grupo ? ids(grupo.miembros) : yo ? [yo] : []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [confirmarArchivo, setConfirmarArchivo] = useState(false);

  const nombreDe = useMemo(() => new Map(personas.map((p) => [p.id, p.nombre])), [personas]);
  const lista = (x: string[]) => x.map((id) => nombreDe.get(id)).filter(Boolean).join(", ") || "—";

  // Al cambiar de tipo se reacomoda a la gente elegida para no perderla.
  const cambiarTipo = (nuevo: TipoGrupo) => {
    if (nuevo === tipo) return;
    if (nuevo === "muchos-a-muchos") {
      setMiembros([...new Set([...emisores, ...receptores, ...miembros])]);
    } else if (tipo === "muchos-a-muchos") {
      const resto = miembros.filter((id) => id !== yo);
      if (nuevo === "uno-a-muchos") { setEmisores(yo ? [yo] : miembros.slice(0, 1)); setReceptores(yo ? resto : miembros.slice(1)); }
      else { setReceptores(yo ? [yo] : miembros.slice(0, 1)); setEmisores(yo ? resto : miembros.slice(1)); }
    } else {
      // uno-a-muchos ↔ muchos-a-uno: se dan vuelta los lados.
      setEmisores(receptores);
      setReceptores(emisores);
    }
    setTipo(nuevo);
  };

  const resumen = tipo === "uno-a-muchos"
    ? `${lista(emisores)} → ${lista(receptores)}`
    : tipo === "muchos-a-uno"
      ? `${lista(emisores)} → ${lista(receptores)}`
      : `${lista(miembros)} (todos con todos)`;

  const guardar = async () => {
    setGuardando(true);
    setError("");
    const datos = {
      nombre, descripcion, tipo, color,
      emisores: tipo === "muchos-a-muchos" ? [] : emisores,
      receptores: tipo === "muchos-a-muchos" ? [] : receptores,
      miembros: tipo === "muchos-a-muchos" ? miembros : [],
      ...(institucionId ? { institucionId } : {}),
    };
    try {
      if (grupo) await editarGrupo(grupo.id, datos);
      else await crearGrupo(datos);
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el grupo.");
    } finally {
      setGuardando(false);
    }
  };

  const archivar = async () => {
    if (!grupo) return;
    setGuardando(true);
    try {
      await archivarGrupo(grupo.id);
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo archivar el grupo.");
      setGuardando(false);
    }
  };

  return (
    <div className="av-modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div ref={dialogo} className="av-modal" role="dialog" aria-modal="true" aria-labelledby="av-editor-titulo" style={estiloAviso(color)}>
        <div className="av-modal-cab">
          <h3 id="av-editor-titulo">{grupo ? "Editar grupo" : "Nuevo grupo de difusión"}</h3>
          <button type="button" className="av-icono-boton" onClick={onCerrar} aria-label="Cerrar">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="av-modal-cuerpo">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="av-etiqueta">Nombre del grupo</span>
              <input className="av-campo" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder="Ej.: Dirección a Preceptoría" />
            </label>
            <label>
              <span className="av-etiqueta">Para qué es (opcional)</span>
              <input className="av-campo" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={200} placeholder="Ej.: Novedades del día y protocolos" />
            </label>
          </div>

          <div>
            <span className="av-etiqueta">Cómo circulan los avisos</span>
            <div className="av-tipos" role="group" aria-label="Tipo de grupo">
              {TIPOS_GRUPO.map((t) => (
                <button key={t.id} type="button" className="av-tipo" aria-pressed={tipo === t.id} onClick={() => cambiarTipo(t.id)}>
                  <Diagrama tipo={t.id} />
                  <span>
                    <strong>{t.nombre}</strong>
                    <small>{t.ejemplo}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="av-etiqueta">Color de sus tarjetas</span>
            {[
              { titulo: "Los del diseño de la escuela", colores: deLaEscuela },
              { titulo: deLaEscuela.length ? "Otros colores" : "", colores: otros },
            ].filter((fila) => fila.colores.length).map((fila) => (
              <div key={fila.titulo} className="mb-3">
                {fila.titulo && <p className="mb-2 text-xs text-on-surface-variant">{fila.titulo}</p>}
                <div className="av-colores" role="group" aria-label={fila.titulo || "Color"}>
                  {fila.colores.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      className="av-color"
                      style={estiloAviso(c.color) as CSSProperties}
                      aria-pressed={color === c.color}
                      aria-label={c.nombre}
                      title={c.nombre}
                      onClick={() => setColor(c.color)}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">check</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {tipo === "uno-a-muchos" && <>
            <div>
              <span className="av-etiqueta">Quién envía (una sola persona)</span>
              <SelectorPersonas personas={personas} elegidas={emisores} varias={false} onCambiar={(x) => { setEmisores(x); setReceptores((r) => r.filter((id) => !x.includes(id))); }} />
            </div>
            <div>
              <span className="av-etiqueta">Quiénes reciben</span>
              <SelectorPersonas personas={personas} elegidas={receptores} varias deshabilitadas={emisores} onCambiar={setReceptores} />
            </div>
          </>}
          {tipo === "muchos-a-uno" && <>
            <div>
              <span className="av-etiqueta">Quiénes envían</span>
              <SelectorPersonas personas={personas} elegidas={emisores} varias deshabilitadas={receptores} onCambiar={setEmisores} />
            </div>
            <div>
              <span className="av-etiqueta">Quién recibe (una sola persona)</span>
              <SelectorPersonas personas={personas} elegidas={receptores} varias={false} onCambiar={(x) => { setReceptores(x); setEmisores((e) => e.filter((id) => !x.includes(id))); }} />
            </div>
          </>}
          {tipo === "muchos-a-muchos" && (
            <div>
              <span className="av-etiqueta">Quiénes están en el grupo (todos envían y reciben)</span>
              <SelectorPersonas personas={personas} elegidas={miembros} varias onCambiar={setMiembros} />
            </div>
          )}

          <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-on-surface-variant">
            <span className="font-bold text-white">Cómo queda: </span>{resumen}
          </p>
          {error && <p className="text-sm text-error" role="alert">{error}</p>}
        </div>

        <div className="av-modal-pie">
          <div>
            {grupo && !confirmarArchivo && (
              <button type="button" className="av-boton peligro" onClick={() => setConfirmarArchivo(true)} disabled={guardando}>
                <span className="material-symbols-outlined" aria-hidden="true">archive</span>
                Archivar grupo
              </button>
            )}
            {grupo && confirmarArchivo && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-on-surface-variant">Ya no se podrá usar. Los avisos enviados se conservan.</span>
                <button type="button" className="av-boton peligro chico" onClick={archivar} disabled={guardando}>Sí, archivar</button>
                <button type="button" className="av-boton suave chico" onClick={() => setConfirmarArchivo(false)}>No</button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="av-boton suave" onClick={onCerrar}>Cancelar</button>
            <button type="button" className="av-boton" style={{ background: "var(--av-color)", color: "var(--av-tinta)" }} onClick={guardar} disabled={guardando || !nombre.trim()}>
              <span className="material-symbols-outlined" aria-hidden="true">save</span>
              {guardando ? "Guardando…" : grupo ? "Guardar cambios" : "Crear grupo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
