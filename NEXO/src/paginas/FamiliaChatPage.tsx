import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import ListaConversacionesFamilia from "./components/familia-chat/ListaConversacionesFamilia";
import VentanaChatFamilia from "./components/familia-chat/VentanaChatFamilia";
import type { ConversacionFamilia } from "./components/familia-chat/tipos";
import { useNavegacion } from "../navegacion";

// Hora actual en formato "10:45 AM" (es-AR, 12h)
const horaActual = () =>
  new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const CONVERSACIONES_INICIALES: ConversacionFamilia[] = [
  {
    id: "direccion",
    nombre: "Dirección Académica",
    ultimoMensaje: "Hola Fam. Rossi, recibimos su consulta...",
    hora: "10:45 AM",
    enLinea: true,
    icono: "school",
    noLeidos: 0,
    mensajes: [
      {
        id: "m1",
        emisor: "contacto",
        contenido:
          "Hola Fam. Rossi, recibimos su consulta sobre el acto del 25 de mayo. El horario de ingreso para familias es a las 09:30 hs.",
        hora: "10:42 AM",
      },
      {
        id: "m2",
        emisor: "familia",
        contenido:
          "Perfecto, muchas gracias por la información. ¿El ingreso es por la puerta principal?",
        hora: "10:45 AM",
      },
      {
        id: "m3",
        emisor: "contacto",
        contenido: "Exacto, por la entrada principal de la calle San Martín.",
        hora: "10:46 AM",
      },
    ],
  },
  {
    id: "preceptor",
    nombre: "Preceptor Carlos Pereyra",
    ultimoMensaje: "Quedo a disposición.",
    hora: "Ayer",
    enLinea: false,
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Carlos%20Pereyra",
    noLeidos: 0,
    mensajes: [
      {
        id: "m4",
        emisor: "contacto",
        contenido:
          "Buenas tardes. Le informo que Matías se retiró en horario con la autorización presentada.",
        hora: "16:20",
      },
      {
        id: "m5",
        emisor: "familia",
        contenido: "Muchas gracias por avisar, Carlos.",
        hora: "16:25",
      },
      {
        id: "m6",
        emisor: "contacto",
        contenido: "Quedo a disposición.",
        hora: "16:26",
      },
    ],
  },
  {
    id: "secretaria",
    nombre: "Secretaría",
    ultimoMensaje: "El comprobante fue validado.",
    hora: "Lun.",
    enLinea: false,
    icono: "corporate_fare",
    noLeidos: 0,
    mensajes: [
      {
        id: "m7",
        emisor: "familia",
        contenido: "Buenos días, adjunto el comprobante de pago de la cuota de mayo.",
        hora: "09:10",
      },
      {
        id: "m8",
        emisor: "contacto",
        contenido: "El comprobante fue validado. ¡Gracias!",
        hora: "09:32",
      },
    ],
  },
];

export default function FamiliaChatPage() {
  const [usuario] = useState({
    nombre: "Perfil Familia",
    rol: "familia" as const,
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Rossi",
  });

  const [conversaciones, setConversaciones] = useState<ConversacionFamilia[]>(
    CONVERSACIONES_INICIALES
  );
  const [conversacionActiva, setConversacionActiva] = useState<string>("direccion");

  const convActual = conversaciones.find((c) => c.id === conversacionActiva);

  // Al seleccionar una conversación, limpia el contador de no leídos
  const seleccionar = (id: string) => {
    setConversacionActiva(id);
    setConversaciones((prev) =>
      prev.map((c) => (c.id === id ? { ...c, noLeidos: 0 } : c))
    );
  };

  const enviarMensaje = (contenido: string) => {
    const hora = horaActual();
    setConversaciones((prev) =>
      prev.map((c) =>
        c.id === conversacionActiva
          ? {
              ...c,
              ultimoMensaje: contenido,
              hora,
              mensajes: [
                ...c.mensajes,
                { id: `${Date.now()}`, emisor: "familia", contenido, hora },
              ],
            }
          : c
      )
    );
  };

  const { navegar, cerrarSesion } = useNavegacion();

  return (
    <div className="flex bg-background text-on-background min-h-screen overflow-hidden">
      <Sidebar
        usuario={usuario}
        rutaActiva="/chat"
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <div className="ml-[220px] w-[calc(100%-220px)] flex flex-col h-screen">
        {/* Top App Bar */}
        <header className="h-16 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] flex justify-between items-center px-8 shrink-0">
          <span className="font-headline font-medium text-slate-300">Mensajería Directa</span>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-slate-300">
              <button
                aria-label="Notificaciones"
                className="hover:text-[#C548F5] transition-all duration-300"
              >
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button
                aria-label="Configuración"
                className="hover:text-[#C548F5] transition-all duration-300"
              >
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>
            <img
              src={usuario.avatarUrl}
              alt={usuario.nombre}
              className="w-8 h-8 rounded-full object-cover"
            />
          </div>
        </header>

        {/* Área principal: lista + ventana */}
        <main className="flex-1 flex overflow-hidden">
          <ListaConversacionesFamilia
            conversaciones={conversaciones}
            conversacionActiva={conversacionActiva}
            onSeleccionar={seleccionar}
          />

          {convActual ? (
            <VentanaChatFamilia conversacion={convActual} onEnviar={enviarMensaje} />
          ) : (
            <section className="flex-1 flex items-center justify-center bg-surface-container-lowest text-slate-500">
              Seleccioná una conversación
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
