// src/paginas/components/cursos/ReporteSemanalCard.tsx
// Tarjeta de acción para generar el reporte institucional semanal en PDF.

interface ReporteSemanalCardProps {
  highlights: string[];
  generando: boolean;
  onGenerarPDF: () => void;
}

export default function ReporteSemanalCard({
  highlights,
  generando,
  onGenerarPDF,
}: ReporteSemanalCardProps) {
  return (
    <div className="bg-gradient-to-br from-[#2D1B4E] to-[#4900a6] p-8 rounded-lg shadow-xl border border-primary/20">
      <span
        className="material-symbols-outlined text-primary-container text-4xl mb-4"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        analytics
      </span>
      <h3 className="text-xl font-bold text-white font-headline mb-2">Reporte Semanal</h3>
      <p className="text-primary-fixed/70 text-sm mb-6 leading-relaxed">
        Analiza el desempeño institucional, asistencias y objetivos cumplidos durante los últimos 7
        días.
      </p>

      <div className="space-y-4 mb-8">
        {highlights.map((item) => (
          <div key={item} className="flex items-center gap-3 text-white/90 text-sm">
            <span className="material-symbols-outlined text-primary-container">check_circle</span>
            {item}
          </div>
        ))}
      </div>

      <button
        onClick={onGenerarPDF}
        disabled={generando}
        className="w-full bg-white text-[#1C1030] font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-fixed transition-all active:scale-95 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined">
          {generando ? "progress_activity" : "picture_as_pdf"}
        </span>
        {generando ? "Generando…" : "Generar PDF"}
      </button>
    </div>
  );
}
