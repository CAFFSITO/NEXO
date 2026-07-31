// src/paginas/GestionInstitucionesPage.tsx
// VISTA: Instituciones — acceso Administrador de PLATAFORMA (ruta /admin/instituciones).
// Lo que SÍ le corresponde a "nosotros" (sección 5.A.7): dar de alta escuelas con
// su cuenta y contraseña, y ver la lista con sus totales. NO administra cursos,
// materias ni perfiles de una escuela: eso lo hace cada dirección en su panel
// (Errores 5.A.7, 6.C.1). Antes esta pantalla abría justo esa gestión interna,
// que es la mezcla de roles que la Etapa 3 desarma.

import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import {
  usarPlataforma,
  usarPlantillas,
  crearInstitucion,
  crearPlantilla,
  aplicarPlantilla,
  type InstitucionPlataforma,
  type PlantillaPlataforma,
  type ItemPlantilla,
  type TipoItemPlantilla,
  type ResultadoAplicar,
} from "../servicios/plataforma";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";

export default function GestionInstitucionesPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { datos, cargando, error, recargar } = usarPlataforma();
  const { plantillas, recargar: recargarPlantillas } = usarPlantillas();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalPlantilla, setModalPlantilla] = useState(false);
  const [aplicarEn, setAplicarEn] = useState<InstitucionPlataforma | null>(null);
  const [credenciales, setCredenciales] = useState<{ email: string; contrasena: string } | null>(null);

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-background">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <header className="flex justify-between items-center px-10 h-16 sticky top-0 bg-[#1C1030]/80 backdrop-blur-md border-b border-fuchsia-900/10 z-40">
          <h1 className="text-fuchsia-500 font-headline font-bold">Instituciones</h1>
          <span className="text-xs text-slate-400">Administración de Plataforma · NEXO</span>
        </header>

        <section className="flex-1 px-10 pt-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-headline font-extrabold text-white leading-tight">
                  Instituciones de la plataforma
                </h2>
                <p className="text-slate-400 font-medium">
                  Alta de escuelas con su cuenta de dirección. La gestión interna la hace cada
                  colegio.
                </p>
              </div>
              <button
                onClick={() => {
                  setCredenciales(null);
                  setModalAbierto(true);
                }}
                className="flex items-center gap-2 bg-[#C548F5] hover:opacity-90 active:scale-95 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-[#C548F5]/20 transition-all self-start"
              >
                <span className="material-symbols-outlined text-xl">add_business</span>
                <span>Nueva institución</span>
              </button>
            </div>

            {credenciales && (
              <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
                <p className="text-green-300 font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">key</span>
                  Credenciales de la dirección
                </p>
                <p className="text-slate-300 text-sm mt-2">
                  Correo: <span className="font-mono text-white">{credenciales.email}</span>
                </p>
                <p className="text-slate-300 text-sm">
                  Contraseña inicial:{" "}
                  <span className="font-mono text-white">{credenciales.contrasena}</span>
                </p>
                <p className="text-slate-400 text-xs mt-2">
                  Entregáselas a la dirección de la nueva escuela. No se van a poder volver a ver.
                </p>
              </div>
            )}

            {cargando && <Cargando que="las instituciones" />}
            {error && <Fallo error={error} onReintentar={recargar} />}

            {!cargando && !error && datos && (
              datos.instituciones.length === 0 ? (
                <Vacio icono="domain_disabled" mensaje="Todavía no hay instituciones dadas de alta." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {datos.instituciones.map((i) => (
                    <TarjetaInstitucion
                      key={i.id}
                      institucion={i}
                      hayPlantillas={(plantillas?.length ?? 0) > 0}
                      onAplicar={() => setAplicarEn(i)}
                    />
                  ))}
                </div>
              )
            )}

            {/* ── Plantillas de estructura ─────────────────────────────────── */}
            <div className="mt-14">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-headline font-extrabold text-white leading-tight">
                    Plantillas de estructura
                  </h2>
                  <p className="text-slate-400 font-medium text-sm">
                    Un conjunto base de materias y competencias para aplicar al configurar una
                    escuela. Es estructura, no datos del colegio.
                  </p>
                </div>
                <button
                  onClick={() => setModalPlantilla(true)}
                  className="flex items-center gap-2 border border-[#C548F5]/40 text-[#C548F5] hover:bg-[#C548F5]/10 px-5 py-2.5 rounded-full font-bold transition-all self-start"
                >
                  <span className="material-symbols-outlined text-xl">dashboard_customize</span>
                  <span>Nueva plantilla</span>
                </button>
              </div>

              {!plantillas ? (
                <Cargando que="las plantillas" />
              ) : plantillas.length === 0 ? (
                <Vacio icono="dashboard_customize" mensaje="Todavía no creaste ninguna plantilla." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plantillas.map((p) => (
                    <TarjetaPlantilla key={p.id} plantilla={p} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {modalAbierto && (
        <ModalNuevaInstitucion
          onCerrar={() => setModalAbierto(false)}
          onCreada={(cred) => {
            setCredenciales(cred);
            setModalAbierto(false);
            recargar();
          }}
        />
      )}

      {modalPlantilla && (
        <ModalNuevaPlantilla
          onCerrar={() => setModalPlantilla(false)}
          onCreada={() => {
            setModalPlantilla(false);
            recargarPlantillas();
          }}
        />
      )}

      {aplicarEn && (
        <ModalAplicarPlantilla
          institucion={aplicarEn}
          plantillas={plantillas ?? []}
          onCerrar={() => setAplicarEn(null)}
          onAplicada={recargar}
        />
      )}
    </div>
  );
}

// ─── Tarjeta de una plantilla ───────────────────────────
function TarjetaPlantilla({ plantilla }: { plantilla: PlantillaPlataforma }) {
  return (
    <div className="bg-[#2D1B4E] p-5 rounded-[20px] border border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-fuchsia-400">dashboard_customize</span>
        <p className="text-white font-bold font-headline">{plantilla.nombre}</p>
      </div>
      <div className="space-y-2 text-sm">
        <PlantillaLista etiqueta="Materias" items={plantilla.materias} />
        <PlantillaLista etiqueta="Competencias" items={plantilla.competencias} />
      </div>
    </div>
  );
}

function PlantillaLista({ etiqueta, items }: { etiqueta: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
        {etiqueta} ({items.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((n, i) => (
          <span key={i} className="text-xs bg-black/20 text-slate-200 rounded-full px-2.5 py-0.5">
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

function TarjetaInstitucion({
  institucion,
  hayPlantillas,
  onAplicar,
}: {
  institucion: InstitucionPlataforma;
  hayPlantillas: boolean;
  onAplicar: () => void;
}) {
  return (
    <div className="bg-[#2D1B4E] p-6 rounded-[20px] border border-white/5 shadow-xl shadow-black/20 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-fuchsia-400">domain</span>
        <div>
          <p className="text-white font-bold font-headline">{institucion.nombre}</p>
          <p className="text-slate-400 text-xs">Ciclo {institucion.cicloLectivo}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Dato valor={institucion.estudiantes} etiqueta="Alumnos" />
        <Dato valor={institucion.docentes} etiqueta="Docentes" />
        <Dato valor={institucion.cursos} etiqueta="Cursos" />
      </div>
      <button
        onClick={onAplicar}
        disabled={!hayPlantillas}
        title={hayPlantillas ? "Aplicar una plantilla de estructura" : "Primero creá una plantilla"}
        className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-[#C548F5] border border-[#C548F5]/30 rounded-full py-2 hover:bg-[#C548F5]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <span className="material-symbols-outlined text-lg">library_add</span>
        Aplicar plantilla
      </button>
    </div>
  );
}

function Dato({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="bg-black/20 rounded-lg py-2">
      <p className="text-xl font-bold text-white">{valor}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{etiqueta}</p>
    </div>
  );
}

// ─── Modal de alta ──────────────────────────────────────
function ModalNuevaInstitucion({
  onCerrar,
  onCreada,
}: {
  onCerrar: () => void;
  onCreada: (cred: { email: string; contrasena: string }) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [ciclo, setCiclo] = useState(String(new Date().getFullYear()));
  const [dirNombre, setDirNombre] = useState("");
  const [dirEmail, setDirEmail] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    const r = await crearInstitucion({
      nombre: nombre.trim(),
      cicloLectivo: Number(ciclo),
      direccionNombre: dirNombre.trim(),
      direccionEmail: dirEmail.trim().toLowerCase(),
    });
    setGuardando(false);
    if (!r.ok) {
      setError(r.error ?? "No se pudo crear la institución.");
      return;
    }
    if (r.direccionEmail && r.contrasenaInicial) {
      onCreada({ email: r.direccionEmail, contrasena: r.contrasenaInicial });
    } else {
      onCerrar();
    }
  };

  const inputCls =
    "bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white placeholder:text-on-surface-variant/50 focus:border-primary outline-none";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={enviar}
        className="w-full max-w-lg bg-[#2D1B4E] border border-surface-variant rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white font-headline">Nueva institución</h3>
            <p className="text-slate-400 text-sm mt-1">
              Se crea la escuela y su primera cuenta de dirección.
            </p>
          </div>
          <button type="button" onClick={onCerrar} className="text-on-surface-variant hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">Nombre de la institución</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Colegio Belgrano" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">Ciclo lectivo</span>
            <input type="number" value={ciclo} onChange={(e) => setCiclo(e.target.value)} className={inputCls} />
          </label>
        </div>

        <p className="text-xs text-fuchsia-300 uppercase tracking-wider mb-2">Cuenta de la dirección</p>
        <label className="flex flex-col gap-1 mb-4">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">Nombre y apellido</span>
          <input value={dirNombre} onChange={(e) => setDirNombre(e.target.value)} placeholder="Ej: Directora Ana Romero" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 mb-2">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">Correo de acceso</span>
          <input type="email" value={dirEmail} onChange={(e) => setDirEmail(e.target.value)} placeholder="direccion@colegio.edu.ar" className={inputCls} />
        </label>

        {error && <p className="text-error text-sm mb-2">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCerrar} className="flex-1 py-3 rounded-xl border border-primary/20 text-primary font-medium hover:bg-primary/5 transition-colors active:scale-95">
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="flex-1 bg-[#C548F5] hover:bg-[#C548F5]/90 text-white py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-60">
            {guardando ? "Creando…" : "Crear institución"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Modal: crear una plantilla ─────────────────────────
const inputPlantilla =
  "bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white placeholder:text-on-surface-variant/50 focus:border-primary outline-none";

function ModalNuevaPlantilla({
  onCerrar,
  onCreada,
}: {
  onCerrar: () => void;
  onCreada: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [items, setItems] = useState<ItemPlantilla[]>([{ tipo: "materia", nombre: "" }]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cambiar = (i: number, campo: keyof ItemPlantilla, valor: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)));
  const agregar = (tipo: TipoItemPlantilla) => setItems((prev) => [...prev, { tipo, nombre: "" }]);
  const quitar = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const limpios = items
      .map((it) => ({ tipo: it.tipo, nombre: it.nombre.trim() }))
      .filter((it) => it.nombre);
    if (!nombre.trim()) return setError("La plantilla necesita un nombre.");
    if (limpios.length === 0) return setError("Agregá al menos una materia o competencia.");
    setGuardando(true);
    try {
      await crearPlantilla(nombre.trim(), limpios);
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la plantilla.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onCerrar}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={enviar}
        className="w-full max-w-lg bg-[#2D1B4E] border border-surface-variant rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white font-headline">Nueva plantilla</h3>
            <p className="text-slate-400 text-sm mt-1">
              Materias y competencias base para aplicar a una escuela.
            </p>
          </div>
          <button type="button" onClick={onCerrar} className="text-on-surface-variant hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <label className="flex flex-col gap-1 mb-5">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">Nombre de la plantilla</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Secundaria orientada" className={inputPlantilla} />
        </label>

        <div className="space-y-2 mb-4">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select value={it.tipo} onChange={(e) => cambiar(i, "tipo", e.target.value)} className={`${inputPlantilla} w-36`}>
                <option value="materia">Materia</option>
                <option value="competencia">Competencia</option>
              </select>
              <input
                value={it.nombre}
                onChange={(e) => cambiar(i, "nombre", e.target.value)}
                placeholder={it.tipo === "materia" ? "Ej: Matemática" : "Ej: Pensamiento crítico"}
                className={`${inputPlantilla} flex-1`}
              />
              <button
                type="button"
                onClick={() => quitar(i)}
                disabled={items.length === 1}
                className="text-on-surface-variant hover:text-red-400 disabled:opacity-30 p-1"
                title="Quitar"
              >
                <span className="material-symbols-outlined">remove_circle_outline</span>
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => agregar("materia")} className="text-xs font-bold text-[#C548F5] hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-base">add</span> Materia
          </button>
          <button type="button" onClick={() => agregar("competencia")} className="text-xs font-bold text-[#C548F5] hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-base">add</span> Competencia
          </button>
        </div>

        {error && <p className="text-error text-sm mb-2">{error}</p>}

        <div className="flex gap-3 mt-4">
          <button type="button" onClick={onCerrar} className="flex-1 py-3 rounded-xl border border-primary/20 text-primary font-medium hover:bg-primary/5 transition-colors active:scale-95">
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="flex-1 bg-[#C548F5] hover:bg-[#C548F5]/90 text-white py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-60">
            {guardando ? "Creando…" : "Crear plantilla"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Modal: aplicar una plantilla a una institución ─────
function ModalAplicarPlantilla({
  institucion,
  plantillas,
  onCerrar,
  onAplicada,
}: {
  institucion: InstitucionPlataforma;
  plantillas: PlantillaPlataforma[];
  onCerrar: () => void;
  onAplicada: () => void;
}) {
  const [elegida, setElegida] = useState<string>(plantillas[0]?.id ?? "");
  const [resultado, setResultado] = useState<ResultadoAplicar | null>(null);
  const [error, setError] = useState("");
  const [aplicando, setAplicando] = useState(false);

  const aplicar = async () => {
    if (!elegida) return;
    setError("");
    setAplicando(true);
    try {
      const r = await aplicarPlantilla(institucion.id, elegida);
      setResultado(r);
      onAplicada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aplicar la plantilla.");
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[#2D1B4E] border border-surface-variant rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white font-headline">Aplicar plantilla</h3>
            <p className="text-slate-400 text-sm mt-1">a {institucion.nombre}</p>
          </div>
          <button onClick={onCerrar} className="text-on-surface-variant hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {resultado ? (
          <>
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-slate-200 space-y-1">
              <p className="text-green-300 font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Estructura aplicada
              </p>
              <p>Materias: {resultado.creado.materias} creadas · {resultado.omitido.materias} ya existían.</p>
              <p>Competencias: {resultado.creado.competencias} creadas · {resultado.omitido.competencias} ya existían.</p>
            </div>
            <button onClick={onCerrar} className="w-full mt-5 bg-[#C548F5] text-white py-3 rounded-xl font-bold hover:bg-[#C548F5]/90 transition-all">
              Listo
            </button>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1 mb-4">
              <span className="text-xs text-on-surface-variant uppercase tracking-wider">Plantilla</span>
              <select value={elegida} onChange={(e) => setElegida(e.target.value)} className={inputPlantilla}>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.materias.length} materias · {p.competencias.length} competencias)
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-slate-400 mb-4">
              Inserta la estructura que falte. Las materias/competencias que ya existan se saltean.
            </p>
            {error && <p className="text-error text-sm mb-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onCerrar} className="flex-1 py-3 rounded-xl border border-primary/20 text-primary font-medium hover:bg-primary/5 transition-colors">
                Cancelar
              </button>
              <button onClick={aplicar} disabled={aplicando || !elegida} className="flex-1 bg-[#C548F5] text-white py-3 rounded-xl font-bold hover:bg-[#C548F5]/90 transition-all disabled:opacity-60">
                {aplicando ? "Aplicando…" : "Aplicar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
