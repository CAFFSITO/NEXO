import { useState } from "react";

interface ModalDenunciaProps {
  onEnviar: (motivo: string) => Promise<void> | void;
  onCerrar: () => void;
}

// Recoge el motivo de una denuncia (14.4.4). El motivo viaja a `denuncias` y le
// aparece a quien modera. Una denuncia sin motivo no ayuda a decidir, así que se
// exige.
export default function ModalDenuncia({ onEnviar, onCerrar }: ModalDenunciaProps) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    if (!motivo.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      await onEnviar(motivo.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la denuncia.");
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-[#2D1B4E] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white font-headline flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-400">flag</span>
            Denunciar contenido
          </h3>
          <button onClick={onCerrar} className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-xs text-white/50 mb-3">
          Contanos qué está mal. Un moderador de tu escuela lo va a revisar.
        </p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          autoFocus
          rows={4}
          placeholder="Motivo de la denuncia…"
          className="w-full bg-[#1C1030] text-white rounded-lg px-4 py-3 text-sm border border-[#3b2f50] focus:ring-1 focus:ring-orange-400 placeholder-white/30 resize-none"
        />
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onCerrar}
            className="px-5 py-2 rounded-full text-sm font-bold text-white/60 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={!motivo.trim() || enviando}
            className="bg-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {enviando ? "Enviando…" : "Enviar denuncia"}
          </button>
        </div>
      </div>
    </div>
  );
}
