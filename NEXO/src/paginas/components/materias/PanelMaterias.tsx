// Las materias de la escuela en tarjetas: nombre, año, profesores que la dan,
// cursos donde ya se dicta y si tiene temario. Tocar una la abre para editarla;
// "Nueva materia" abre el mismo editor vacío.

import { useMemo, useState } from "react";
import { useNavegacion } from "../../../navegacion";
import { useFuncion } from "../../../servicios/instancia";
import { nombreMateria, normalizar, useCatalogoMaterias, type Materia } from "../../../servicios/materias";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import EditorMateria from "./EditorMateria";

type Filtro = "todas" | "sin-profesores" | "sin-cursos";

export default function PanelMaterias() {
  const { datos, cargando, error, recargar } = useCatalogoMaterias();
  const { navegar } = useNavegacion();
  const puedeEditar = useFuncion("cursos.materias");
  const [busqueda, setBusqueda] = useState("");
  const [anio, setAnio] = useState<number | "todos" | "sin-anio">("todos");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  // null = cerrado; "nueva" = crear; si no, el id de la materia que se edita.
  const [abierta, setAbierta] = useState<string | null>(null);
  const [exito, setExito] = useState("");

  const materias = useMemo(() => datos?.materias ?? [], [datos]);
  const anios = useMemo(() => [...new Set(materias.map((m) => m.anio).filter((a): a is number => a != null))].sort((a, b) => a - b), [materias]);
  const hayDeTodosLosAnios = materias.some((m) => m.anio == null);
  const conteo = useMemo(() => ({
    sinProfesores: materias.filter((m) => !m.profesores.some((p) => p.activo)).length,
    sinCursos: materias.filter((m) => m.cursos.length === 0).length,
  }), [materias]);

  const visibles = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
    return materias.filter((m) => {
      if (anio === "sin-anio" && m.anio != null) return false;
      if (typeof anio === "number" && m.anio !== anio) return false;
      if (filtro === "sin-profesores" && m.profesores.some((p) => p.activo)) return false;
      if (filtro === "sin-cursos" && m.cursos.length > 0) return false;
      if (!palabras.length) return true;
      const texto = normalizar([m.nombre, m.area ?? "", ...m.profesores.map((p) => p.nombre)].join(" "));
      return palabras.every((p) => texto.includes(p));
    });
  }, [materias, busqueda, anio, filtro]);

  if (cargando && !datos) return <Cargando que="las materias de la escuela" />;
  if (error) return <Fallo error={error} onReintentar={recargar} />;
  if (!datos) return null;
  // La pantalla nueva con el servidor de antes: se avisa en vez de romperse.
  if (!Array.isArray(datos.profesores)) return <p role="alert" className="rounded-xl bg-amber-500/10 p-5 text-amber-200">Falta reiniciar el servidor de NEXO para usar Materias. Quien administra NEXO tiene que reiniciarlo.</p>;

  const materiaAbierta = abierta && abierta !== "nueva" ? materias.find((m) => m.id === abierta) ?? null : null;
  const alGuardar = (mensaje: string) => { setAbierta(null); setExito(mensaje); recargar(); };
  const alternar = (f: Filtro) => setFiltro((actual) => (actual === f ? "todas" : f));

  return (
    <>
      {exito && (
        <div role="status" className="mb-5 flex items-center justify-between gap-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-emerald-300">
          <span className="flex items-center gap-2 font-semibold"><span className="material-symbols-outlined" aria-hidden="true">check_circle</span>{exito}</span>
          <button type="button" onClick={() => setExito("")} className="text-emerald-200/70 hover:text-white" aria-label="Cerrar el aviso"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h2 className="text-2xl font-semibold text-on-surface">Materias</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Creá cada materia con sus detalles y elegí qué profesores la dan. Después, en <button type="button" className="font-semibold text-primary hover:underline" onClick={() => navegar("/admin/cursos")}>Cursos</button>, buscás la materia o el profesor y la sumás a cada curso.
          </p>
        </div>
        {puedeEditar && <button type="button" onClick={() => { setExito(""); setAbierta("nueva"); }} className="nx-btn nx-btn-primario">
          <span className="material-symbols-outlined" aria-hidden="true">add</span>Nueva materia
        </button>}
      </div>

      {!puedeEditar && <p className="mb-5 rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">En tu escuela, crear y editar materias está apagado (Modo edición). Podés verlas, pero no cambiarlas.</p>}

      {materias.length > 0 && <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <Indicador etiqueta="Materias" valor={materias.length} icono="menu_book" tono="bg-primary/10 text-primary" activo={filtro === "todas"} onClick={() => setFiltro("todas")} />
        <Indicador etiqueta="Sin profesores" valor={conteo.sinProfesores} icono="person_off" tono="bg-amber-500/15 text-amber-300" activo={filtro === "sin-profesores"} onClick={() => alternar("sin-profesores")} />
        <Indicador etiqueta="Todavía en ningún curso" valor={conteo.sinCursos} icono="school" tono="bg-white/5 text-on-surface-variant" activo={filtro === "sin-cursos"} onClick={() => alternar("sin-cursos")} />
      </div>}

      {materias.length > 0 && <div className="mb-5 flex flex-wrap items-center gap-2">
        <label className="relative min-w-55 flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" style={{ fontSize: 19 }} aria-hidden="true">search</span>
          <input className="nx-campo pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar materia, área o profesor" aria-label="Buscar materias" />
        </label>
        {(anios.length > 0) && <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por año">
          {(["todos", ...anios, ...(hayDeTodosLosAnios ? ["sin-anio" as const] : [])] as const).map((a) => (
            <button key={a} type="button" onClick={() => setAnio(a)} aria-pressed={anio === a}
              className={`h-9 rounded-lg px-3 text-sm font-medium transition-colors ${anio === a ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-white/5"}`}>
              {a === "todos" ? "Todas" : a === "sin-anio" ? "De todos los años" : `${a}°`}
            </button>
          ))}
        </div>}
      </div>}

      {materias.length === 0 ? (
        <div className="nx-tarjeta flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 40 }} aria-hidden="true">menu_book</span>
          <p className="text-lg font-medium text-on-surface">Todavía no hay materias</p>
          <p className="max-w-md text-sm text-on-surface-variant">Empezá por crear las materias de la escuela y elegir qué profesores dan cada una.</p>
          {puedeEditar && <button type="button" className="nx-btn nx-btn-primario mt-3" onClick={() => setAbierta("nueva")}><span className="material-symbols-outlined" aria-hidden="true">add</span>Crear la primera materia</button>}
        </div>
      ) : visibles.length === 0 ? (
        <div className="nx-tarjeta flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 36 }} aria-hidden="true">search_off</span>
          <p className="font-medium text-on-surface">Ninguna materia coincide con la búsqueda</p>
          <button type="button" className="nx-btn nx-btn-secundario mt-2" onClick={() => { setBusqueda(""); setAnio("todos"); setFiltro("todas"); }}>Ver todas</button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibles.map((m) => <li key={m.id}><TarjetaMateria materia={m} onAbrir={() => { setExito(""); setAbierta(m.id); }} /></li>)}
        </ul>
      )}

      {abierta && (abierta === "nueva" || materiaAbierta) && <EditorMateria
        key={abierta}
        materia={materiaAbierta}
        catalogo={datos}
        soloLectura={!puedeEditar}
        onCerrar={() => setAbierta(null)}
        onGuardado={alGuardar}
      />}
    </>
  );
}

function Indicador({ etiqueta, valor, icono, tono, activo, onClick }: { etiqueta: string; valor: number; icono: string; tono: string; activo: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      className={`nx-tarjeta flex items-center gap-3 p-3 text-left transition-colors hover:bg-surface-container-high sm:p-3.5 ${activo ? "ring-2 ring-acento" : ""}`}>
      <span className={`material-symbols-outlined hidden h-9 w-9 shrink-0 place-items-center rounded-lg sm:grid ${tono}`} aria-hidden="true">{icono}</span>
      <span className="min-w-0">
        <span className="block text-xl font-semibold leading-tight text-on-surface">{valor}</span>
        <span className="block text-[13px] leading-snug text-on-surface-variant">{etiqueta}</span>
      </span>
    </button>
  );
}

function TarjetaMateria({ materia: m, onAbrir }: { materia: Materia; onAbrir: () => void }) {
  const activos = m.profesores.filter((p) => p.activo);
  const visibles = activos.slice(0, 4);
  return (
    <button type="button" onClick={onAbrir} className="nx-tarjeta flex h-full w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-surface-container-high" aria-label={`Abrir ${nombreMateria(m)}`}>
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-base font-semibold text-on-surface">{m.nombre}</span>
          <span className="mt-0.5 block text-[13px] text-on-surface-variant">
            {[m.anio ? `${m.anio}° año` : "Todos los años", m.area, m.horasSemanales ? `${m.horasSemanales} h por semana` : null].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="material-symbols-outlined shrink-0 text-on-surface-variant" aria-hidden="true">chevron_right</span>
      </span>

      <span className="flex flex-wrap gap-1.5">
        {visibles.map((p) => <span key={p.id} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{p.nombre}</span>)}
        {activos.length > visibles.length && <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">+{activos.length - visibles.length} más</span>}
        {activos.length === 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300"><span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">person_off</span>Sin profesores</span>}
      </span>

      <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-on-surface-variant">
        <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">school</span>{m.cursos.length === 0 ? "En ningún curso" : m.cursos.length === 1 ? `En ${m.cursos[0].curso}` : `En ${m.cursos.length} cursos`}</span>
        <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">format_list_numbered</span>{m.temario.length === 0 ? "Sin temario" : m.temario.length === 1 ? "1 unidad" : `${m.temario.length} unidades`}</span>
      </span>
    </button>
  );
}
