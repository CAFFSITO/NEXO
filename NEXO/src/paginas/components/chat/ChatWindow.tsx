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
  onSendMessage?: (mensaje: string) => void;
}

export default function ChatWindow({
  nombreContacto,
  avatarUrl,
  messages,
  onSendMessage,
}: ChatWindowProps) {
  const [mensaje, setMensaje] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = () => {
    if (mensaje.trim()) {
      onSendMessage?.(mensaje);
      setMensaje("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
          <div>
            <h2 className="font-bold text-white">{nombreContacto}</h2>
            <p className="text-xs text-gray-400">En línea</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-[#2D1B4E] rounded-full text-gray-400 transition-colors">
            <span className="material-symbols-outlined">call</span>
          </button>
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

      {/* Input */}
      <div className="bg-[#1C1030] border-t border-[#3b2f50] p-4">
        <div className="flex items-end gap-2">
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-[#2D1B4E] text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 border border-[#3b2f50] placeholder-gray-500"
          />
          <button className="p-2 hover:bg-[#2D1B4E] rounded-lg text-gray-400 transition-colors">
            <span className="material-symbols-outlined">attach_file</span>
          </button>
          <button
            onClick={handleSend}
            className="p-3 bg-primary hover:bg-[#d15aff] text-white rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              send
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
