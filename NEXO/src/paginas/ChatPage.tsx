import { useState } from "react";
import Sidebar, { type Rol } from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import ConversationList from "./components/chat/ConversationList";
import ChatWindow from "./components/chat/ChatWindow";

interface Message {
  id: string;
  sender: "user" | "other";
  contenido: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  nombre: string;
  ultimoMensaje: string;
  timestamp: string;
  avatarUrl?: string;
  noLeidos?: number;
  messages: Message[];
}

// Contactos de chat según el rol logueado: cada perfil conversa con su
// círculo real (el estudiante con compañeros y su profe; el profe con
// alumnos y dirección; el preceptor con familias; etc.).
const CONVERSACIONES_ESTUDIANTE: Conversation[] = [
  {
    id: "1",
    nombre: "Martín López",
    ultimoMensaje: "¿Ya entendiste de la tarea de Historia?",
    timestamp: "14:30",
    noLeidos: 2,
    messages: [
      { id: "m1", sender: "other", contenido: "Hola, ¿cómo estás?", timestamp: "13:45" },
      { id: "m2", sender: "user", contenido: "Bien, ¿y vos?", timestamp: "13:46" },
      { id: "m3", sender: "other", contenido: "¿Ya entendiste de la tarea de Historia?", timestamp: "14:30" },
    ],
  },
  {
    id: "2",
    nombre: "Sofia Chen",
    ultimoMensaje: "Te paso los apuntes",
    timestamp: "12:15",
    messages: [{ id: "m4", sender: "other", contenido: "Te paso los apuntes", timestamp: "12:15" }],
  },
  {
    id: "3",
    nombre: "Prof. García",
    ultimoMensaje: "Cualquier duda, consultame",
    timestamp: "11:00",
    messages: [
      { id: "m5", sender: "other", contenido: "Hola, tengo una duda sobre el material", timestamp: "10:45" },
      { id: "m6", sender: "user", contenido: "¿Cuál es tu pregunta?", timestamp: "10:46" },
      { id: "m7", sender: "other", contenido: "Cualquier duda, consultame", timestamp: "11:00" },
    ],
  },
];

const CONVERSACIONES_PROFESOR: Conversation[] = [
  {
    id: "1",
    nombre: "Julieta Rossi — 4° B",
    ultimoMensaje: "Profe, ¿puedo entregar mañana?",
    timestamp: "15:10",
    noLeidos: 1,
    messages: [
      { id: "m1", sender: "other", contenido: "Profe, ¿puedo entregar mañana?", timestamp: "15:10" },
    ],
  },
  {
    id: "2",
    nombre: "Martín López — 4° B",
    ultimoMensaje: "Gracias por la devolución",
    timestamp: "12:40",
    messages: [{ id: "m2", sender: "other", contenido: "Gracias por la devolución", timestamp: "12:40" }],
  },
  {
    id: "3",
    nombre: "Dirección Académica",
    ultimoMensaje: "Recordá cargar el parte de clase",
    timestamp: "09:30",
    messages: [{ id: "m3", sender: "other", contenido: "Recordá cargar el parte de clase", timestamp: "09:30" }],
  },
];

const CONVERSACIONES_PRECEPTOR: Conversation[] = [
  {
    id: "1",
    nombre: "Fam. Rossi",
    ultimoMensaje: "Buenas, consulta por la inasistencia",
    timestamp: "13:20",
    noLeidos: 3,
    messages: [{ id: "m1", sender: "other", contenido: "Buenas, consulta por la inasistencia", timestamp: "13:20" }],
  },
  {
    id: "2",
    nombre: "Dirección Académica",
    ultimoMensaje: "Pasame el listado de 4° A",
    timestamp: "10:05",
    messages: [{ id: "m2", sender: "other", contenido: "Pasame el listado de 4° A", timestamp: "10:05" }],
  },
];

const CONVERSACIONES_BIBLIOTECARIO: Conversation[] = [
  {
    id: "1",
    nombre: "Prof. Méndez",
    ultimoMensaje: "¿Aprobaste el recurso que presenté?",
    timestamp: "11:50",
    noLeidos: 1,
    messages: [{ id: "m1", sender: "other", contenido: "¿Aprobaste el recurso que presenté?", timestamp: "11:50" }],
  },
  {
    id: "2",
    nombre: "Dirección Académica",
    ultimoMensaje: "Sumá el reglamento 2025 a Institucional",
    timestamp: "09:15",
    messages: [{ id: "m2", sender: "other", contenido: "Sumá el reglamento 2025 a Institucional", timestamp: "09:15" }],
  },
];

const CONVERSACIONES_FAMILIA: Conversation[] = [
  {
    id: "1",
    nombre: "Preceptor Carlos Pereyra",
    ultimoMensaje: "Buenas, le confirmo la reunión",
    timestamp: "14:00",
    noLeidos: 1,
    messages: [{ id: "m1", sender: "other", contenido: "Buenas, le confirmo la reunión", timestamp: "14:00" }],
  },
  {
    id: "2",
    nombre: "Dirección Académica",
    ultimoMensaje: "Circular de la reunión de padres",
    timestamp: "08:45",
    messages: [{ id: "m2", sender: "other", contenido: "Circular de la reunión de padres", timestamp: "08:45" }],
  },
];

const CONVERSACIONES_POR_ROL: Partial<Record<Rol, Conversation[]>> = {
  estudiante: CONVERSACIONES_ESTUDIANTE,
  profesor: CONVERSACIONES_PROFESOR,
  preceptor: CONVERSACIONES_PRECEPTOR,
  bibliotecario: CONVERSACIONES_BIBLIOTECARIO,
  familia: CONVERSACIONES_FAMILIA,
};

export default function ChatPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const rol: Rol = usuario?.rol ?? "estudiante";

  const [conversaciones, setConversaciones] = useState<Conversation[]>(
    () => CONVERSACIONES_POR_ROL[rol] ?? CONVERSACIONES_ESTUDIANTE
  );
  const [conversacionActiva, setConversacionActiva] = useState<string>("1");

  const convActual = conversaciones.find((c) => c.id === conversacionActiva);

  const handleSendMessage = (mensaje: string) => {
    setConversaciones((prev) =>
      prev.map((conv) => {
        if (conv.id === conversacionActiva) {
          return {
            ...conv,
            messages: [
              ...conv.messages,
              {
                id: Date.now().toString(),
                sender: "user",
                contenido: mensaje,
                timestamp: new Date().toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ],
            ultimoMensaje: mensaje,
            noLeidos: 0,
          };
        }
        return conv;
      })
    );
  };

  return (
    <div className="flex bg-[#1C1030] h-screen">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
        rutaActiva="/chat"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <div className="ml-[220px] w-[calc(100%-220px)] flex h-full">
        <ConversationList
          conversaciones={conversaciones}
          conversacionActiva={conversacionActiva}
          onSelectConversacion={setConversacionActiva}
        />

        {convActual && (
          <ChatWindow
            nombreContacto={convActual.nombre}
            avatarUrl={convActual.avatarUrl}
            messages={convActual.messages}
            onSendMessage={handleSendMessage}
          />
        )}
      </div>
    </div>
  );
}
