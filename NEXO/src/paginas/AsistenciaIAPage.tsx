import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import ChatContainer from "./components/asistencia-ia/ChatContainer";
import MessageInput from "./components/asistencia-ia/MessageInput";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "ai",
    content:
      "¡Hola Julieta! Soy tu asistente NEXO. ¿En qué te puedo ayudar hoy? Puedo explicarte conceptos, darte ejercicios de práctica, ayudarte a organizar tus tareas o revisar tus textos.",
  },
  {
    id: "2",
    role: "user",
    content: "No entiendo cómo funciona el discriminante en la fórmula cuadrática",
  },
  {
    id: "3",
    role: "ai",
    content: `¡Claro! El <strong class="text-primary">discriminante</strong> es la parte de la fórmula cuadrática que está dentro de la raíz cuadrada. Se representa con el símbolo griego Delta (<strong class="text-primary">Δ</strong>).<br><br>
<div class="bg-surface-container-low p-4 rounded-xl border border-primary/20 flex flex-col items-center justify-center my-4">
  <p class="text-primary font-headline text-2xl font-black tracking-widest">Δ = b² - 4ac</p>
</div>
<div class="space-y-4">
  <p class="font-headline font-bold text-sm text-primary uppercase tracking-wider">¿Qué nos dice el discriminante?</p>
  <div class="grid grid-cols-1 gap-3">
    <div class="flex items-start gap-3 bg-background/50 p-3 rounded-lg border border-white/5">
      <div class="w-6 h-6 rounded bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">1</div>
      <p class="text-sm">Si <strong class="text-white">Δ &gt; 0</strong>: La ecuación tiene <span class="text-green-400 font-medium">2 soluciones reales</span> distintas.</p>
    </div>
    <div class="flex items-start gap-3 bg-background/50 p-3 rounded-lg border border-white/5">
      <div class="w-6 h-6 rounded bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs font-bold">2</div>
      <p class="text-sm">Si <strong class="text-white">Δ = 0</strong>: La ecuación tiene <span class="text-yellow-400 font-medium">1 solución real</span> única (repetida).</p>
    </div>
    <div class="flex items-start gap-3 bg-background/50 p-3 rounded-lg border border-white/5">
      <div class="w-6 h-6 rounded bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">3</div>
      <p class="text-sm">Si <strong class="text-white">Δ &lt; 0</strong>: La ecuación <span class="text-red-400 font-medium">no tiene soluciones reales</span> (son complejas).</p>
    </div>
  </div>
</div>
<div class="pt-2 border-t border-white/5">
  <p class="text-xs text-gray-400 italic">Ejemplo: Para x² + 5x + 6 = 0</p>
  <p class="text-sm mt-1">Δ = 5² - 4(1)(6) = 25 - 24 = 1. Como 1 &gt; 0, tiene 2 soluciones reales.</p>
</div>`,
  },
];

export default function AsistenciaIAPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [usuario] = useState({
    nombre: "Julieta Smith",
    rol: "estudiante" as const,
    avatarUrl:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Julieta",
  });

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };
    setMessages([...messages, newMessage]);

    // Simular respuesta del AI (en la implementación real, llamar a la API)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Entiendo tu pregunta. Esa es una excelente observación. Permíteme ayudarte con eso...",
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();

  return (
    <div className="flex bg-[#1C1030] h-screen">
      <Sidebar
        usuario={usuario}
        rutaActiva="/asistencia-academica"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col h-full">
        <TopBar
          title="Asistencia Académica"
          subtitle="Nexus AI 2.0"
          onHelpClick={() => console.log("Help")}
          onMenuClick={() => console.log("Menu")}
        />

        <ChatContainer messages={messages} />

        <MessageInput onSendMessage={handleSendMessage} />
      </main>
    </div>
  );
}
