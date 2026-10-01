import { Cargando, Fallo } from "../shared/EstadoCarga";

interface Conversation { id: string; nombre: string; ultimoMensaje: string; timestamp: string; avatarUrl?: string; noLeidos?: number; }
interface ConversationListProps {
  conversaciones: Conversation[];
  conversacionActiva?: string;
  onSelectConversacion?: (id: string) => void;
  busqueda: string;
  onBuscar: (texto: string) => void;
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onNueva?: () => void;
}

export default function ConversationList({ conversaciones, conversacionActiva, onSelectConversacion, busqueda, onBuscar, cargando, error, onReintentar, onNueva }: ConversationListProps) {
  return (
    <section className="w-full md:w-80 shrink-0 border-r border-white/10 overflow-y-auto bg-[#1C1030] h-full">
      <div className="p-5 border-b border-white/10 sticky top-0 bg-[#1C1030] z-10">
        <div className="flex items-center justify-between mb-5"><h1 className="text-xl font-headline font-bold text-white">Mensajes</h1>{onNueva && <button onClick={onNueva} aria-label="Nueva conversación" title="Nueva conversación" className="p-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25"><span className="material-symbols-outlined">edit_square</span></button>}</div>
        <div className="relative"><span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-lg">search</span><input aria-label="Buscar conversación" value={busqueda} onChange={(e) => onBuscar(e.target.value)} placeholder="Buscar conversación…" className="w-full bg-[#2D1B4E] text-white text-sm rounded-xl pl-10 pr-3 py-2.5 border border-white/10 placeholder-slate-500" /></div>
      </div>
      <div className="space-y-1 p-3">
        {cargando ? <Cargando que="tus conversaciones" /> : error ? <Fallo error={error} onReintentar={onReintentar} /> : conversaciones.length === 0 ? <div className="text-slate-400 text-sm text-center px-3 py-10"><span className="material-symbols-outlined text-3xl mb-3 text-primary/70">forum</span><p>{busqueda ? "No encontramos conversaciones con ese nombre." : "Tu próxima conversación empieza acá."}</p>{!busqueda && onNueva && <button onClick={onNueva} className="text-primary font-bold mt-4">Escribir un mensaje</button>}</div> : conversaciones.map((conv) => (
          <button key={conv.id} onClick={() => onSelectConversacion?.(conv.id)} aria-current={conversacionActiva === conv.id ? "true" : undefined} className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center gap-3 border ${conversacionActiva === conv.id ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-white/5"}`}>
            <div className="w-11 h-11 rounded-2xl bg-[#2D1B4E] text-primary flex items-center justify-center shrink-0">{conv.avatarUrl ? <img src={conv.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" /> : <span className="font-bold">{conv.nombre.charAt(0)}</span>}</div>
            <div className="flex-1 min-w-0"><div className="flex items-baseline gap-2 justify-between"><p className="font-bold text-white text-sm truncate">{conv.nombre}</p><span className="text-[10px] text-slate-500 shrink-0">{conv.timestamp}</span></div><p className="text-xs text-slate-400 truncate mt-1">{conv.ultimoMensaje || "Sin mensajes todavía"}</p></div>
            {(conv.noLeidos ?? 0) > 0 && <span className="bg-primary text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shrink-0" aria-label={`${conv.noLeidos} mensajes sin leer`}>{conv.noLeidos}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
