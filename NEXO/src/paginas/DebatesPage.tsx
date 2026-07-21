import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TarjetaDebate, { type PosturaVoto } from "./components/comunidad/TarjetaDebate";
import PanelLateralDebates from "./components/comunidad/PanelLateralDebates";
import ModalDetalleComunidad from "./components/comunidad/ModalDetalleComunidad";
import ModalDenuncia from "./components/comunidad/ModalDenuncia";
import {
  usarDebates,
  participar,
  fijarPostura,
  crearDebate,
  denunciar,
  eliminarContenido,
  type ObjetoVotable,
} from "../servicios/comunidad";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";

// Se fueron tres debates inventados con "152 a favor" escritos a mano. Los
// debates reales viven en la tabla `debates` y sus barras se cuentan de las
// posturas reales de `debate_participantes`.

export default function DebatesPage() {
  const { debates, cargando, error, recargar } = usarDebates();
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [avisoError, setAvisoError] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [denunciaDe, setDenunciaDe] = useState<{ tipo: ObjetoVotable; id: string } | null>(null);

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const rol = usuario?.rol ?? "estudiante";
  const usuarioId = usuario?.id ?? 0;
  // Escritura de debates: perfiles participativos. Preceptor/bibliotecario solo leen.
  const puedeCrearDebate =
    rol === "estudiante" ||
    rol === "profesor" ||
    rol === "admin-academico" ||
    rol === "centro-estudiantes";

  const debatesFiltrados = useMemo(() => {
    const lista = debates ?? [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((d) => d.titulo.toLowerCase().includes(q));
  }, [debates, busqueda]);

  // Escritura real (Etapa 5). Fijar postura exige haber participado; el servidor
  // lo rechaza si no, así que acá solo llamamos y refrescamos.
  const conError = (accion: Promise<unknown>) =>
    accion.then(recargar).catch((e) =>
      setAvisoError(e instanceof Error ? e.message : "No se pudo completar la acción.")
    );

  const handleVotar = (id: string, postura: PosturaVoto) => conError(fijarPostura(id, postura));
  const handleParticipar = (id: string) => conError(participar(id));
  const abrirDebate = (id: string) => setDetalleId(id);
  const handleEliminar = (tipo: ObjetoVotable, id: string) => conError(eliminarContenido(tipo, id));

  const handleCrearDebate = async () => {
    if (!nuevoTitulo.trim()) return;
    try {
      await crearDebate(nuevoTitulo.trim(), "", null);
      setNuevoTitulo("");
      setModalAbierto(false);
      recargar();
    } catch (e) {
      setAvisoError(e instanceof Error ? e.message : "No se pudo crear el debate.");
    }
  };

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen bg-[#190d2d]">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 w-full sticky top-0 z-50 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] shadow-lg shadow-black/20">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white uppercase tracking-tight font-headline">
              Comunidad General
            </h1>
            <span className="px-3 py-1 bg-purple-900/40 text-[#C548F5] text-[10px] font-black rounded-full border border-[#C548F5]/20">
              SCHOOL ALPHA
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                search
              </span>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bg-[#2D1B4E] border-none text-sm rounded-full py-2 pl-10 pr-4 w-64 focus:ring-1 focus:ring-[#C548F5] text-white placeholder-white/40"
                placeholder="Buscar debates..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-4">
              <button className="text-white/60 hover:text-[#C548F5] transition-all relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-0 right-0 w-2 h-2 bg-[#C548F5] rounded-full" />
              </button>
              <button className="text-white/60 hover:text-[#C548F5] transition-all">
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>
          </div>
        </header>

        {/* Tabs. Antes eran estado local (`setTab`) y no navegaban: al entrar a
            Debates, tocar "Feed" o "Tendencias" no llevaba a ningún lado y el
            usuario quedaba atrapado (Error 2.B.14). Ahora son navegación real a
            las direcciones del módulo, así que se puede ir y volver siempre. */}
        <div className="px-8 border-b border-[#2D1B4E] bg-[#1C1030]/40">
          <div className="flex gap-8 pt-4">
            {[
              { label: "Feed", ruta: "/comunidad" },
              { label: "Debates", ruta: "/comunidad/debates" },
              { label: "Tendencias", ruta: "/comunidad/tendencias" },
            ].map((t) => (
              <button
                key={t.ruta}
                onClick={() => handleNavegar(t.ruta)}
                className={`pb-3 text-sm transition-all ${
                  t.ruta === "/comunidad/debates"
                    ? "text-[#C548F5] border-b-2 border-[#C548F5] font-bold"
                    : "text-white/60 hover:text-[#C548F5] font-medium"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 flex gap-8">
          <div className="flex-1 space-y-6">
            {avisoError && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {avisoError}
              </div>
            )}
            {puedeCrearDebate && (
              <div className="flex justify-end">
                <button
                  onClick={() => setModalAbierto(true)}
                  className="flex items-center gap-2 bg-[#C548F5] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#d15aff] active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Nuevo debate
                </button>
              </div>
            )}

            {cargando ? (
              <Cargando que="los debates" />
            ) : error ? (
              <Fallo error={error} onReintentar={recargar} />
            ) : debatesFiltrados.length === 0 ? (
              <Vacio
                icono="forum"
                mensaje={busqueda ? "No se encontraron debates." : "Todavía no hay debates."}
              />
            ) : (
              debatesFiltrados.map((debate) => (
                <TarjetaDebate
                  key={debate.id}
                  debate={debate}
                  rolLector={rol}
                  usuarioId={usuarioId}
                  onVotar={handleVotar}
                  onParticipar={handleParticipar}
                  onAbrir={abrirDebate}
                  onDenunciar={(tipo, id) => setDenunciaDe({ tipo, id })}
                  onEliminar={handleEliminar}
                />
              ))
            )}
          </div>

          <PanelLateralDebates debates={debates ?? []} onAbrirDebate={abrirDebate} />
        </div>
      </main>

      {/* Modal Nuevo Debate */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="bg-[#2D1B4E] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white font-headline">Crear nuevo debate</h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <label className="block text-xs font-medium text-white/60 mb-2">
              Pregunta del debate
            </label>
            <textarea
              value={nuevoTitulo}
              onChange={(e) => setNuevoTitulo(e.target.value)}
              placeholder="¿Debería...?"
              rows={3}
              className="w-full bg-[#1C1030] text-white rounded-lg px-4 py-3 text-sm border border-[#3b2f50] focus:ring-1 focus:ring-[#C548F5] placeholder-white/30 resize-none"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-5 py-2 rounded-full text-sm font-bold text-white/60 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearDebate}
                disabled={!nuevoTitulo.trim()}
                className="bg-[#C548F5] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-[#d15aff] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}

      {detalleId && (
        <ModalDetalleComunidad
          tipo="debate"
          id={detalleId}
          rol={rol}
          usuarioId={usuarioId}
          onCerrar={() => setDetalleId(null)}
          onCambio={recargar}
        />
      )}

      {denunciaDe && (
        <ModalDenuncia
          onCerrar={() => setDenunciaDe(null)}
          onEnviar={async (motivo) => {
            await denunciar(denunciaDe.tipo, denunciaDe.id, motivo);
            setDenunciaDe(null);
          }}
        />
      )}
    </div>
  );
}
