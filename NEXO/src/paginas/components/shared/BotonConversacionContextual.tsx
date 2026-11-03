import { useState } from "react";
import { useNavegacion } from "../../../navegacion";
import { enviar } from "../../../servicios/api";
import { useFuncion, useInstancia } from "../../../servicios/instancia";

/** Abre o crea el único hilo del objeto; el servidor decide sus participantes. */
export default function BotonConversacionContextual({ tipo, id, etiqueta = "Conversar sobre esto" }: {
  tipo: "tarea" | "entrega" | "meta" | "proyecto"; id: string; etiqueta?: string;
}) {
  const { navegar } = useNavegacion();
  const { instancia } = useInstancia();
  const habilitado = useFuncion("chat.contextos");
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState("");
  if (!habilitado || !instancia?.modulos.some(m => m.paginas.includes("chat"))) return null;
  const abrir = async () => {
    if (abriendo) return;
    setAbriendo(true); setError("");
    try {
      const { canal } = await enviar<{ canal: { id: string } }>(`/api/chat/contextos/${tipo}/${encodeURIComponent(id)}`, "POST", {});
      navegar(`/chat?conversacion=${encodeURIComponent(canal.id)}`);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo abrir la conversación.");
      setAbriendo(false);
    }
  };
  return <div className="space-y-2">
    <button type="button" disabled={abriendo} onClick={() => void abrir()} className="inline-flex items-center gap-2 rounded-xl border border-primary/30 px-4 py-2 text-sm text-primary disabled:opacity-50">
      <span aria-hidden="true" className="material-symbols-outlined text-lg">forum</span>{abriendo ? "Abriendo…" : etiqueta}
    </button>
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
  </div>;
}
