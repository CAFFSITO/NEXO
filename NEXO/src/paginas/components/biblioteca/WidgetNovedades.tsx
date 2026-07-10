interface WidgetNovedadesProps {
  cantidad: number;
  onVerNovedades: () => void;
}

// Widget destacado: recursos nuevos de la semana.
export default function WidgetNovedades({ cantidad, onVerNovedades }: WidgetNovedadesProps) {
  return (
    <div className="bg-gradient-to-br from-fuchsia-600 to-indigo-800 rounded-[16px] p-6 text-white overflow-hidden relative group">
      <div className="relative z-10">
        <h4 className="font-headline font-bold text-sm mb-6 opacity-80 uppercase tracking-widest">
          Nuevos esta semana
        </h4>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-6xl font-black tracking-tighter">{cantidad}</span>
          <span className="text-xl font-bold opacity-60">Recursos</span>
        </div>
        <p className="text-sm opacity-90 mb-6 font-medium">
          ¡Explorá el nuevo contenido subido por profes y alumnos!
        </p>
        <button
          onClick={onVerNovedades}
          className="w-full bg-white text-indigo-900 font-bold py-3 rounded-full text-sm shadow-xl hover:scale-[1.02] transition-transform active:scale-95"
        >
          Ver Novedades
        </button>
      </div>

      {/* Círculo decorativo */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
    </div>
  );
}
