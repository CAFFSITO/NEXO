import { useEffect, useRef, useState } from "react";
import type { ConversacionFamilia } from "./tipos";

interface VentanaChatFamiliaProps {
  conversacion: ConversacionFamilia;
  onEnviar: (contenido: string) => void;
}

export default function VentanaChatFamilia({ conversacion, onEnviar }: VentanaChatFamiliaProps) {
  const [texto, setTexto] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversacion.mensajes]);

  const enviar = () => {
    if (!texto.trim()) return;
    onEnviar(texto.trim());
    setTexto("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <section className="flex-1 flex flex-col bg-surface-container-lowest relative">
      {/* Header del chat */}
      <header className="h-20 border-b border-[#2D1B4E] bg-surface/50 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {conversacion.avatarUrl ? (
            <img
              src={conversacion.avatarUrl}
              alt={conversacion.nombre}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#2D1B4E] flex items-center justify-center text-[#C548F5]">
              <span className="material-symbols-outlined">{conversacion.icono ?? "person"}</span>
            </div>
          )}
          <div>
            <h2 className="font-bold text-on-surface font-headline">{conversacion.nombre}</h2>
            <div className="flex items-center gap-1.5">
              {conversacion.enLinea ? (
                <>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-xs text-emerald-500 font-medium">En línea</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-slate-500 rounded-full" />
                  <span className="text-xs text-slate-500 font-medium">Desconectado</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Videollamada"
            className="p-2 hover:bg-surface-container rounded-full text-slate-300 hover:text-[#C548F5] transition-colors"
          >
            <span className="material-symbols-outlined">video_call</span>
          </button>
          <button
            aria-label="Más opciones"
            className="p-2 hover:bg-surface-container rounded-full text-slate-300 hover:text-[#C548F5] transition-colors"
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </header>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
        {/* Separador de fecha */}
        <div className="flex justify-center">
          <span className="px-3 py-1 rounded-full bg-surface-container text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Hoy
          </span>
        </div>

        {conversacion.mensajes.map((msg) => {
          const propio = msg.emisor === "familia";
          return (
            <div
              key={msg.id}
              className={`flex items-end gap-3 max-w-[80%] ${propio ? "self-end" : ""}`}
            >
              <div
                className={`flex-1 p-4 rounded-2xl text-sm leading-relaxed ${
                  propio
                    ? "bg-[#C548F5] text-white rounded-br-none shadow-lg shadow-[#C548F5]/10"
                    : "bg-[#2D1B4E] text-on-surface rounded-bl-none shadow-sm"
                }`}
              >
                {msg.contenido}
                <div
                  className={`text-[10px] mt-2 text-right ${
                    propio ? "text-white/80" : "text-slate-400"
                  }`}
                >
                  {msg.hora}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input tipo pill */}
      <div className="p-6 shrink-0">
        <div className="bg-surface-container-high rounded-full p-2 flex items-center gap-2 shadow-2xl">
          <button
            aria-label="Adjuntar archivo"
            className="p-2 text-slate-400 hover:text-[#C548F5] transition-colors"
          >
            <span className="material-symbols-outlined">attach_file</span>
          </button>
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribí un mensaje..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-slate-500 text-sm outline-none"
          />
          <button
            onClick={enviar}
            aria-label="Enviar"
            className="w-10 h-10 rounded-full bg-[#C548F5] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              send
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
