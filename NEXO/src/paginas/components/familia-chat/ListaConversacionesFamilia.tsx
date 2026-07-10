import { useState } from "react";
import type { ConversacionFamilia } from "./tipos";

interface ListaConversacionesFamiliaProps {
  conversaciones: ConversacionFamilia[];
  conversacionActiva: string;
  onSeleccionar: (id: string) => void;
}

export default function ListaConversacionesFamilia({
  conversaciones,
  conversacionActiva,
  onSeleccionar,
}: ListaConversacionesFamiliaProps) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = conversaciones.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
  );

  return (
    <section className="w-80 lg:w-96 flex flex-col border-r border-[#2D1B4E] bg-surface-container-low/50">
      {/* Buscador */}
      <div className="p-6 border-b border-[#2D1B4E]">
        <h2 className="text-2xl font-bold font-headline text-on-surface mb-4">Mensajería</h2>
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#C548F5]">
            search
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar chats..."
            className="w-full bg-surface-container-high border-none rounded-full py-2.5 pl-10 pr-4 text-sm text-on-surface focus:ring-1 focus:ring-[#C548F5] placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {filtradas.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 text-center">Sin resultados.</p>
        ) : (
          filtradas.map((conv) => {
            const activa = conv.id === conversacionActiva;
            return (
              <button
                key={conv.id}
                onClick={() => onSeleccionar(conv.id)}
                className={`w-full text-left p-4 border-l-4 transition-colors cursor-pointer ${
                  activa
                    ? "bg-[#2D1B4E]/50 border-[#C548F5]"
                    : "hover:bg-surface-container-high border-transparent"
                }`}
              >
                <div className="flex gap-3">
                  {conv.avatarUrl ? (
                    <img
                      src={conv.avatarUrl}
                      alt={conv.nombre}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        activa
                          ? "bg-primary-container/20 text-[#C548F5]"
                          : "bg-surface-container-highest text-slate-400"
                      }`}
                    >
                      <span className="material-symbols-outlined">{conv.icono ?? "person"}</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-on-surface truncate text-sm">{conv.nombre}</h3>
                      <span
                        className={`text-[10px] font-semibold ${
                          activa ? "text-[#C548F5]" : "text-slate-500"
                        }`}
                      >
                        {conv.hora}
                      </span>
                    </div>
                    <p
                      className={`text-xs truncate ${
                        activa ? "text-on-surface-variant" : "text-slate-500"
                      }`}
                    >
                      {conv.ultimoMensaje}
                    </p>
                  </div>

                  {conv.noLeidos > 0 && (
                    <span className="bg-[#C548F5] text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center flex-shrink-0">
                      {conv.noLeidos}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
