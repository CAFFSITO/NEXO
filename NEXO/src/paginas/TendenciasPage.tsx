import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import {
  decidirTendenciaNacional,
  useBandejaNacional,
  useTendencias,
  type AlcanceTendencias,
  type BandejaNacional,
  type FilaNacional,
  type Tendencia,
} from "../servicios/comunidad";
import { useCapacidad, useFuncion } from "../servicios/instancia";
import { limpiarEnfoque, verEnfoque } from "../servicios/enfoque";
import DetallePublicacion from "./components/comunidad/DetallePublicacion";
import DetalleDebate from "./components/comunidad/DetalleDebate";
import "./components/comunidad/comunidad.css";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import { usePestanasComunidad } from "./components/comunidad/pestanas";

// Tendencias de la escuela y nacionales. Cada fila es real: el puntaje lo
// calcula el servidor (servidor/tendencias.js) con el algoritmo de la escuela
// (su genoma) o con el algoritmo nacional de la plataforma. Lo institucional
// solo sale a lo nacional si lo aprueba la dirección de la escuela, y en lo
// nacional se ve sin nombres de personas.

// El alcance reemplaza los nombres viejos "Global" y "Mi Red" por lo que de
// verdad significan en un entorno escolar (Error 2.B.10).
const ALCANCES: { valor: AlcanceTendencias; label: string; icono: string }[] = [
  { valor: "mi-escuela", label: "Mi escuela", icono: "school" },
  { valor: "nacional", label: "Nacional", icono: "public" },
];

type Decision = "aprobar" | "rechazar" | "retirar";

export default function TendenciasPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const pestanas = usePestanasComunidad();
  const rol = usuario?.rol ?? "estudiante";
  // Solo la dirección decide qué sale a lo nacional (y si el Maestro no le
  // apagó esa función). El servidor lo exige igual.
  const funcionNacional = useFuncion("tendencias.nacional");
  const puedeDecidir = rol === "admin-academico" && funcionNacional;

  const [alcance, setAlcance] = useState<AlcanceTendencias>("mi-escuela");
  const { tendencias, desactivado, cargando, error, recargar } = useTendencias(alcance);
  const bandeja = useBandejaNacional(puedeDecidir);
  const usuarioId = usuario?.id ?? 0;

  // Cada tendencia es pulsable y expandible (Error 2.B.11): abre el detalle
  // completo con su hilo. Una tendencia nacional de otra escuela se abre en
  // modo lectura y sin nombres (lo decide el servidor).
  const [detalle, setDetalle] = useState<{ tipo: "debate" | "publicacion"; id: string; propio: boolean } | null>(null);
  const puedeFijar = useCapacidad("comunidad.fijar");
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [decidiendo, setDecidiendo] = useState<string | null>(null);
  const [verComo, setVerComo] = useState(false);
  const panel = useRef<HTMLElement>(null);

  // Si se llegó desde una notificación de tendencia, la dirección ve su bandeja.
  const bandejaLista = bandeja.datos !== null;
  useEffect(() => {
    if (!bandejaLista || verEnfoque("tendencia") === null) return;
    panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    limpiarEnfoque();
  }, [bandejaLista]);

  const decidir = async (tipo: "publicacion" | "debate", id: string, decision: Decision) => {
    setDecidiendo(`${tipo}-${id}`);
    setAviso(null);
    try {
      const r = await decidirTendenciaNacional(tipo, id, decision);
      setAviso({ tipo: "ok", texto: r.mensaje });
      recargar();
      bandeja.recargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo guardar la decisión." });
    } finally {
      setDecidiendo(null);
    }
  };

  return (
    <div className="flex bg-fondo min-h-screen">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen">
        <TopBar title="Tendencias" pestanas={pestanas} />

        <div className="flex-1 overflow-y-auto p-8 bg-fondo">
          <div className={`mx-auto grid gap-8 ${puedeDecidir ? "max-w-6xl xl:grid-cols-[minmax(0,1fr)_340px]" : "max-w-4xl"}`}>
            <section className="min-w-0">
              <div className="flex flex-wrap items-end justify-between gap-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-acento mb-2">
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                      local_fire_department
                    </span>
                    <span className="text-xs font-bold tracking-[0.2em] uppercase">
                      {alcance === "nacional" ? "Todo NEXO" : "Popular ahora"}
                    </span>
                  </div>
                  <h1 className="text-4xl font-extrabold text-white font-headline tracking-tight">
                    {alcance === "nacional" ? "Tendencias nacionales" : "Tendencias de tu escuela"}
                  </h1>
                </div>
                <div className="flex bg-surface-container rounded-full p-1 border border-white/5" role="tablist" aria-label="Alcance de las tendencias">
                  {ALCANCES.map((opcion) => (
                    <button
                      key={opcion.valor}
                      role="tab"
                      aria-selected={alcance === opcion.valor}
                      onClick={() => setAlcance(opcion.valor)}
                      className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                        alcance === opcion.valor ? "bg-acento text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">{opcion.icono}</span>
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>

              <ComoSeCalcula alcance={alcance} abierto={verComo} onAlternar={() => setVerComo(!verComo)} />

              {aviso && (
                <div role={aviso.tipo === "error" ? "alert" : "status"} className={`mb-4 rounded-2xl border px-4 py-3 text-sm flex items-center gap-2 ${aviso.tipo === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">{aviso.tipo === "ok" ? "public" : "error"}</span>
                  {aviso.texto}
                </div>
              )}

              {cargando ? (
                <Cargando que="las tendencias" />
              ) : error ? (
                <Fallo error={error} onReintentar={recargar} />
              ) : desactivado ? (
                <Vacio
                  icono="power_settings_new"
                  mensaje={alcance === "nacional" ? "Las tendencias nacionales están apagadas por ahora." : "Las tendencias están apagadas en tu escuela."}
                />
              ) : !tendencias || tendencias.length === 0 ? (
                <Vacio
                  icono={alcance === "nacional" ? "public" : "local_fire_department"}
                  mensaje={alcance === "nacional"
                    ? "Todavía no hay tendencias nacionales: aparecen cuando la dirección de una escuela aprueba una."
                    : "Todavía no hay actividad suficiente para calcular tendencias esta semana."}
                />
              ) : (
                <div className="space-y-3">
                  {tendencias.map((t, i) => (
                    <FilaTendencia
                      key={`${t.tipo}-${t.id}`}
                      tendencia={t}
                      posicion={i + 1}
                      alcance={alcance}
                      puedeDecidir={puedeDecidir}
                      ocupado={decidiendo === `${t.tipo}-${t.id}`}
                      onAbrir={() => setDetalle({ tipo: t.tipo, id: t.id, propio: t.esDeMiEscuela })}
                      onDecidir={(d) => void decidir(t.tipo, t.id, d)}
                    />
                  ))}
                </div>
              )}
            </section>

            {puedeDecidir && (
              <aside ref={panel} className="min-w-0 scroll-mt-8">
                <BandejaDireccion
                  datos={bandeja.datos}
                  cargando={bandeja.cargando}
                  error={bandeja.error}
                  onReintentar={bandeja.recargar}
                  decidiendo={decidiendo}
                  onDecidir={(f, d) => void decidir(f.tipo, f.id, d)}
                  onAbrir={(f) => setDetalle({ tipo: f.tipo, id: f.id, propio: true })}
                />
              </aside>
            )}
          </div>
        </div>
      </main>

      {/* Un debate de la propia escuela se abre entero (bloques, aportes);
          lo de otra escuela, en solo lectura y sin nombres. */}
      {detalle && detalle.tipo === "debate" && detalle.propio && (
        <DetalleDebate
          id={detalle.id}
          yo={{ id: usuarioId, rol }}
          puedeFijar={puedeFijar}
          onCerrar={() => setDetalle(null)}
          onCambio={recargar}
          onPerfil={() => handleNavegar("/comunidad")}
          onAviso={(texto, tipo) => setAviso({ tipo: tipo ?? "ok", texto })}
        />
      )}
      {detalle && !(detalle.tipo === "debate" && detalle.propio) && (
        <DetallePublicacion
          tipo={detalle.tipo}
          id={detalle.id}
          yo={{ id: usuarioId, rol }}
          puedeFijar={puedeFijar}
          puedePublicar={["estudiante", "profesor", "admin-academico", "centro-estudiantes"].includes(rol)}
          onCerrar={() => setDetalle(null)}
          onCambio={recargar}
          onPerfil={() => handleNavegar("/comunidad")}
          onTag={() => handleNavegar("/comunidad")}
          onCitar={() => handleNavegar("/comunidad")}
          onDenunciar={() => {}}
          onAviso={(texto, tipo) => setAviso({ tipo: tipo ?? "ok", texto })}
        />
      )}
    </div>
  );
}

// ─── Una tendencia ──────────────────────────────────────
function FilaTendencia({
  tendencia: t, posicion, alcance, puedeDecidir, ocupado, onAbrir, onDecidir,
}: {
  tendencia: Tendencia;
  posicion: number;
  alcance: AlcanceTendencias;
  puedeDecidir: boolean;
  ocupado: boolean;
  onAbrir: () => void;
  onDecidir: (decision: Decision) => void;
}) {
  const enNacional = t.estadoNacional === "aprobada";
  return (
    <article className="bg-lienzo hover:bg-surface-container-high rounded-[14px] border border-white/5 hover:border-acento/30 transition-all flex items-stretch">
      <button onClick={onAbrir} className="flex-1 min-w-0 text-left p-5 flex items-center gap-5">
        <span className={`text-2xl font-black w-8 shrink-0 ${posicion <= 3 ? "text-acento" : "text-acento/50"}`}>{posicion}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-acento/15 text-acento">
              {t.tipo === "debate" ? "Debate" : "Publicación"}
            </span>
            {alcance === "nacional" && (
              <span className="text-[10px] text-white/50 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs" aria-hidden="true">school</span>{t.institucion}
              </span>
            )}
            {alcance === "nacional" && t.esDeMiEscuela && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">Tu escuela</span>
            )}
            {alcance === "mi-escuela" && enNacional && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs" aria-hidden="true">public</span>Nacional
              </span>
            )}
            {alcance === "mi-escuela" && t.estadoNacional === "propuesta" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">Propuesta a lo nacional</span>
            )}
          </div>
          <p className="text-white font-medium truncate">{t.titulo}</p>
          <p className="text-[11px] text-white/45 mt-1 flex flex-wrap gap-x-3">
            <span>{t.participantes} {t.participantes === 1 ? "persona" : "personas"}</span>
            {t.comentarios > 0 && <span>{t.comentarios} comentario{t.comentarios === 1 ? "" : "s"}</span>}
            {t.aFavor + t.enContra > 0 && <span>{t.aFavor} a favor · {t.enContra} en contra</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 text-orange-400 shrink-0" title="Puntaje de tendencia">
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">local_fire_department</span>
          <span className="font-bold text-sm tabular-nums">{t.puntaje}</span>
        </div>
      </button>
      {puedeDecidir && alcance === "mi-escuela" && (
        <div className="flex items-center pr-4">
          <button
            onClick={() => onDecidir(enNacional ? "retirar" : "aprobar")}
            disabled={ocupado}
            title={enNacional ? "Sacarla de las tendencias nacionales" : "Mostrarla en todo NEXO (sin nombres)"}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
              enNacional ? "border border-white/15 text-white/70 hover:bg-white/5" : "bg-acento/15 text-primary hover:bg-acento/25"
            }`}
          >
            <span className={`material-symbols-outlined text-base ${ocupado ? "animate-spin" : ""}`} aria-hidden="true">
              {ocupado ? "progress_activity" : enNacional ? "remove_circle_outline" : "public"}
            </span>
            {enNacional ? "Retirar" : "A lo nacional"}
          </button>
        </div>
      )}
    </article>
  );
}

// ─── Cómo se calcula ────────────────────────────────────
function ComoSeCalcula({ alcance, abierto, onAlternar }: { alcance: AlcanceTendencias; abierto: boolean; onAlternar: () => void }) {
  const piezas = alcance === "nacional"
    ? [
        { icono: "verified_user", titulo: "Aprobado por su dirección", texto: "Solo entra lo que la dirección de cada escuela eligió llevar a lo nacional." },
        { icono: "groups", titulo: "Impacto justo", texto: "Cuenta cuántas personas participaron y qué parte de su escuela representan: una escuela chica movilizada compite con una grande." },
        { icono: "bolt", titulo: "Momento y confianza", texto: "Pesa lo reciente y qué tan bien recibido fue (los votos a favor, con estadística)." },
        { icono: "visibility_off", titulo: "Sin nombres, con tope", texto: "Se muestra sin nombres de personas y con un máximo de tendencias por escuela." },
      ]
    : [
        { icono: "bolt", titulo: "Energía reciente", texto: "Votos, comentarios y posturas; lo de hoy pesa más que lo de hace días." },
        { icono: "groups", titulo: "Personas distintas", texto: "Treinta comentarios de una sola persona no hacen una tendencia: importa cuántas personas se suman." },
        { icono: "thumb_up", titulo: "Bien recibido", texto: "Lo que recibe muchos votos en contra baja. Pocos votos dan poca confianza." },
        { icono: "person_off", titulo: "El autor no suma", texto: "Lo que hace quien publicó (votarse o comentarse) no cuenta para su propia tendencia." },
      ];
  return (
    <div className="mb-6">
      <button onClick={onAlternar} aria-expanded={abierto} className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-acento transition-colors">
        <span className="material-symbols-outlined text-base" aria-hidden="true">{abierto ? "expand_less" : "help_outline"}</span>
        ¿Cómo se calcula?
      </button>
      {abierto && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {piezas.map((p) => (
            <div key={p.titulo} className="rounded-xl border border-white/5 bg-lienzo/50 p-4 flex gap-3">
              <span className="material-symbols-outlined text-acento" aria-hidden="true">{p.icono}</span>
              <div>
                <p className="text-sm font-bold text-white">{p.titulo}</p>
                <p className="text-xs text-white/55 mt-0.5 leading-relaxed">{p.texto}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── La bandeja de la dirección ─────────────────────────
function BandejaDireccion({
  datos, cargando, error, onReintentar, decidiendo, onDecidir, onAbrir,
}: {
  datos: BandejaNacional | null;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  decidiendo: string | null;
  onDecidir: (fila: FilaNacional, decision: Decision) => void;
  onAbrir: (fila: FilaNacional) => void;
}) {
  const [verDescartadas, setVerDescartadas] = useState(false);
  return (
    <div className="rounded-2xl border border-acento/20 bg-lienzo/60 p-5 xl:sticky xl:top-0">
      <div className="flex items-center gap-2 text-acento">
        <span className="material-symbols-outlined" aria-hidden="true">public</span>
        <h2 className="font-headline font-bold text-white">Llevar a lo nacional</h2>
      </div>
      <p className="text-xs text-white/55 mt-2 leading-relaxed">
        {datos
          ? `El algoritmo te propone lo mejor de tu escuela (hasta ${datos.reglas.candidatas} con al menos ${datos.reglas.umbralNacional} puntos). Solo vos decidís qué sale a todo NEXO; se muestra sin nombres y con un máximo de ${datos.reglas.maxPorEscuela} por escuela.`
          : "Solo la dirección decide qué tendencia de la escuela sale a todo NEXO."}
      </p>
      {datos && !datos.reglas.nacionalActivo && (
        <p className="mt-3 text-[11px] text-amber-300">Las tendencias nacionales están apagadas por ahora: tus aprobaciones se guardan igual.</p>
      )}

      {cargando && !datos ? (
        <p className="text-xs text-white/40 py-6">Cargando propuestas…</p>
      ) : error && !datos ? (
        <div className="py-4"><Fallo error={error} onReintentar={onReintentar} /></div>
      ) : datos ? (
        <>
          <h3 className="mt-5 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Propuestas ({datos.propuestas.length})</h3>
          {datos.propuestas.length === 0 && <p className="text-xs text-white/40">No hay propuestas nuevas.</p>}
          <div className="space-y-2">
            {datos.propuestas.map((f) => (
              <FilaBandeja key={`${f.tipo}-${f.id}`} fila={f} ocupado={decidiendo === `${f.tipo}-${f.id}`} onAbrir={() => onAbrir(f)}>
                <button onClick={() => onDecidir(f, "aprobar")} className="flex-1 rounded-lg bg-acento px-3 py-1.5 text-xs font-bold text-white hover:bg-acento/90">Aprobar</button>
                <button onClick={() => onDecidir(f, "rechazar")} className="flex-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/5">Descartar</button>
              </FilaBandeja>
            ))}
          </div>

          <h3 className="mt-5 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">En lo nacional ({datos.aprobadas.length})</h3>
          {datos.aprobadas.length === 0 && <p className="text-xs text-white/40">Todavía nada de tu escuela salió a lo nacional.</p>}
          <div className="space-y-2">
            {datos.aprobadas.map((f) => (
              <FilaBandeja key={`${f.tipo}-${f.id}`} fila={f} ocupado={decidiendo === `${f.tipo}-${f.id}`} onAbrir={() => onAbrir(f)}>
                <span className="flex-1 text-[11px] text-sky-300">
                  {f.posicionNacional ? `Puesto ${f.posicionNacional} en lo nacional` : "Fuera del top nacional por ahora"}
                </span>
                <button onClick={() => onDecidir(f, "retirar")} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/5">Retirar</button>
              </FilaBandeja>
            ))}
          </div>

          {datos.descartadas.length > 0 && (
            <>
              <button onClick={() => setVerDescartadas(!verDescartadas)} aria-expanded={verDescartadas} className="mt-5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white/70">
                Descartadas y retiradas ({datos.descartadas.length})
                <span className="material-symbols-outlined text-sm" aria-hidden="true">{verDescartadas ? "expand_less" : "expand_more"}</span>
              </button>
              {verDescartadas && (
                <div className="space-y-2 mt-2">
                  {datos.descartadas.map((f) => (
                    <FilaBandeja key={`${f.tipo}-${f.id}`} fila={f} ocupado={decidiendo === `${f.tipo}-${f.id}`} onAbrir={() => onAbrir(f)}>
                      <span className="flex-1 text-[11px] text-white/40">{f.estado === "retirada" ? "Retirada" : "Descartada"}</span>
                      <button onClick={() => onDecidir(f, "aprobar")} className="rounded-lg border border-acento/40 px-3 py-1.5 text-xs font-bold text-primary hover:bg-acento/10">Aprobar igual</button>
                    </FilaBandeja>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

function FilaBandeja({ fila: f, ocupado, onAbrir, children }: { fila: FilaNacional; ocupado: boolean; onAbrir: () => void; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-white/5 bg-fondo/60 p-3 ${ocupado ? "opacity-60 pointer-events-none" : ""}`}>
      <button onClick={onAbrir} className="w-full text-left">
        <span className="text-[9px] font-bold uppercase tracking-wider text-acento/80">{f.tipo === "debate" ? "Debate" : "Publicación"}</span>
        <p className="text-sm text-white font-medium line-clamp-2">{f.titulo}</p>
        <p className="text-[11px] text-white/45 mt-1">
          {f.puntajeActual !== null
            ? `${f.puntajeActual} puntos${f.posicionEscuela ? ` · puesto ${f.posicionEscuela} en tu escuela` : ""}${f.participantes ? ` · ${f.participantes} personas` : ""}`
            : "Sin actividad reciente"}
        </p>
      </button>
      <div className="flex items-center gap-2 mt-2.5">{children}</div>
    </div>
  );
}
