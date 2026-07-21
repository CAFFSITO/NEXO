import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  sender: "user" | "other";
  contenido: string;
  timestamp: string;
}

interface ChatWindowProps {
  nombreContacto: string;
  avatarUrl?: string;
  messages: Message[];
  /** Enviar. Puede llevar un archivo adjunto (Error 2.F.3). Solo lectura si falta. */
  onSendMessage?: (mensaje: string, archivo?: File | null) => void;
  /** Modo moderación (preceptor): se lee el hilo pero no se escribe (Error 7.A.3). */
  soloLectura?: boolean;
}

export default function ChatWindow({
  nombreContacto,
  avatarUrl,
  messages,
  onSendMessage,
  soloLectura = false,
}: ChatWindowProps) {
  const [mensaje, setMensaje] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = async () => {
    if (enviando) return;
    if (!mensaje.trim() && !archivo) return;
    setEnviando(true);
    try {
      await onSendMessage?.(mensaje, archivo);
      setMensaje("");
      setArchivo(null);
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#190d2d]">
      {/* Header */}
      <div className="bg-[#1C1030] border-b border-[#3b2f50] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt={nombreContacto} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">{nombreContacto.charAt(0)}</span>
            )}
          </div>
          {/* Antes decía "En línea" siempre: no hay estado de presencia real
              detrás, así que se saca en vez de afirmar algo que no se sabe. */}
          <div>
            <h2 className="font-bold text-white">{nombreContacto}</h2>
          </div>
        </div>
        {/* El botón de "llamar" (teléfono) se elimina: no corresponde a la
            funcionalidad del chat de la plataforma (Error 2.F.2). */}
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-[#2D1B4E] rounded-full text-gray-400 transition-colors">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No hay mensajes aún. ¡Comienza la conversación!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.sender === "user"
                    ? "bg-primary text-white rounded-br-none"
                    : "bg-[#2D1B4E] text-gray-300 rounded-bl-none border border-[#3b2f50]"
                }`}
              >
                <p className="break-words text-sm">{msg.contenido}</p>
                <span className="text-xs opacity-70 mt-1 block">{msg.timestamp}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input. En moderación (preceptor) el hilo se lee pero no se escribe. */}
      {soloLectura ? (
        <div className="bg-[#1C1030] border-t border-[#3b2f50] p-4 text-center text-xs text-gray-500">
          Estás moderando esta conversación (solo lectura).
        </div>
      ) : (
        <div className="bg-[#1C1030] border-t border-[#3b2f50] p-4">
          {/* Adjunto elegido: se muestra antes de enviar, con opción de quitarlo. */}
          {archivo && (
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-300 bg-[#2D1B4E] rounded-lg px-3 py-2 w-fit">
              <span className="material-symbols-outlined text-base">attach_file</span>
              <span className="truncate max-w-[240px]">{archivo.name}</span>
              <button
                onClick={() => setArchivo(null)}
                className="text-gray-400 hover:text-red-400"
                aria-label="Quitar adjunto"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={enviando}
              className="flex-1 bg-[#2D1B4E] text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 border border-[#3b2f50] placeholder-gray-500 disabled:opacity-60"
            />
            {/* El clip ahora abre el selector de archivos de verdad (Error 2.F.3). */}
            <input
              ref={inputArchivo}
              type="file"
              className="hidden"
              onChange={(e) => {
                setArchivo(e.target.files?.[0] ?? null);
                e.target.value = ""; // permite volver a elegir el mismo archivo
              }}
            />
            <button
              onClick={() => inputArchivo.current?.click()}
              className="p-2 hover:bg-[#2D1B4E] rounded-lg text-gray-400 transition-colors"
              aria-label="Adjuntar archivo"
            >
              <span className="material-symbols-outlined">attach_file</span>
            </button>
            <button
              onClick={handleSend}
              disabled={enviando}
              className="p-3 bg-primary hover:bg-[#d15aff] text-white rounded-lg transition-colors disabled:opacity-60"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                send
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
