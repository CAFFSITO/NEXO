interface Conversation {
  id: string;
  nombre: string;
  ultimoMensaje: string;
  timestamp: string;
  avatarUrl?: string;
  noLeidos?: number;
}

interface ConversationListProps {
  conversaciones: Conversation[];
  conversacionActiva?: string;
  onSelectConversacion?: (id: string) => void;
}

export default function ConversationList({
  conversaciones,
  conversacionActiva,
  onSelectConversacion,
}: ConversationListProps) {
  return (
    <div className="w-64 border-r border-[#3b2f50] overflow-y-auto bg-[#1C1030] h-full">
      <div className="p-4 border-b border-[#3b2f50]">
        <h2 className="font-headline font-bold text-white mb-4">Mensajes</h2>
        <input
          type="text"
          placeholder="Buscar conversación..."
          className="w-full bg-[#2D1B4E] text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 border border-[#3b2f50] placeholder-gray-500"
        />
      </div>

      <div className="space-y-1 p-2">
        {conversaciones.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversacion?.(conv.id)}
            className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 ${
              conversacionActiva === conv.id
                ? "bg-primary/20 border-l-4 border-primary"
                : "hover:bg-[#2D1B4E]/50"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center flex-shrink-0">
              {conv.avatarUrl ? (
                <img src={conv.avatarUrl} alt={conv.nombre} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">{conv.nombre.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate">{conv.nombre}</p>
              <p className="text-xs text-gray-400 truncate">{conv.ultimoMensaje}</p>
            </div>
            {conv.noLeidos && conv.noLeidos > 0 && (
              <span className="bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                {conv.noLeidos}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
