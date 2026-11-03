import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import ChatContainer from "./components/asistencia-ia/ChatContainer";
import MessageInput from "./components/asistencia-ia/MessageInput";
import Selector from "./components/shared/Selector";
import { modelosEnDispositivo, responderEnDispositivo } from "../servicios/asistenciaDispositivo";
import {
  traerHistorialIa,
  enviarMensajeIa,
  borrarHistorialIa,
  cancelarMensajeIa,
  buscarFuentesIa,
  traerModelosIa,
  useEstadoIa,
  type FuenteIa,
} from "../servicios/asistenciaIa";

// El tutor usa solo un servicio local o institucional privado.

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

// El contenido del tutor es texto plano: se escapa para no inyectar HTML y se
// respetan los saltos de línea (ChatMessage lo pinta con dangerouslySetInnerHTML).
function aHtmlSeguro(texto: string): string {
  const escapado = texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escapado.replace(/\n/g, "<br>");
}

export default function AsistenciaIAPage() {
  const { usuario, navegar, cerrarSesion } = useNavegacion();
  const { estado } = useEstadoIa();

  const [messages, setMessages] = useState<Message[]>([]);
  const [pensando, setPensando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [faqAbierto, setFaqAbierto] = useState(false);
  const [fuentesDisponibles, setFuentesDisponibles] = useState<FuenteIa[]>([]);
  const [fuentes, setFuentes] = useState<FuenteIa[]>([]);
  const [modelos, setModelos] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [modoConsulta,setModoConsulta] = useState<"institucional"|"dispositivo">("institucional");
  const [modelosDispositivo,setModelosDispositivo] = useState<string[]>([]);
  const [modeloDispositivo,setModeloDispositivo] = useState("");
  const [estadoDispositivo,setEstadoDispositivo] = useState("Comprobá si Ollama está iniciado en este equipo.");
  const controladorLocal=useRef<AbortController|null>(null);
  const historialLocal=useRef<{role:"user"|"assistant";content:string}[]>([]);
  const modoActual=useRef<"institucional"|"dispositivo">("institucional");

  // Cargar el historial real al entrar.
  useEffect(() => {
    let vigente = true;
    traerHistorialIa()
      .then((hist) => {
        if (!vigente || modoActual.current!=="institucional") return;
        setMessages(
          hist.map((m) => ({
            id: m.id,
            role: m.rol,
            content: aHtmlSeguro(m.contenido),
          }))
        );
      })
      .catch(() => {
        if (vigente) setErrorEnvio("No se pudo cargar el historial. Recargá la página para volver a intentarlo.");
      });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    buscarFuentesIa(busqueda).then(setFuentesDisponibles).catch(() => setFuentesDisponibles([]));
  }, [busqueda]);
  useEffect(() => {
    traerModelosIa().then(x => setModelos(x.modelos.map(m => m.nombre))).catch(() => setModelos([]));
  }, []);

  const cambiarModo=(modo:"institucional"|"dispositivo")=>{
    if(pensando)return;
    modoActual.current=modo;setModoConsulta(modo);setMessages([]);setErrorEnvio("");
    if(modo==="dispositivo"){
      historialLocal.current=[];
      setEstadoDispositivo("Buscando Ollama en este equipo…");
      void modelosEnDispositivo().then(lista=>{setModelosDispositivo(lista);setModeloDispositivo(lista[0]??"");
        setEstadoDispositivo(lista.length?"Modelo local disponible. La conversación queda sólo en esta pestaña.":"No hay modelos locales instalados.");
      }).catch(()=>{setModelosDispositivo([]);setModeloDispositivo("");setEstadoDispositivo("No se pudo conectar con Ollama local. Revisá el servicio y OLLAMA_ORIGINS.");});
    } else {
      void traerHistorialIa().then(hist=>{if(modoActual.current==="institucional")setMessages(hist.map(m=>({id:m.id,role:m.rol,content:aHtmlSeguro(m.contenido)})));}).catch(()=>setErrorEnvio("No se pudo cargar el historial institucional."));
    }
  };

  const handleSendMessage = async (content: string) => {
    if (pensando) return false;
    setErrorEnvio("");
    const propio: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: aHtmlSeguro(content),
    };
    setPensando(true);
    try {
      let respuesta:string;
      if(modoConsulta==="dispositivo"){
        const controller=new AbortController();controladorLocal.current=controller;
        respuesta=await responderEnDispositivo(content,modeloDispositivo,fuentes,historialLocal.current,controller.signal);
        if(controller.signal.aborted)return false;
        historialLocal.current=[...historialLocal.current,{role:"user" as const,content},{role:"assistant" as const,content:respuesta}].slice(-20);
      } else respuesta=await enviarMensajeIa(content, fuentes);
      setMessages((prev) => [
        ...prev,
        propio,
        { id: `ai-${Date.now()}`, role: "ai", content: aHtmlSeguro(respuesta) },
      ]);
      return true;
    } catch (fallo) {
      setErrorEnvio(
        fallo instanceof Error && fallo.name==="AbortError" ? "Consulta cancelada." : fallo instanceof Error ? fallo.message : "No se pudo obtener la respuesta."
      );
      return false;
    } finally {
      controladorLocal.current=null;
      setPensando(false);
    }
  };

  const handleCancelar = async () => {
    if(modoConsulta==="dispositivo"){controladorLocal.current?.abort();return;}
    try { await cancelarMensajeIa(); } catch { setErrorEnvio("No se pudo cancelar la consulta."); }
  };

  const handleBorrar = async () => {
    setMenuAbierto(false);
    if(modoConsulta==="dispositivo"){historialLocal.current=[];setMessages([]);return;}
    try {
      await borrarHistorialIa();
      setMessages([]);
    } catch {
      setErrorEnvio("No se pudo borrar la conversación.");
    }
  };

  if (!usuario) return null;

  const noConfigurada = estado && !estado.configurada;

  const mensajesVista: Message[] =
    messages.length === 0
      ? [
          {
            id: "bienvenida",
            role: "ai",
            content: aHtmlSeguro(
              `¡Hola ${usuario.nombre.split(" ")[0]}! Soy tu tutor de NEXO. ` +
                "Preguntame lo que quieras: te explico conceptos, te doy ejercicios y te " +
                "ayudo a organizar el estudio. No hago la tarea por vos, pero te guío para que la resuelvas."
            ),
          },
        ]
      : messages;

  return (
    <div className="flex bg-fondo h-screen">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col h-full relative">
        <TopBar
          title="Asistencia académica"
          subtitle={modoConsulta==="dispositivo"?`Tutor NEXO · este dispositivo · ${modeloDispositivo||"sin modelo"}`:estado ? `Tutor NEXO · ${estado.modo === "institucional" ? "red institucional" : "servidor local"} · ${estado.modelo}` : "Tutor NEXO"}
          onHelpClick={() => setFaqAbierto(true)}
          onMenuClick={() => setMenuAbierto((v) => !v)}
        />

        {/* Menú de tres puntos — ahora hace algo real (Error 2.G.2) */}
        {menuAbierto && (
          <div className="absolute right-6 top-16 z-50 bg-lienzo border border-linea rounded-xl shadow-xl py-1 w-56">
            <button
              onClick={handleBorrar}
              className="w-full text-left px-4 py-2.5 text-sm text-red-300 hover:bg-white/5 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              Borrar conversación
            </button>
          </div>
        )}

        {modoConsulta === "institucional" && noConfigurada && (
          <div className="mx-6 mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-200 flex items-start gap-2">
            <span className="material-symbols-outlined text-base">info</span>
            <span>
              La asistencia todavía no está configurada para esta institución.
            </span>
          </div>
        )}

        <ChatContainer messages={mensajesVista} />

        {/* Las opciones de la consulta, alineadas con el cuadro para escribir. */}
        <div className="mx-auto w-full max-w-3xl space-y-2 px-4 pb-2 text-xs text-on-surface-variant sm:px-6">
          <label className="flex flex-wrap items-center gap-2"><span className="font-medium text-on-surface">Dónde ejecutar la IA</span>
            <Selector value={modoConsulta} disabled={pensando} onChange={e=>cambiarModo(e.target.value as "institucional"|"dispositivo")} className="nx-campo !h-8 !w-auto !py-0 !text-xs"><option value="institucional">Servidor privado institucional</option><option value="dispositivo">Este dispositivo</option></Selector>
          </label>
          {modoConsulta==="dispositivo"?<><p role="status">{estadoDispositivo}</p>{modelosDispositivo.length>0&&<label>Modelo local <Selector value={modeloDispositivo} onChange={e=>setModeloDispositivo(e.target.value)} className="nx-campo !h-8 !w-auto !py-0 !text-xs">{modelosDispositivo.map(m=><option key={m} value={m}>{m}</option>)}</Selector></label>}<p>En este modo NEXO sólo entrega las fuentes elegidas; pregunta, respuesta e historial no se guardan en el servidor. Al cerrar esta pestaña se pierde la conversación.</p></>:<p>Modelo seleccionado: {estado?.modelo ?? "—"}. {modelos.length ? `Instalados: ${modelos.join(", ")}` : "Servicio de modelos no disponible."}</p>}
          <details>
            <summary className="cursor-pointer font-medium text-on-surface">Fuentes para esta consulta ({fuentes.length})</summary>
            <input aria-label="Buscar fuentes" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar tareas, biblioteca, documentos o lecciones" className="nx-campo mt-2 w-full !text-xs" />
            <div className="mt-1 max-h-28 overflow-auto rounded-lg border border-linea">
              {fuentesDisponibles.map(f => {
                const elegido = fuentes.some(x => x.tipo === f.tipo && x.id === f.id);
                return <label key={`${f.tipo}-${f.id}`} className="flex gap-2 p-1">
                  <input type="checkbox" checked={elegido} disabled={!elegido && fuentes.length >= 8}
                    onChange={() => setFuentes(prev => elegido
                      ? prev.filter(x => x.tipo !== f.tipo || x.id !== f.id) : [...prev,f])} />
                  {{tarea:'Tarea',biblioteca:'Biblioteca',documento:'Documento',leccion:'Lección',proyecto:'Proyecto'}[f.tipo]}: {f.titulo}
                </label>;
              })}
            </div>
          </details>
        </div>

        {pensando && (
          <p className="px-8 pb-2 text-xs text-slate-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            El tutor está generando una respuesta…
            <button type="button" onClick={handleCancelar} className="underline ml-2">Cancelar</button>
          </p>
        )}
        {errorEnvio && <p className="px-8 pb-2 text-xs text-error">{errorEnvio}</p>}

        <MessageInput onSendMessage={handleSendMessage} pensando={pensando} disabled={modoConsulta === "dispositivo" ? !modeloDispositivo : !estado || !!noConfigurada} />

        {/* FAQ / ayuda — ahora abre contenido real (Error 2.G.2) */}
        {faqAbierto && (
          <div
            className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
            onClick={() => setFaqAbierto(false)}
          >
            <div
              className="bg-lienzo border border-linea rounded-2xl p-6 max-w-lg w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">Ayuda de la Asistencia IA</h2>
                <button onClick={() => setFaqAbierto(false)} className="text-slate-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <p><strong className="text-white">¿Qué puede hacer?</strong> Explicarte conceptos, darte ejercicios y ayudarte a organizar el estudio.</p>
                <p><strong className="text-white">¿Hace la tarea por mí?</strong> No. Está pensada para guiarte a que la resuelvas vos; si le pedís que la haga entera, te propone un plan.</p>
                <p><strong className="text-white">¿Guarda lo que escribo?</strong> El modo institucional guarda la conversación en tu cuenta. El modo de este dispositivo la conserva sólo en la memoria de esta pestaña.</p>
                <p><strong className="text-white">¿De dónde salen las respuestas?</strong> De un modelo en el servidor privado o de Ollama instalado en tu equipo. Podés elegir fuentes autorizadas para dar contexto.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
