import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import ColaRevisionWidget, { type ItemCola as ItemColaWidget } from "./components/bibliotecario/ColaRevisionWidget";
import BannerCola from "./components/bibliotecario/BannerCola";
import ModalRevisarRecurso from "./components/bibliotecario/ModalRevisarRecurso";
import { usarCola, type ItemCola } from "../servicios/biblioteca";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import { textoRelativo } from "../servicios/fechas";

// La cola de revisión del bibliotecario, con datos reales de la base (14.11):
// se fueron los recursos, la cola y las estadísticas escritas a mano. Los
// pendientes salen ordenados por llegada (primero en entrar, primero en
// revisarse) y cada uno se aprueba (institucional/nacional) o se rechaza.

export default function PanelBibliotecarioPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { pendientes, conteo, cargando, error, recargar } = usarCola();

  const [busqueda, setBusqueda] = useState("");
  const [revisando, setRevisando] = useState<ItemCola | null>(null);

  // Filtro por texto sobre la cola real (título, autor o categoría).
  const cola = useMemo(() => {
    if (!pendientes) return [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return pendientes;
    return pendientes.filter(
      (c) =>
        c.titulo.toLowerCase().includes(q) ||
        c.presentadoPor.toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q),
    );
  }, [pendientes, busqueda]);

  // Adapta la cola al widget de la columna derecha (título, autor, tiempo).
  const itemsWidget: ItemColaWidget[] = cola.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    autor: c.presentadoPor,
    tiempo: textoRelativo(c.presentadoEn),
  }));

  const abrirRevision = (id: string) => {
    const item = (pendientes ?? []).find((c) => c.id === id) ?? null;
    setRevisando(item);
  };

  if (!usuario) return null;

  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        {/* ── TopAppBar con búsqueda ── */}
        <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-16 bg-[#1C1030]/80 backdrop-blur-md border-b border-surface-container-high">
          <div className="flex items-center gap-4">
            <h1 className="text-[#C548F5] font-bold text-xl tracking-tight">Panel de Control</h1>
            <div className="relative w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                search
              </span>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-surface-container-high/50 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary text-white"
                placeholder="Buscar en la cola…"
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navegar("/notificaciones")}
              className="text-gray-400 hover:text-primary transition-all relative"
              aria-label="Notificaciones"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-background">
          {/* ── Encabezado ── */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-extrabold text-white tracking-tight font-headline">
                Cola de revisión
              </h2>
              <p className="text-on-surface-variant font-medium mt-1">
                Recursos presentados esperando aprobación —{" "}
                <span className="text-[#C548F5]">{conteo.pendiente} pendiente{conteo.pendiente !== 1 ? "s" : ""}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navegar("/biblioteca/nacional")}
                className="bg-surface-container-high text-primary border border-primary/20 px-6 py-2.5 rounded-full font-bold text-sm hover:bg-surface-container-high/80 transition-all"
              >
                Ver biblioteca nacional
              </button>
              <button
                onClick={() => navegar("/biblioteca/institucional")}
                className="bg-[#C548F5] text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-xl shadow-[#C548F5]/30 hover:scale-[1.02] transition-all"
              >
                Ver biblioteca institucional
              </button>
            </div>
          </div>

          {cargando && <Cargando que="la cola de revisión" />}
          {error && <Fallo error={error} onReintentar={recargar} />}

          {!cargando && !error && (
            <>
              <BannerCola cantidad={conteo.pendiente} onIrACola={() => window.scrollTo({ top: 0 })} />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Columna izquierda: la cola con acciones */}
                <div className="lg:col-span-8 space-y-4">
                  {cola.length > 0 ? (
                    cola.map((item) => (
                      <div
                        key={item.id}
                        className="bg-surface p-5 rounded-lg flex items-center gap-4 border border-outline-variant/10 hover:ring-1 hover:ring-primary/40 transition-all"
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-bold truncate">{item.titulo}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full">
                              {item.categoria}
                            </span>
                            <span className="text-xs text-on-surface-variant truncate">
                              {item.presentadoPor} · {textoRelativo(item.presentadoEn)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setRevisando(item)}
                          className="shrink-0 bg-[#C548F5] text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-[#d15aff] transition-all active:scale-95"
                        >
                          Revisar
                        </button>
                      </div>
                    ))
                  ) : (
                    <Vacio
                      icono="inbox"
                      mensaje={busqueda ? "No hay recursos en la cola que coincidan con la búsqueda." : "No hay recursos pendientes de revisión."}
                    />
                  )}
                </div>

                {/* Columna derecha: widgets */}
                <div className="lg:col-span-4 space-y-6">
                  <ColaRevisionWidget
                    items={itemsWidget}
                    onRevisarItem={abrirRevision}
                    onVerCola={() => window.scrollTo({ top: 0 })}
                  />

                  {/* Estadísticas reales de la cola (por estado). */}
                  <section className="bg-surface-container rounded-lg p-6 shadow-xl border border-outline-variant/10">
                    <h3 className="font-headline font-bold text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">analytics</span>
                      Estado de la cola
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center text-primary">
                        <span className="opacity-80">Pendientes</span>
                        <span className="font-bold">{conteo.pendiente}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#14B8A6]">
                        <span className="opacity-80">Aprobados</span>
                        <span className="font-bold">{conteo.aprobado}</span>
                      </div>
                      <div className="flex justify-between items-center text-error">
                        <span className="opacity-80">Rechazados</span>
                        <span className="font-bold">{conteo.rechazado}</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {revisando && (
        <ModalRevisarRecurso
          item={revisando}
          onCerrar={() => setRevisando(null)}
          onDecidido={() => {
            setRevisando(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}
