interface TendenciaCardProps {
  titulo: string;
  categoria: string;
  visualizaciones: number;
  tipo: "debate" | "articulo" | "video" | "recurso";
  icono: string;
  activo?: boolean;
  onVerMas?: () => void;
}

export default function TendenciaCard({
  titulo,
  categoria,
  visualizaciones,
  tipo,
  icono,
  activo,
  onVerMas,
}: TendenciaCardProps) {
  const tipoColor = {
    debate: "bg-blue-500/20 text-blue-400",
    articulo: "bg-purple-500/20 text-purple-400",
    video: "bg-red-500/20 text-red-400",
    recurso: "bg-green-500/20 text-green-400",
  };

  return (
    <button
      onClick={onVerMas}
      className="group w-full text-left bg-[#2D1B4E] border border-[#3b2f50] hover:border-primary/30 transition-all p-6 rounded-lg space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-12 h-12 bg-[#1C1030] rounded-lg flex items-center justify-center text-[#C548F5] group-hover:scale-110 transition-transform flex-shrink-0">
            <span className="material-symbols-outlined">{icono}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white group-hover:text-primary transition-colors line-clamp-2">
              {titulo}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${tipoColor[tipo]}`}>
                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </span>
              <span className="text-xs text-gray-500">{categoria}</span>
            </div>
          </div>
        </div>
        {activo && (
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-400 font-bold">EN VIVO</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="material-symbols-outlined text-sm">visibility</span>
        <span>{visualizaciones.toLocaleString("es-AR")} visualizaciones</span>
      </div>
    </button>
  );
}
