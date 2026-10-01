import { useCallback, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import ChatWindow from "./components/chat/ChatWindow";
import TarjetaCursoPreceptor from "./components/preceptor/TarjetaCursoPreceptor";
import PanelActividadReciente from "./components/preceptor/PanelActividadReciente";
import PanelProximosEventos from "./components/preceptor/PanelProximosEventos";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import { useNavegacion } from "../navegacion";
import { subtituloInstitucional, useInstitucion } from "../servicios/institucion";
import { useCursosPreceptor, type ConversacionModerable, type Mensaje } from "../servicios/chat";
import { useDatos } from "../servicios/api";
import { useCalendario } from "../servicios/calendario";
import { aInstante, diasHasta, fechaCorta, fechaHora } from "../servicios/fechas";
import { useTiempoReal } from "../servicios/tiempoReal";

type Actividad = { id: string; autor: string; cursoId: string; curso: string; enviadoEn: string };

export default function MisCursosPreceptorPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { institucion } = useInstitucion();
  const { cursos, cargando, error, recargar } = useCursosPreceptor();
  const calendario = useCalendario();
  const actividad = useDatos<{ actividades: Actividad[] }>("/api/chat/actividad-preceptor");
  const [moderando, setModerando] = useState<{ id: string; nombre: string } | null>(null);
  const [convAbierta, setConvAbierta] = useState<ConversacionModerable | null>(null);
  const conversaciones = useDatos<{ conversaciones: ConversacionModerable[] }>(moderando ? `/api/chat/moderacion/${moderando.id}` : null);
  const hilo = useDatos<{ mensajes: Mensaje[] }>(moderando && convAbierta ? `/api/chat/moderacion/${moderando.id}/${convAbierta.id}/mensajes` : null);
  const refrescarActividad = actividad.recargar;
  const refrescarHilo = hilo.recargar;
  const refrescarConversaciones = conversaciones.recargar;
  useTiempoReal(useCallback(evento => {
    if (evento.tipo !== "mensaje") return;
    refrescarActividad();
    refrescarConversaciones();
    if (evento.conversacionId === convAbierta?.id) refrescarHilo();
  }, [convAbierta?.id, refrescarActividad, refrescarHilo, refrescarConversaciones]));

  if (!usuario) return null;
  const recientes = actividad.datos?.actividades ?? [];
  const eventos = (calendario.datos?.eventos ?? []).filter(e => (diasHasta(e.fecha) ?? -1) >= 0)
    .sort((a,b) => `${a.fecha}${a.horaInicio ?? ""}`.localeCompare(`${b.fecha}${b.horaInicio ?? ""}`)).slice(0,4);
  const cerrar = () => { setModerando(null); setConvAbierta(null); };

  return <div className="flex bg-background min-h-screen text-on-surface">
    <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
    <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen">
      <TopBar title="Mis cursos" subtitle={institucion?.nombre} />
      <div className="p-8 flex flex-col xl:flex-row gap-8">
        <section className="flex-1 min-w-0 space-y-6">
          <div><h1 className="text-3xl font-bold font-headline">Acompañar cada curso</h1><p className="text-sm text-on-surface-variant/70 mt-2">{subtituloInstitucional(institucion)}</p></div>
          {cargando ? <Cargando que="tus cursos" /> : error ? <Fallo error={error} onReintentar={recargar} /> : cursos?.length === 0 ? <Vacio icono="school" mensaje="Todavía no tenés cursos a cargo." /> :
            <div className="grid sm:grid-cols-2 gap-5">{cursos?.map(c => <TarjetaCursoPreceptor key={c.id} curso={{ id:c.id, nombre:c.nombre, cantidadEstudiantes:c.estudiantes, estadoComunidad:"activa", ultimoPosteo:recientes.find(a=>a.cursoId===c.id) ? fechaHora(recientes.find(a=>a.cursoId===c.id)!.enviadoEn) : undefined }} onModerar={() => { setConvAbierta(null); setModerando({id:c.id,nombre:c.nombre}); }} />)}</div>}
        </section>
        <aside className="w-full xl:w-80 shrink-0 space-y-5">
          {actividad.cargando ? <Cargando que="la actividad" /> : actividad.error ? <Fallo error={actividad.error} onReintentar={actividad.recargar} /> : <PanelActividadReciente actividades={recientes.map(a=>({...a,tipo:"mensaje",tiempo:fechaHora(a.enviadoEn)}))} />}
          {calendario.cargando ? <Cargando que="los próximos eventos" /> : calendario.error ? <Fallo error={calendario.error} onReintentar={calendario.recargar} /> : <PanelProximosEventos eventos={eventos.map(e=>({id:e.id,titulo:e.titulo,fecha:`${fechaCorta(e.fecha)}${e.horaInicio ? ` · ${e.horaInicio}` : ""}`,icono:"event"}))} onVerCalendario={()=>navegar("/comunidad/calendario")} />}
        </aside>
      </div>
    </main>
    {moderando && <div className="fixed inset-0 z-[70] bg-black/70 p-3 sm:p-6 flex items-center justify-center">
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-moderacion" className="bg-background border border-outline-variant rounded-2xl w-full max-w-5xl h-[88dvh] flex flex-col overflow-hidden">
        <header className="p-4 border-b border-outline-variant flex gap-3 items-center justify-between"><div><h2 id="titulo-moderacion" className="font-bold">Moderar {moderando.nombre}</h2><p className="text-xs text-slate-400 mt-1">Conversaciones del curso · solo lectura</p></div><button onClick={cerrar} aria-label="Cerrar moderación" className="nexo-icon-button"><span className="material-symbols-outlined">close</span></button></header>
        <div className="flex flex-1 min-h-0">
          <div className={`${convAbierta ? "hidden md:block" : "block"} w-full md:w-72 shrink-0 border-r border-outline-variant p-3 overflow-y-auto space-y-2`}>
            {conversaciones.cargando ? <Cargando que="las conversaciones" /> : conversaciones.error ? <Fallo error={conversaciones.error} onReintentar={conversaciones.recargar} /> : conversaciones.datos?.conversaciones.length === 0 ? <p className="p-3 text-sm text-slate-400">Sin conversaciones para moderar.</p> : conversaciones.datos?.conversaciones.map(conv=><button key={conv.id} onClick={()=>setConvAbierta(conv)} className={`w-full text-left p-3 rounded-xl ${convAbierta?.id===conv.id ? "bg-primary/15" : "hover:bg-white/5"}`}><p className="font-semibold text-sm truncate">{conv.nombre || "Conversación"}</p><p className="text-xs text-slate-400 mt-1 truncate">{conv.ultimoMensaje || "Sin mensajes"}</p></button>)}
          </div>
          <div className={`${convAbierta ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
            {convAbierta ? <ChatWindow nombreContacto={convAbierta.nombre || "Conversación"} soloLectura cargando={hilo.cargando} error={hilo.error} onReintentar={hilo.recargar} onVolver={()=>setConvAbierta(null)} messages={(hilo.datos?.mensajes??[]).map(m=>({id:m.id,sender:"other",autor:m.autor,contenido:m.contenido,archivo:m.archivo,archivoId:m.archivoId,timestamp:aInstante(m.enviadoEn)?.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})??""}))} /> : <div className="m-auto p-5 text-sm text-slate-400">Elegí una conversación para moderar.</div>}
          </div>
        </div>
      </section>
    </div>}
  </div>;
}
