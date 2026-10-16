// src/paginas/AnunciosPage.tsx
// Anuncios: avisos obligatorios entre la dirección y la preceptoría.
//
// Cada vez que se entra, lo primero es escribir un aviso nuevo (elegir a quién
// va y escribirlo). Además: la casilla de leídos, lo que mandé con quién lo
// leyó y —solo la dirección— los grupos de difusión. Los avisos SIN leer no
// viven acá: aparecen encima de todo, en la capa obligatoria
// (components/anuncios/BandejaObligatoria.tsx), en cualquier pantalla.

import { useSearchParams } from "react-router-dom";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import { useNavegacion } from "../navegacion";
import { useFuncion } from "../servicios/instancia";
import Compositor from "./components/anuncios/Compositor";
import CasillaLeidos from "./components/anuncios/CasillaLeidos";
import ListaEnviados from "./components/anuncios/ListaEnviados";
import GestorGrupos from "./components/anuncios/GestorGrupos";
import EstadoAlertas from "./components/anuncios/EstadoAlertas";
import "./components/anuncios/anuncios.css";

type Vista = "nuevo" | "leidos" | "enviados" | "grupos";

export default function AnunciosPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const [params, setParams] = useSearchParams();
  const puedeEnviar = useFuncion("anuncios.enviar");
  const gestionaGrupos = usuario?.rol === "admin-academico";

  if (!usuario) return null;

  const vistas: { id: Vista; nombre: string; icono: string }[] = [
    ...(puedeEnviar ? [{ id: "nuevo" as const, nombre: "Nuevo aviso", icono: "edit_square" }] : []),
    { id: "leidos", nombre: "Leídos", icono: "inbox" },
    { id: "enviados", nombre: "Enviados", icono: "outgoing_mail" },
    ...(gestionaGrupos ? [{ id: "grupos" as const, nombre: "Grupos", icono: "groups" }] : []),
  ];
  const pedida = params.get("vista") as Vista | null;
  const vista: Vista = vistas.some((v) => v.id === pedida) ? (pedida as Vista) : vistas[0].id;
  const ir = (v: Vista) => setParams(v === vistas[0].id ? {} : { vista: v }, { replace: true });

  return (
    <div className="flex bg-background min-h-screen text-on-background">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen">
        <TopBar title="Anuncios" />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <div>
              <h1 className="text-4xl font-black font-headline text-white tracking-tight">Anuncios</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                Avisos que no se pierden: le llegan a cada persona como una tarjeta encima de todo, y no puede seguir
                usando NEXO hasta marcarlos como leídos. No se responden.
              </p>
            </div>

            <EstadoAlertas />

            <div className="av-pestanas" role="tablist" aria-label="Secciones de Anuncios">
              {vistas.map((v) => (
                <button key={v.id} type="button" role="tab" aria-selected={vista === v.id} className="av-pestana" onClick={() => ir(v.id)}>
                  <span className="material-symbols-outlined" aria-hidden="true">{v.icono}</span>
                  {v.nombre}
                </button>
              ))}
            </div>

            <div role="tabpanel" aria-label={vistas.find((v) => v.id === vista)?.nombre}>
              {vista === "nuevo" && <Compositor onVerEnviados={() => ir("enviados")} />}
              {vista === "leidos" && <CasillaLeidos />}
              {vista === "enviados" && <ListaEnviados />}
              {vista === "grupos" && <GestorGrupos />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
