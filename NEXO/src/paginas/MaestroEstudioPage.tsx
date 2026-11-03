// src/paginas/MaestroEstudioPage.tsx
// VISTA: Estudio del Maestro — perfil Maestro (el administrador de plataforma).
//   /maestro            → el universo de instancias
//   /maestro/forja      → la Forja: crear una instancia (con intro e ignición)
//   /maestro/instancia  → el estudio de una instancia existente (?id=)
// Las tres son la misma pantalla (una sola entrada en el mapa de permisos); la
// vista se elige por la dirección.

import { useLocation } from "react-router-dom";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import { useCatalogo, useDetalleInstancia, type Catalogo } from "../servicios/maestro";
import { Fallo } from "./components/shared/EstadoCarga";
import Universo from "./components/maestro/Universo";
import Forja from "./components/maestro/Forja";
import CampoEstelar from "./components/maestro/CampoEstelar";
import AppsPublicasMaestro from "./components/maestro/AppsPublicasMaestro";
import "./components/maestro/maestro.css";

export default function MaestroEstudioPage() {
  const { usuario, navegar, cerrarSesion, rutaActiva } = useNavegacion();
  const location = useLocation();
  const { datos: catalogo, error, recargar } = useCatalogo();
  const id = new URLSearchParams(location.search).get("id");

  if (!usuario) return null;

  if (rutaActiva === "/maestro/forja" || rutaActiva === "/maestro/instancia") {
    if (error) return <PantallaCompleta><Fallo error={error} onReintentar={recargar} /></PantallaCompleta>;
    if (!catalogo) return <Despegando texto="Encendiendo la Forja" />;
    if (rutaActiva === "/maestro/forja") {
      return (
        <Forja
          catalogo={catalogo}
          modo="crear"
          onSalir={() => navegar("/maestro")}
          onAbrirInstancia={(nuevo) => navegar(`/maestro/instancia?id=${encodeURIComponent(nuevo)}`)}
        />
      );
    }
    return id ? <EstudioDeInstancia key={id} id={id} catalogo={catalogo} /> : <PantallaCompleta><Fallo error="Falta indicar qué instancia abrir." /></PantallaCompleta>;
  }

  return (
    <div className="flex min-h-screen maestro maestro-fondo">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main id="contenido-principal" tabIndex={-1} className="app-content min-h-screen">
        <Universo catalogo={catalogo} onForjar={() => navegar("/maestro/forja")} onAbrir={(i) => navegar(`/maestro/instancia?id=${encodeURIComponent(i)}`)} />
        <div className="mx-auto max-w-6xl px-4 pb-12"><AppsPublicasMaestro /></div>
      </main>
    </div>
  );
}

function EstudioDeInstancia({ id, catalogo }: { id: string; catalogo: Catalogo }) {
  const { navegar } = useNavegacion();
  // El detalle se pide una vez para arrancar; después la Forja maneja su
  // borrador y lo vuelve a pedir (historial, actividad) al guardar o restaurar.
  const { datos, error, recargar } = useDetalleInstancia(id);

  if (error && !datos) return <PantallaCompleta><Fallo error={error} onReintentar={recargar} /></PantallaCompleta>;
  if (!datos) return <Despegando texto="Abriendo el genoma" />;
  return (
    <Forja
      catalogo={catalogo}
      modo="editar"
      detalle={datos}
      onRecargar={recargar}
      onSalir={() => navegar("/maestro")}
      onAbrirInstancia={(otra) => navegar(`/maestro/instancia?id=${encodeURIComponent(otra)}`)}
    />
  );
}

function PantallaCompleta({ children }: { children: React.ReactNode }) {
  return <div className="maestro maestro-fondo min-h-dvh grid place-items-center p-6"><div className="w-full max-w-lg">{children}</div></div>;
}

function Despegando({ texto }: { texto: string }) {
  return (
    <div className="maestro maestro-fondo fixed inset-0 grid place-items-center" role="status">
      <CampoEstelar velocidad={6} densidad={420} className="absolute inset-0 w-full h-full" />
      <p className="relative text-sm uppercase tracking-[0.4em] text-white/70">{texto}…</p>
    </div>
  );
}
