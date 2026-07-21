import { useEffect, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import ChatContainer from "./components/asistencia-ia/ChatContainer";
import MessageInput from "./components/asistencia-ia/MessageInput";
import {
  traerHistorialIa,
  enviarMensajeIa,
  borrarHistorialIa,
  usarEstadoIa,
} from "../servicios/asistenciaIa";

// Asistencia IA real (sección 14.16, Errores 2.G.1 y 2.G.2). Ya no hay respuesta
// fija: el servidor arma el pedido con el system prompt de config_ia + la
// conversación y llama al proveedor gratuito. La clave vive en el servidor.

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
  const { estado } = usarEstadoIa();

  const [messages, setMessages] = useState<Message[]>([]);
  const [pensando, setPensando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [faqAbierto, setFaqAbierto] = useState(false);

  // Cargar el historial real al entrar.
  useEffect(() => {
    let vigente = true;
    traerHistorialIa()
      .then((hist) => {
        if (!vigente) return;
        setMessages(
          hist.map((m) => ({
            id: m.id,
            role: m.rol,
            content: aHtmlSeguro(m.contenido),
          }))
        );
      })
      .catch(() => {
        /* si falla, se queda vacío: el banner de estado explica */
      });
    return () => {
      vigente = false;
    };
  }, []);

  const handleSendMessage = async (content: string) => {
    setErrorEnvio("");
    const propio: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: aHtmlSeguro(content),
    };
    setMessages((prev) => [...prev, propio]);
    setPensando(true);
    try {
      const respuesta = await enviarMensajeIa(content);
      setMessages((prev) => [
        ...prev,
        { id: `ai-${Date.now()}`, role: "ai", content: aHtmlSeguro(respuesta) },
      ]);
    } catch (fallo) {
      setErrorEnvio(
        fallo instanceof Error ? fallo.message : "No se pudo obtener la respuesta."
      );
    } finally {
      setPensando(false);
    }
  };

  const handleBorrar = async () => {
    setMenuAbierto(false);
    try {
      await borrarHistorialIa();
      setMessages([]);
    } catch {
      setErrorEnvio("No se pudo borrar la conversación.");
    }
  };

  if (!usuario) return null;

  const claveFalta = estado && (!estado.configurada || !estado.clavePresente);

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
    <div className="flex bg-[#1C1030] h-screen">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col h-full relative">
        <TopBar
          title="Asistencia Académica"
          subtitle={estado?.proveedor ? `Tutor NEXO · ${estado.proveedor}` : "Tutor NEXO"}
          onHelpClick={() => setFaqAbierto(true)}
          onMenuClick={() => setMenuAbierto((v) => !v)}
        />

        {/* Menú de tres puntos — ahora hace algo real (Error 2.G.2) */}
        {menuAbierto && (
          <div className="absolute right-6 top-16 z-50 bg-[#2D1B4E] border border-purple-800/40 rounded-xl shadow-xl py-1 w-56">
            <button
              onClick={handleBorrar}
              className="w-full text-left px-4 py-2.5 text-sm text-red-300 hover:bg-white/5 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              Borrar conversación
            </button>
          </div>
        )}

        {claveFalta && (
          <div className="mx-6 mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-200 flex items-start gap-2">
            <span className="material-symbols-outlined text-base">info</span>
            <span>
              La asistencia todavía no está lista para responder: falta cargar la clave
              del proveedor de IA en el servidor (variable de entorno{" "}
              <code>NEXO_IA_CLAVE</code>). Avisale a quien administra NEXO.
            </span>
          </div>
        )}

        <ChatContainer messages={mensajesVista} />

        {pensando && (
          <p className="px-8 pb-2 text-xs text-slate-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            El tutor está pensando…
          </p>
        )}
        {errorEnvio && <p className="px-8 pb-2 text-xs text-error">{errorEnvio}</p>}

        <MessageInput onSendMessage={handleSendMessage} />

        {/* FAQ / ayuda — ahora abre contenido real (Error 2.G.2) */}
        {faqAbierto && (
          <div
            className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
            onClick={() => setFaqAbierto(false)}
          >
            <div
              className="bg-[#2D1B4E] border border-purple-800/40 rounded-2xl p-6 max-w-lg w-full space-y-4"
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
                <p><strong className="text-white">¿Guarda lo que escribo?</strong> Sí, tu conversación queda en tu cuenta. Podés borrarla desde el menú de los tres puntos.</p>
                <p><strong className="text-white">¿De dónde salen las respuestas?</strong> De un proveedor de IA; la clave de acceso vive en el servidor, nunca en tu navegador.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
