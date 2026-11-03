// src/paginas/DebatesPage.tsx
// VISTA: Debates (ruta /comunidad/debates). Ya no son solo "a favor o en
// contra": cada debate combina bloques (postura, encuesta, escala, ranking,
// argumentos, propuestas, pregunta abierta), tiene hilos adentro, Δ de
// "me hizo cambiar de opinión", resultados visibles según lo que eligió quien
// lo abrió, cierre y conclusión. El servidor decide y valida todo.

import { useMemo, useState } from "react";
import TopBar from "./components/shared/TopBar";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import { useDebates } from "../servicios/comunidad";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import { useCapacidad, useFuncion, useInstancia } from "../servicios/instancia";
import { rutaVisible } from "./components/shared/navegacionItems";
import { limpiarEnfoque, verEnfoque } from "../servicios/enfoque";
import { usePestanasComunidad } from "./components/comunidad/pestanas";
import TarjetaDebate from "./components/comunidad/TarjetaDebate";
import DetalleDebate from "./components/comunidad/DetalleDebate";
import CreadorDebate from "./components/comunidad/CreadorDebate";
import PerfilComunidad from "./components/comunidad/PerfilComunidad";
import "./components/comunidad/comunidad.css";

type Filtro = "todos" | "abiertos" | "cerrados" | "participo" | "mios";
const FILTROS: { id: Filtro; nombre: string }[] = [
  { id: "todos", nombre: "Todos" }, { id: "abiertos", nombre: "Abiertos" }, { id: "participo", nombre: "Donde participo" },
  { id: "mios", nombre: "Los míos" }, { id: "cerrados", nombre: "Cerrados" },
];
const PUBLICAN = ["estudiante", "profesor", "admin-academico", "centro-estudiantes"];
const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function DebatesPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { instancia } = useInstancia();
  const { debates, cargando, error, recargar } = useDebates();
  const pestanas = usePestanasComunidad();
  const crearHabilitado = useFuncion("debates.crear");
  const puedeFijar = useCapacidad("comunidad.fijar");
  const rol = usuario?.rol ?? "estudiante";
  const yo = { id: usuario?.id ?? 0, rol };
  const puedeCrear = crearHabilitado && PUBLICAN.includes(rol);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; tipo: "ok" | "error" } | null>(null);
  const [enfoqueUsado, setEnfoqueUsado] = useState(false);
  const enfoque = !enfoqueUsado ? verEnfoque("debate") : null;
  const detalle = abierto ?? enfoque;

  const lista = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    return (debates ?? []).filter((d) =>
      (filtro === "todos" || (filtro === "abiertos" && d.abierto) || (filtro === "cerrados" && !d.abierto) ||
        (filtro === "participo" && d.estoyParticipando) || (filtro === "mios" && d.autorId === String(yo.id))) &&
      (!q || sinTildes(`${d.titulo} ${d.descripcion} ${d.autor}`).includes(q)));
  }, [debates, filtro, busqueda, yo.id]);

  const avisar = (texto: string, tipo: "ok" | "error" = "ok") => {
    setAviso({ texto, tipo });
    window.setTimeout(() => setAviso((a) => (a?.texto === texto ? null : a)), 3500);
  };

  if (!usuario) return null;
  return (
    <div className="flex bg-fondo min-h-screen">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen">
        <TopBar title="Debates" pestanas={pestanas} />
        {rutaVisible(instancia, "/chat") && <button type="button" className="self-start mx-4 my-2 text-sm text-primary font-bold" onClick={() => navegar("/chat?espacios=1")}>Explorar canales y foros</button>}

        <div className="mx-auto w-full max-w-[980px] flex-1 px-3 py-6 sm:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-headline text-3xl font-bold text-white">Debates</h1>
              <p className="mt-1 max-w-xl text-sm text-on-surface-variant/70">Posturas, encuestas, escalas, rankings, argumentos y propuestas, combinados como quiera quien abre el debate. Con hilos adentro y la Δ para cuando un argumento te hace cambiar de opinión.</p>
            </div>
            {puedeCrear && (
              <button type="button" className="c-boton" onClick={() => setCreando(true)}><span className="material-symbols-outlined" aria-hidden="true">add</span>Nuevo debate</button>
            )}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="c-pestanas flex-1 !border-0" role="tablist" aria-label="Filtrar debates">
              {FILTROS.map((f) => <button key={f.id} type="button" role="tab" aria-selected={filtro === f.id} className="c-pestana" onClick={() => setFiltro(f.id)}>{f.nombre}</button>)}
            </div>
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant/50" aria-hidden="true">search</span>
              <input className="c-input !rounded-full !pl-10" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar debates" aria-label="Buscar debates" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {cargando && !debates && <Cargando que="los debates" />}
            {error && !debates && <Fallo error={error} onReintentar={recargar} />}
            {debates && lista.length === 0 && <Vacio icono="forum" mensaje={busqueda || filtro !== "todos" ? "No hay debates con ese filtro." : "Todavía no hay debates. ¡Abrí el primero!"} />}
            {lista.map((d) => <TarjetaDebate key={d.id} debate={d} onAbrir={() => setAbierto(d.id)} />)}
          </div>
        </div>
      </main>

      {detalle && (
        <DetalleDebate
          id={detalle}
          yo={yo}
          puedeFijar={puedeFijar}
          onCerrar={() => { setAbierto(null); if (enfoque) { limpiarEnfoque(); setEnfoqueUsado(true); } }}
          onCambio={recargar}
          onPerfil={setPerfil}
          onAviso={avisar}
        />
      )}
      {creando && <CreadorDebate onCerrar={() => setCreando(false)} onCreado={(id) => { setCreando(false); recargar(); setAbierto(id); avisar("¡Debate abierto!"); }} />}
      {perfil && (
        <PerfilComunidad id={perfil} yo={yo} puedeFijar={puedeFijar} puedePublicar={PUBLICAN.includes(rol)} onCerrar={() => setPerfil(null)}
          onAbrir={() => navegar("/comunidad")} onPerfil={setPerfil} onTag={() => navegar("/comunidad")} onCitar={() => navegar("/comunidad")} onDenunciar={() => {}} onAviso={avisar} />
      )}
      {aviso && (
        <div role="status" className={`fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full px-5 py-3 text-sm font-semibold shadow-2xl c-aparecer ${aviso.tipo === "ok" ? "bg-primary text-on-primary" : "bg-rose-500 text-white"}`}>
          {aviso.texto}
        </div>
      )}
    </div>
  );
}
