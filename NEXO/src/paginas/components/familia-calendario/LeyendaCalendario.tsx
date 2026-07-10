import { ORDEN_LEYENDA, PALETA_FAMILIA } from "./tipos";

// Pie de página con la leyenda de colores por tipo de evento.
export default function LeyendaCalendario() {
  return (
    <footer className="pt-8 border-t border-white/5 flex flex-wrap gap-6 justify-center">
      {ORDEN_LEYENDA.map((tipo) => (
        <div key={tipo} className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${PALETA_FAMILIA[tipo].dot}`} />
          <span className="text-xs font-medium text-gray-400">{PALETA_FAMILIA[tipo].label}</span>
        </div>
      ))}
    </footer>
  );
}
