interface OpcionVoto {
  id: string;
  texto: string;
  porcentaje: number;
  votos: number;
}

interface DebateCardProps {
  titulo: string;
  descripcion: string;
  autor: string;
  avatarUrl?: string;
  opciones: OpcionVoto[];
  totalVotos: number;
  miVoto?: string;
  onVotar?: (opcionId: string) => void;
}

export default function DebateCard({
  titulo,
  descripcion,
  autor,
  avatarUrl,
  opciones,
  totalVotos,
  miVoto,
  onVotar,
}: DebateCardProps) {
  return (
    <div className="bg-[#2D1B4E] border border-[#3b2f50] hover:border-primary/30 transition-all p-6 rounded-lg space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt={autor} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-white">{autor.charAt(0)}</span>
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{autor}</p>
          <p className="text-xs text-gray-500">Debate abierto</p>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-white text-lg mb-2">{titulo}</h3>
        <p className="text-gray-300 text-sm">{descripcion}</p>
      </div>

      <div className="space-y-3">
        {opciones.map((opcion) => (
          <button
            key={opcion.id}
            onClick={() => onVotar?.(opcion.id)}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              miVoto === opcion.id
                ? "bg-primary/20 border-primary"
                : "bg-[#1C1030] border-[#3b2f50] hover:border-primary/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">{opcion.texto}</span>
              <span className="text-xs text-gray-400">{opcion.porcentaje}%</span>
            </div>
            <div className="w-full bg-[#3b2f50] rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-[#d15aff]"
                style={{ width: `${opcion.porcentaje}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{opcion.votos} votos</p>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 text-center">{totalVotos} votos totales</p>
    </div>
  );
}
