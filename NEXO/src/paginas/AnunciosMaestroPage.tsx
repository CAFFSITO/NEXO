// src/paginas/AnunciosMaestroPage.tsx
// Los grupos de difusión de Anuncios, vistos por el Maestro: elige una escuela
// y arma o edita sus grupos (la dirección de cada escuela lo hace desde su
// propia pantalla de Anuncios). El Maestro no manda ni recibe avisos.

import { useSearchParams } from "react-router-dom";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import { useNavegacion } from "../navegacion";
import { useInstancias } from "../servicios/maestro";
import GestorGrupos from "./components/anuncios/GestorGrupos";
import "./components/anuncios/anuncios.css";
import Selector from "./components/shared/Selector";

export default function AnunciosMaestroPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { datos, cargando, error, recargar } = useInstancias();
  const [params, setParams] = useSearchParams();

  if (!usuario) return null;

  const instancias = datos?.instancias ?? [];
  const pedida = params.get("escuela");
  const elegida = instancias.find((i) => i.id === pedida) ?? instancias[0] ?? null;

  return (
    <div className="flex bg-background min-h-screen text-on-background">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen">
        <TopBar title="Grupos de anuncios" />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-4xl font-black font-headline text-white tracking-tight">Grupos de anuncios</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                  Los grupos de difusión de cada escuela: quién le puede mandar avisos obligatorios a quién.
                </p>
              </div>
              {instancias.length > 0 && (
                <label className="flex flex-col gap-1">
                  <span className="av-etiqueta !mb-0">Escuela</span>
                  <Selector
                    className="av-campo min-w-[240px]"
                    value={elegida?.id ?? ""}
                    onChange={(e) => setParams({ escuela: e.target.value }, { replace: true })}
                  >
                    {instancias.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </Selector>
                </label>
              )}
            </div>

            {cargando && !datos && <p className="text-sm text-on-surface-variant">Cargando las escuelas…</p>}
            {error && !datos && (
              <div className="av-panel flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>{error}</span>
                <button type="button" className="av-boton suave chico" onClick={recargar}>Reintentar</button>
              </div>
            )}
            {datos && !elegida && (
              <div className="av-vacio">
                <span className="material-symbols-outlined" aria-hidden="true">domain_disabled</span>
                <strong>Todavía no hay escuelas</strong>
                <p className="text-sm">Forjá una instancia para poder armar sus grupos.</p>
              </div>
            )}
            {elegida && <GestorGrupos key={elegida.id} institucionId={elegida.id} />}
          </div>
        </div>
      </main>
    </div>
  );
}
