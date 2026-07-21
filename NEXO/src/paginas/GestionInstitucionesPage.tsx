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
  crearInstitucion,
  type InstitucionPlataforma,
} from "../servicios/plataforma";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";

export default function GestionInstitucionesPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { datos, cargando, error, recargar } = usarPlataforma();
  const [modalAbierto, setModalAbierto] = useState(false);
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
                    <TarjetaInstitucion key={i.id} institucion={i} />
                  ))}
                </div>
              )
            )}
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
    </div>
  );
}

function TarjetaInstitucion({ institucion }: { institucion: InstitucionPlataforma }) {
  return (
    <div className="bg-[#2D1B4E] p-6 rounded-[20px] border border-white/5 shadow-xl shadow-black/20">
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
