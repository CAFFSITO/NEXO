import { useMemo, useState } from "react";
import TopBar from "./components/shared/TopBar";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TarjetaDebate, { type PosturaVoto } from "./components/comunidad/TarjetaDebate";
import PanelLateralDebates from "./components/comunidad/PanelLateralDebates";
import ModalDetalleComunidad from "./components/comunidad/ModalDetalleComunidad";
import ModalDenuncia from "./components/comunidad/ModalDenuncia";
import {
  useDebates,
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
  const { debates, cargando, error, recargar } = useDebates();
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cierre, setCierre] = useState("");
  const [creando, setCreando] = useState(false);
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
    if (!nuevoTitulo.trim() || creando) return;
    setCreando(true); setAvisoError(null);
    try {
      await crearDebate(nuevoTitulo.trim(), descripcion.trim(), cierre ? new Date(cierre).toISOString() : null);
      setNuevoTitulo("");
      setDescripcion(""); setCierre("");
      setModalAbierto(false);
      recargar();
    } catch (e) {
      setAvisoError(e instanceof Error ? e.message : "No se pudo crear el debate.");
    } finally { setCreando(false); }
  };

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen bg-[#190d2d]">
        <TopBar title="Comunidad" subtitle="Debates" />

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
          <div className="flex-1 min-w-0 space-y-6">
            <div className="flex flex-wrap gap-4 items-center justify-between"><div><h1 className="text-3xl font-headline font-bold mb-2">Ideas que nos mueven</h1><p className="text-sm text-on-surface-variant/70">Escuchá otras miradas y sumá la tuya.</p></div><input aria-label="Buscar debates" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar debates…" className="border border-outline-variant/40 rounded-xl p-3 text-sm bg-surface-container" /></div>
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
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setModalAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Crear nuevo debate"
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
              aria-label="Pregunta del debate"
              maxLength={200}
              value={nuevoTitulo}
              onChange={(e) => setNuevoTitulo(e.target.value)}
              placeholder="¿Debería...?"
              rows={3}
              className="w-full bg-[#1C1030] text-white rounded-lg px-4 py-3 text-sm border border-[#3b2f50] focus:ring-1 focus:ring-[#C548F5] placeholder-white/30 resize-none"
            />
            <label className="block text-sm mt-4">Contexto del debate<textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={10000} rows={3} className="block w-full mt-2 bg-background rounded-xl p-3" placeholder="Compartí información para empezar la conversación." /></label>
            <label className="block text-sm mt-4">Cierre <span className="text-on-surface-variant/60">· opcional</span><input type="datetime-local" value={cierre} onChange={e => setCierre(e.target.value)} className="block w-full mt-2 bg-background rounded-xl p-3" /></label>
            {avisoError && <p role="alert" className="mt-3 text-error text-sm">{avisoError}</p>}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-5 py-2 rounded-full text-sm font-bold text-white/60 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearDebate}
                disabled={!nuevoTitulo.trim() || creando}
                className="bg-[#C548F5] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-[#d15aff] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {creando ? "Publicando…" : "Publicar"}
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
