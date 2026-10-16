// src/paginas/components/perfiles/ModalPerfil.tsx
// Modal de alta y edición de perfil. Recoge nombre, rol (los siete que la
// dirección administra, incluidos Familia y Bibliotecario), correo y estado.
//
// El correo es la cuenta con la que la persona entra, así que es obligatorio
// (Error 6.B.3). Viene con la terminación de la escuela ya escrita
// ("@sinvueltas.org"): la dirección solo completa lo de adelante, y si no lo
// toca, se le sugiere a partir del nombre ("rosa.martinez").
//
// En el ALTA se pueden asignar cursos (opcional): el curso del estudiante, los
// cursos a cargo del preceptor, y los cursos del profesor con la materia que da
// en cada uno (en la base, un profesor se une a un curso por una cátedra). Si un
// curso ya tiene preceptor, o esa materia ya tiene profesor, se avisa antes de
// guardar que el lugar pasa a la persona nueva. En la edición, los cursos se
// siguen cambiando desde Cursos y materias.
//
// `onGuardar` es asíncrono y devuelve un mensaje de error del servidor (o null
// si salió bien): así una alta rechazada —por ejemplo un correo repetido— deja
// el modal abierto mostrando el motivo, en vez de tragarse el problema.

import { useState } from "react";
import VinculosFamilia from "./VinculosFamilia";
import { META_ROL, ROLES, type Perfil, type PerfilEditable, type Rol } from "./tipos";
import { usePerfilesEscuela } from "../../../servicios/instancia";
import { useOpcionesAlta, type Asignacion, type OpcionesAlta } from "../../../servicios/perfiles";
import { agruparCursos } from "../../../servicios/gestionAcademica";
import Selector from "../shared/Selector";

interface ModalPerfilProps {
  abierto: boolean;
  // Si se pasa un perfil, el modal entra en modo edición; si es null, modo alta.
  perfilEnEdicion: Perfil | null;
  onCerrar: () => void;
  onGuardar: (datos: PerfilEditable, idEnEdicion: string | null) => Promise<string | null>;
}

const VACIO: PerfilEditable = {
  nombre: "",
  rol: "estudiante",
  email: "",
  estado: "activo",
  perfilClave: "",
};

const CAMPO =
  "bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white placeholder:text-on-surface-variant/50 focus:border-primary outline-none";

const ROLES_CON_CURSOS: Rol[] = ["estudiante", "preceptor", "profesor"];

/** "Rosa Martínez" → "rosa.martinez": lo de adelante del correo, sugerido. */
function sugerirUsuario(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join(".")
    .slice(0, 40);
}

export default function ModalPerfil({
  abierto,
  perfilEnEdicion,
  onCerrar,
  onGuardar,
}: ModalPerfilProps) {
  const [datos, setDatos] = useState<PerfilEditable>(() => perfilEnEdicion ? { nombre: perfilEnEdicion.nombre, rol: perfilEnEdicion.rol, email: perfilEnEdicion.email ?? "", estado: perfilEnEdicion.estado === "papelera" ? "activo" : perfilEnEdicion.estado, perfilClave: perfilEnEdicion.perfilClave ?? "" } : VACIO);
  // Los perfiles que diseñó el Maestro para esta escuela. Solo se ofrecen los
  // que nacen del rol elegido (el servidor igual lo exige).
  const { perfiles: perfilesEscuela } = usePerfilesEscuela();
  const disenados = (perfilesEscuela ?? []).filter((p) => !p.predeterminado && p.arquetipo === datos.rol);
  const { opciones, cargando: cargandoOpciones } = useOpcionesAlta();
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // ── Correo: lo de adelante + la terminación de la escuela ──
  const dominio = opciones?.dominio ?? null;
  const [usuarioCorreo, setUsuarioCorreo] = useState(() => (perfilEnEdicion?.email ?? "").split("@")[0]);
  // Mientras la dirección no escriba en el correo, se sugiere desde el nombre.
  const [correoTocado, setCorreoTocado] = useState(perfilEnEdicion !== null);
  // "Usar otro correo": para la cuenta que no lleva la terminación de la escuela.
  // null = automático (en la edición, libre si el correo es de otra terminación).
  const [correoLibre, setCorreoLibre] = useState<boolean | null>(null);
  const libreDeEntrada =
    perfilEnEdicion !== null && !(perfilEnEdicion.email ?? "").toLowerCase().endsWith(`@${dominio}`);
  const conTerminacion = dominio !== null && !(correoLibre ?? libreDeEntrada);

  // ── Cursos (solo en el alta): curso → materia ("" si no es profesor) ──
  const [seleccion, setSeleccion] = useState<Record<string, string>>({});
  const [ultimaMateria, setUltimaMateria] = useState("");

  if (!abierto) return null;

  const meta = META_ROL[datos.rol];
  const esEdicion = perfilEnEdicion !== null;
  const llevaCursos = !esEdicion && ROLES_CON_CURSOS.includes(datos.rol);

  const actualizar = <K extends keyof PerfilEditable>(campo: K, valor: PerfilEditable[K]) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setError("");
  };

  const cambiarNombre = (nombre: string) => {
    actualizar("nombre", nombre);
    if (!correoTocado) setUsuarioCorreo(sugerirUsuario(nombre));
  };

  const correoFinal = () =>
    (conTerminacion ? `${usuarioCorreo.trim()}@${dominio}` : datos.email.trim()).toLowerCase();

  const asignaciones = (): Asignacion[] =>
    Object.entries(seleccion).map(([cursoId, materiaId]) =>
      datos.rol === "profesor" ? { cursoId, materiaId } : { cursoId },
    );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (datos.nombre.trim() === "") {
      setError("El nombre es obligatorio.");
      return;
    }
    if (conTerminacion && usuarioCorreo.trim() === "") {
      setError("Completá el correo: escribí lo que va antes de la @ (por ejemplo, su nombre).");
      return;
    }
    // El correo es la cuenta: sin él la persona no puede entrar (Error 6.B.3).
    const email = correoFinal();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("El correo no es válido. Usá solo letras, números, puntos o guiones, sin espacios.");
      return;
    }
    if (llevaCursos && datos.rol === "profesor") {
      const sinMateria = Object.entries(seleccion).find(([, materiaId]) => !materiaId);
      if (sinMateria) {
        const curso = opciones?.cursos.find((c) => c.id === sinMateria[0]);
        setError(`Elegí qué materia da en ${curso?.nombre ?? "cada curso marcado"}.`);
        return;
      }
    }

    setGuardando(true);
    const fallo = await onGuardar(
      { ...datos, nombre: datos.nombre.trim(), email, asignaciones: llevaCursos ? asignaciones() : [] },
      perfilEnEdicion?.id ?? null,
    );
    setGuardando(false);
    // Si el servidor rechazó (correo repetido, etc.), se muestra y el modal
    // sigue abierto. Si salió bien, la página cierra el modal.
    if (fallo) setError(fallo);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onClick={onCerrar}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-lienzo border border-surface-variant rounded-2xl p-6 sm:p-8 shadow-2xl"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white font-headline">
              {esEdicion ? "Editar perfil" : "Nuevo perfil"}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {esEdicion
                ? "Modificá los datos del perfil académico."
                : "Al crear se genera una contraseña inicial para entregarle a la persona."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-on-surface-variant hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Nombre */}
        <label className="flex flex-col gap-1 mb-4">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">
            Nombre y apellido
          </span>
          <input
            type="text"
            value={datos.nombre}
            onChange={(e) => cambiarNombre(e.target.value)}
            placeholder="Ej: Julieta Rossi"
            className={CAMPO}
          />
        </label>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Rol */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">Rol</span>
            <Selector
              value={datos.rol}
              onChange={(e) => {
                actualizar("rol", e.target.value as Rol);
                // Un perfil diseñado pertenece a un rol: al cambiar el rol, vuelve al predeterminado.
                actualizar("perfilClave", "");
                // Los cursos también dependen del rol (un estudiante va en uno solo).
                setSeleccion({});
              }}
              className={CAMPO}
            >
              {ROLES.map((rol) => (
                <option key={rol} value={rol}>
                  {META_ROL[rol].label}
                </option>
              ))}
            </Selector>
          </label>

          {/* Estado */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">Estado</span>
            <Selector
              value={datos.estado}
              onChange={(e) => actualizar("estado", e.target.value as "activo" | "inactivo")}
              className={CAMPO}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </Selector>
          </label>
        </div>

        {disenados.length > 0 && (
          <label className="flex flex-col gap-1 mb-4">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">Perfil en NEXO</span>
            <Selector
              value={datos.perfilClave}
              onChange={(e) => actualizar("perfilClave", e.target.value)}
              className={CAMPO}
            >
              <option value="">{META_ROL[datos.rol].label} (predeterminado)</option>
              {disenados.map((p) => (
                <option key={p.clave} value={p.clave}>{p.nombre}</option>
              ))}
            </Selector>
            <span className="text-[11px] text-on-surface-variant/60">
              Perfiles diseñados por el Maestro para tu escuela: cambian qué módulos y funciones ve la persona.
            </span>
          </label>
        )}

        {/* Correo — la cuenta con la que entra */}
        <div className="flex flex-col gap-1 mb-4">
          <label htmlFor="perfil-correo" className="text-xs text-on-surface-variant uppercase tracking-wider">
            Correo (cuenta de acceso)
          </label>
          {conTerminacion ? (
            <div className="flex items-stretch rounded-lg border border-outline-variant/40 bg-surface-container focus-within:border-primary overflow-hidden">
              <input
                id="perfil-correo"
                type="text"
                inputMode="email"
                autoComplete="off"
                value={usuarioCorreo}
                onChange={(e) => {
                  setUsuarioCorreo(e.target.value.replace(/\s/g, "").replace(/@.*$/, ""));
                  setCorreoTocado(true);
                  setError("");
                }}
                placeholder="nombre.apellido"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-white placeholder:text-on-surface-variant/50 outline-none"
              />
              <span className="flex items-center px-3 bg-white/5 text-slate-300 text-sm font-mono border-l border-outline-variant/40 select-none">
                @{dominio}
              </span>
            </div>
          ) : (
            <input
              id="perfil-correo"
              type="email"
              value={datos.email}
              onChange={(e) => actualizar("email", e.target.value)}
              placeholder={dominio ? `nombre@${dominio}` : "nombre@colegio.edu.ar"}
              className={CAMPO}
            />
          )}
          <span className="text-[11px] text-on-surface-variant/60">
            Es el usuario con el que la persona entra a NEXO.{" "}
            {dominio && (
              <button
                type="button"
                onClick={() => {
                  // Al pasar de un modo al otro, el correo escrito viaja con el cambio.
                  if (conTerminacion) {
                    actualizar("email", usuarioCorreo ? `${usuarioCorreo}@${dominio}` : "");
                    setCorreoLibre(true);
                  } else {
                    setUsuarioCorreo(datos.email.split("@")[0]);
                    setCorreoLibre(false);
                  }
                  setCorreoTocado(true);
                }}
                className="text-primary hover:underline"
              >
                {conTerminacion ? "Usar otro correo" : `Usar @${dominio}`}
              </button>
            )}
          </span>
        </div>

        {/* Cursos (alta, opcional) */}
        {llevaCursos && (
          <SeccionCursos
            rol={datos.rol}
            opciones={opciones}
            cargando={cargandoOpciones}
            seleccion={seleccion}
            ultimaMateria={ultimaMateria}
            onCambiar={(nueva, materiaElegida) => {
              setSeleccion(nueva);
              if (materiaElegida) setUltimaMateria(materiaElegida);
              setError("");
            }}
          />
        )}

        {(datos.rol === "familia" || (esEdicion && ROLES_CON_CURSOS.includes(datos.rol))) && (
          <p className="text-[11px] text-on-surface-variant/60 -mt-2 mb-4">
            {datos.rol === "familia"
              ? "Guardá el perfil para vincular sus estudiantes a cargo."
              : `El ${meta.labelAsignacion.toLowerCase()} se cambia desde Cursos y materias.`}
          </p>
        )}

        {perfilEnEdicion?.rol === "familia" && perfilEnEdicion.estado === "activo" && <VinculosFamilia familiaId={perfilEnEdicion.id} />}
        {error && <p role="alert" className="text-error text-sm mb-2">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 py-3 rounded-xl border border-primary/20 text-primary font-medium hover:bg-primary/5 transition-colors active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 bg-acento hover:bg-acento/90 text-white py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-60"
          >
            {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear perfil"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── CURSOS DEL ALTA ────────────────────────────────────────────────────────

const TITULO_CURSOS: Partial<Record<Rol, string>> = {
  estudiante: "Curso",
  preceptor: "Cursos a cargo",
  profesor: "Cursos y materias que da",
};

function SeccionCursos({
  rol,
  opciones,
  cargando,
  seleccion,
  ultimaMateria,
  onCambiar,
}: {
  rol: Rol;
  opciones: OpcionesAlta | null;
  cargando: boolean;
  seleccion: Record<string, string>;
  ultimaMateria: string;
  onCambiar: (seleccion: Record<string, string>, materiaElegida?: string) => void;
}) {
  const cursos = opciones?.cursos ?? [];
  const materias = opciones?.materias ?? [];

  let contenido: React.ReactNode;
  if (cargando && !opciones) {
    contenido = <p className="text-sm text-slate-400">Cargando los cursos de la escuela…</p>;
  } else if (cursos.length === 0) {
    contenido = (
      <p className="text-sm text-slate-400">
        Todavía no hay cursos cargados en la escuela. Podés crear el perfil igual y asignarle
        el curso más adelante, desde Cursos y materias.
      </p>
    );
  } else if (rol === "profesor" && materias.length === 0) {
    contenido = (
      <p className="text-sm text-slate-400">
        Todavía no hay materias cargadas en la escuela, y un profesor se asigna a un curso por la
        materia que da. Podés crear el perfil igual y asignarle sus cursos desde Cursos y materias.
      </p>
    );
  } else if (rol === "estudiante") {
    const elegido = Object.keys(seleccion)[0] ?? "";
    contenido = (
      <Selector
        value={elegido}
        onChange={(e) => onCambiar(e.target.value ? { [e.target.value]: "" } : {})}
        className={`${CAMPO} w-full`}
        aria-label="Curso del estudiante"
      >
        <option value="">Sin curso por ahora</option>
        {agruparCursos(cursos).flatMap((g) => g.secciones.map((sec) => (
          <optgroup key={g.clave + sec.clave} label={`${g.titulo} · ${sec.titulo}`}>
            {sec.cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </optgroup>
        )))}
      </Selector>
    );
  } else {
    const fila = (c: (typeof cursos)[number]) => {
          const marcado = Object.hasOwn(seleccion, c.id);
          const materiaId = seleccion[c.id] ?? "";
          // Quién tiene hoy ese lugar: un curso tiene un solo preceptor, y cada
          // materia de un curso, un solo profesor.
          const ocupante =
            rol === "preceptor"
              ? c.preceptor
              : opciones?.catedras.find((k) => k.cursoId === c.id && k.materiaId === materiaId)?.profesor ?? null;
          return (
            <li
              key={c.id}
              className={`rounded-lg px-3 py-2 transition-colors ${marcado ? "bg-primary/15" : "bg-white/[0.04]"}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer min-w-22">
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => {
                      const nueva = { ...seleccion };
                      if (marcado) delete nueva[c.id];
                      else nueva[c.id] = rol === "profesor" ? ultimaMateria : "";
                      onCambiar(nueva);
                    }}
                    className="w-4 h-4 accent-acento"
                  />
                  <span className="text-white font-semibold">{c.nombre}</span>
                </label>
                {rol === "profesor" && marcado && (
                  <Selector
                    value={materiaId}
                    onChange={(e) => onCambiar({ ...seleccion, [c.id]: e.target.value }, e.target.value)}
                    className={`${CAMPO} flex-1 min-w-0 py-1.5 text-sm`}
                    aria-label={`Materia que da en ${c.nombre}`}
                  >
                    <option value="">Elegí la materia…</option>
                    {materias.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </Selector>
                )}
                {rol === "preceptor" && !marcado && c.preceptor && (
                  <span className="text-xs text-slate-500">Hoy: {c.preceptor}</span>
                )}
              </div>
              {marcado && ocupante && (
                <p className="text-xs text-amber-300 mt-1.5">
                  {rol === "preceptor"
                    ? `Hoy el preceptor de ${c.nombre} es ${ocupante}: pasa a ser esta persona.`
                    : `Hoy esa materia en ${c.nombre} la da ${ocupante}: pasa a darla esta persona.`}
                </p>
              )}
            </li>
          );
    };
    contenido = (
      <div className="flex flex-col gap-4">
        {agruparCursos(cursos).flatMap((g) => g.secciones.map((sec) => (
          <div key={g.clave + sec.clave}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70">{g.titulo} · {sec.titulo}</p>
            <ul className="flex flex-col gap-2">{sec.cursos.map(fila)}</ul>
          </div>
        )))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
      <span className="text-xs text-on-surface-variant uppercase tracking-wider">
        {TITULO_CURSOS[rol]} <span className="normal-case tracking-normal text-on-surface-variant/60">(opcional)</span>
      </span>
      {contenido}
    </div>
  );
}
