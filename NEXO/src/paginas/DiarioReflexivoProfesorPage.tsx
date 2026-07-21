// src/paginas/DiarioReflexivoProfesorPage.tsx
// VISTA: Diario Reflexivo (Portafolio Docente).
// El diario es un espacio de registro y reflexión sobre la práctica docente.
//
// Antes vivía SOLO en la memoria de la pantalla: crear un registro y recargar
// lo borraba, y editar/borrar no hacían nada (Errores 3.C.3 y 3.C.6). Ahora
// todo va a la base a través de `/api/diario` (ver servicios/diario.ts): los
// registros sobreviven a la recarga, se editan y se borran, y son de quien los
// escribió (el servidor no muestra ni deja tocar el diario de otro profesor).

import { useMemo, useRef, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import { usarCatedras } from "../servicios/aula";
import {
  usarDiario,
  crearRegistro,
  editarRegistro,
  eliminarRegistro,
  type RegistroDiario,
  type CuerpoRegistro,
} from "../servicios/diario";
import FormularioNuevoRegistro, {
  type NuevoRegistro,
} from "./components/portafolio-docente/FormularioNuevoRegistro";
import TarjetaRegistro, {
  type Registro,
} from "./components/portafolio-docente/TarjetaRegistro";

// ── Traducción entre lo que guarda la cocina y lo que muestra la tarjeta ──────
// La base guarda un registro como tres campos (titulo, contenido, etiquetas).
// La pantalla, en cambio, lo piensa con más piezas (fecha de la sesión, resumen,
// "¿qué funcionó?" y "¿qué mejorar?"). Para no cambiar el esquema, esas piezas
// viajan serializadas dentro de `contenido`; `etiquetas` lleva la materia/curso.

interface CuerpoDiario {
  fecha?: string;
  resumen: string;
  queFunciono: string;
  queMejorar: string;
}

/**
 * Desarma el `contenido` guardado. Si es el JSON que escribe esta pantalla, lo
 * usa; si es texto plano (por ejemplo un registro sembrado en la base), lo trata
 * como el resumen. Así lo viejo y lo nuevo se ven bien, sin inventar nada.
 */
function desglosar(contenido: string): CuerpoDiario {
  try {
    const o = JSON.parse(contenido);
    if (o && typeof o === "object" && typeof o.resumen === "string") {
      return {
        fecha: typeof o.fecha === "string" ? o.fecha : undefined,
        resumen: o.resumen,
        queFunciono:
          typeof o.queFunciono === "string" && o.queFunciono ? o.queFunciono : "Sin registrar.",
        queMejorar:
          typeof o.queMejorar === "string" && o.queMejorar ? o.queMejorar : "Sin registrar.",
      };
    }
  } catch {
    // No era JSON: es un registro de texto plano. Cae al retorno de abajo.
  }
  return { resumen: contenido, queFunciono: "Sin registrar.", queMejorar: "Sin registrar." };
}

/** Registro de la base → la forma que dibuja `TarjetaRegistro`. */
function aRegistro(r: RegistroDiario): Registro {
  const c = desglosar(r.contenido);
  return {
    id: r.id,
    titulo: r.titulo,
    // La fecha de la sesión, o —para lo viejo/plano— el día en que se creó.
    fecha: c.fecha ?? r.creadoEn.slice(0, 10),
    materiaCurso: r.etiquetas,
    resumen: c.resumen,
    queFunciono: c.queFunciono,
    queMejorar: c.queMejorar,
  };
}

/** Lo que produce el formulario → los tres campos que guarda la cocina. */
function aCuerpo(n: NuevoRegistro): CuerpoRegistro {
  return {
    titulo: n.titulo,
    contenido: JSON.stringify({
      fecha: n.fecha,
      resumen: n.resumen,
      queFunciono: n.queFunciono,
      queMejorar: n.queMejorar,
    }),
    etiquetas: n.materiaCurso,
  };
}

export default function DiarioReflexivoProfesorPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();

  // Las materias del selector son las cátedras reales del docente logueado.
  const { catedras } = usarCatedras();
  const materiasCurso = useMemo(
    () => (catedras ?? []).map((c) => c.etiqueta),
    [catedras]
  );

  // Los registros salen de la base: lo que se ve es lo que el docente escribió.
  const { datos, cargando, error, recargar } = usarDiario();
  const registros = useMemo(
    () => (datos?.registros ?? []).map(aRegistro),
    [datos]
  );

  const [busqueda, setBusqueda] = useState<string>("");
  // Qué registro se está editando (su id), y un contador para remontar el
  // formulario limpio tras cada creación exitosa. Al remontarlo (con `key`), el
  // formulario vuelve a leer su estado inicial: crear deja el form vacío, editar
  // lo prellena, y un guardado fallido conserva lo escrito (no remontamos).
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [remonte, setRemonte] = useState(0);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  // Registros ordenados por fecha descendente + filtrados por búsqueda
  const registrosVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return registros
      .filter(
        (r) =>
          !q ||
          r.titulo.toLowerCase().includes(q) ||
          r.resumen.toLowerCase().includes(q) ||
          r.materiaCurso.toLowerCase().includes(q)
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [registros, busqueda]);

  // Valores con que arranca el formulario cuando se está editando.
  const valorInicial = useMemo<NuevoRegistro | null>(() => {
    if (!editandoId) return null;
    const r = registros.find((x) => x.id === editandoId);
    if (!r) return null;
    return {
      titulo: r.titulo,
      fecha: r.fecha,
      materiaCurso: r.materiaCurso,
      resumen: r.resumen,
      queFunciono: r.queFunciono,
      queMejorar: r.queMejorar,
    };
  }, [editandoId, registros]);

  const handleGuardar = async (nuevo: NuevoRegistro) => {
    setErrorGuardado(null);
    try {
      const cuerpo = aCuerpo(nuevo);
      if (editandoId) {
        await editarRegistro(editandoId, cuerpo);
        setEditandoId(null); // vuelve a modo "nuevo": el form se remonta limpio
      } else {
        await crearRegistro(cuerpo);
        setRemonte((n) => n + 1); // remonta el form vacío tras crear
      }
      recargar();
    } catch (e) {
      setErrorGuardado(e instanceof Error ? e.message : "No se pudo guardar el registro.");
    }
  };

  const handleEditar = (id: string) => {
    setErrorGuardado(null);
    setEditandoId(id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCancelarEdicion = () => {
    setEditandoId(null);
    setErrorGuardado(null);
  };

  const handleEliminar = async (id: string) => {
    if (!window.confirm("¿Borrar este registro del diario? No se puede deshacer.")) return;
    setErrorGuardado(null);
    try {
      await eliminarRegistro(id);
      if (editandoId === id) setEditandoId(null);
      recargar();
    } catch (e) {
      setErrorGuardado(e instanceof Error ? e.message : "No se pudo borrar el registro.");
    }
  };

  // El registro más reciente se destaca visualmente
  const idDestacado = registrosVisibles[0]?.id;

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface overflow-x-hidden">
      <Sidebar
        usuario={usuario}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        {/* Top nav del portafolio docente */}
        <header className="flex justify-between items-center w-full px-8 py-4 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] sticky top-0 z-40">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-black text-white font-headline">Portafolio Docente</h1>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => handleNavegar("/portafolio-docente")} className="text-slate-400 pb-2 hover:text-[#C548F5] transition-all font-label">
                Dashboard
              </button>
              <button onClick={() => handleNavegar("/portafolio/gestion")} className="text-slate-400 pb-2 hover:text-[#C548F5] transition-all font-label">
                Gestión de Tareas
              </button>
              <button className="text-[#C548F5] border-b-2 border-[#C548F5] pb-2 font-bold font-label">
                Diario Reflexivo
              </button>
              <button onClick={() => handleNavegar("/portafolio-docente/aula-virtual")} className="text-slate-400 pb-2 hover:text-[#C548F5] transition-all font-label">
                Aula Virtual
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-slate-400 hover:text-[#C548F5] cursor-pointer">
              notifications
            </button>
            <button className="material-symbols-outlined text-slate-400 hover:text-[#C548F5] cursor-pointer">
              settings
            </button>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto w-full">
          {/* Header vista + buscador */}
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h2 className="text-4xl font-extrabold text-white font-headline border-b-4 border-[#C548F5] inline-block pb-1">
              Diario Reflexivo
            </h2>
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                search
              </span>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en el diario..."
                className="w-full bg-[#2D1B4E] border-none rounded-full pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-[#C548F5]"
              />
            </div>
          </header>

          {/* Formulario nuevo registro / edición. La `key` lo remonta al cambiar
              de registro o tras crear, para que arranque con el estado correcto. */}
          <div ref={formRef}>
            <FormularioNuevoRegistro
              key={editandoId ?? `nuevo-${remonte}`}
              materiasCurso={materiasCurso}
              valorInicial={valorInicial}
              onGuardar={handleGuardar}
              onCancelar={handleCancelarEdicion}
            />
          </div>

          {errorGuardado && (
            <p className="mb-6 text-[#EF4444] text-sm font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">error</span>
              {errorGuardado}
            </p>
          )}

          {/* Lista del diario */}
          <div className="space-y-6">
            {cargando ? (
              <div className="text-center py-16 text-slate-400">Cargando el diario…</div>
            ) : error ? (
              <div className="text-center py-16 text-[#EF4444]">
                <span className="material-symbols-outlined text-5xl mb-2 block">error</span>
                {error}
                <div className="mt-4">
                  <button
                    onClick={recargar}
                    className="text-[#C548F5] font-bold hover:underline font-label"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            ) : registrosVisibles.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-2 block">
                  menu_book
                </span>
                {busqueda
                  ? "No hay registros que coincidan con la búsqueda."
                  : "Todavía no hay registros. Creá el primero arriba."}
              </div>
            ) : (
              registrosVisibles.map((registro) => (
                <TarjetaRegistro
                  key={registro.id}
                  registro={registro}
                  destacado={registro.id === idDestacado}
                  onEditar={handleEditar}
                  onEliminar={handleEliminar}
                />
              ))
            )}
          </div>
        </div>

        <footer className="mt-auto py-8 text-center text-slate-500 text-xs tracking-widest uppercase font-label">
          © 2026 Portafolio Docente • Sistema de Reflexión Continua
        </footer>
      </main>
    </div>
  );
}
