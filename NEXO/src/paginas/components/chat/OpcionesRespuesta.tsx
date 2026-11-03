export default function OpcionesRespuesta({ onElegir, disabled = false }: { onElegir: (texto: string) => void; disabled?: boolean }) {
  return <div className="flex flex-wrap gap-2" role="group" aria-label="Respuestas rápidas">
    {["Hecho", "No", "Sí", "Recibido"].map((texto) => <button key={texto} type="button" disabled={disabled}
      className="px-3 py-2 rounded-xl border border-current/20 text-sm font-bold hover:bg-white/10 disabled:opacity-40"
      onClick={() => onElegir(texto)}>{texto}</button>)}
  </div>;
}
