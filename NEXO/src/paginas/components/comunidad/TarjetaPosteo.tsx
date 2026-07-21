import { ROL_LABELS, type Rol } from "../shared/roles";
import MenuTresPuntos from "./MenuTresPuntos";
import type { ObjetoVotable } from "../../../servicios/comunidad";

interface TarjetaPosteoProps {
  id: string;
  autor: string;
  rol: Rol;
  /** Rol de quien MIRA la tarjeta (para el menú de tres puntos). */
  rolLector: Rol;
  esAutor: boolean;
  contenido: string;
  fecha: string;
  avatarUrl?: string;
  votosAFavor: number;
  votosEnContra: number;
  comentarios: number;
  miVoto: "a-favor" | "en-contra" | null;
  onVotar?: (postura: "a-favor" | "en-contra") => void;
  onComentar?: () => void;
  onDenunciar?: (tipo: ObjetoVotable, id: string) => void;
  onEliminar?: (tipo: ObjetoVotable, id: string) => void;
}

// Color del pill de rol. Antes solo contemplaba tres roles ("estudiante",
// "profesor", "admin"), pero en la comunidad publica gente de más roles (el
// centro de estudiantes, la dirección): un rol fuera de esos tres rompía. Ahora
// cubre los ocho.
const ROL_COLOR: Record<Rol, string> = {
  estudiante: "bg-green-500/20 text-green-400",
  profesor: "bg-blue-500/20 text-blue-400",
  "admin-academico": "bg-purple-500/20 text-purple-400",
  preceptor: "bg-slate-500/20 text-slate-300",
  "centro-estudiantes": "bg-orange-500/20 text-orange-400",
  bibliotecario: "bg-amber-500/20 text-amber-400",
  familia: "bg-teal-500/20 text-teal-300",
  administrador: "bg-red-500/20 text-red-300",
};

export default function TarjetaPosteo({
  id,
  autor,
  rol,
  rolLector,
  esAutor,
  contenido,
  fecha,
  avatarUrl,
  votosAFavor,
  votosEnContra,
  comentarios,
  miVoto,
  onVotar,
  onComentar,
  onDenunciar,
  onEliminar,
}: TarjetaPosteoProps) {

  return (
    <div className="bg-[#2D1B4E] border border-[#3b2f50] hover:border-primary/30 transition-all p-6 rounded-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt={autor} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">{autor.charAt(0)}</span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">{autor}</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROL_COLOR[rol]}`}>
                {ROL_LABELS[rol]}
              </span>
              <span className="text-xs text-gray-500">{fecha}</span>
            </div>
          </div>
        </div>
        {/* Menú de tres puntos: denunciar (estudiante/profesor) o eliminar
            (dirección/preceptor/autor). El mismo componente que en Debates y en
            el detalle (Errores 2.B.5 y 2.B.8, sección 1.4). */}
        {onDenunciar && onEliminar && (
          <MenuTresPuntos
            rol={rolLector}
            objetoTipo="publicacion"
            objetoId={id}
            esAutor={esAutor}
            onDenunciar={onDenunciar}
            onEliminar={onEliminar}
          />
        )}
      </div>

      {/* Content */}
      <p className="text-gray-300 text-sm leading-relaxed">{contenido}</p>

      {/* Interacción: voto a favor / en contra + comentarios.
          Ya no hay corazón de "me gusta" ni botón de "compartir": el modelo de
          NEXO es de votos, no de likes (Error 2.B.1), y no existe forma de
          compartir una publicación, así que ese contador (que además era
          inventado) se va. Votar y comentar todavía no escriben en la base
          (Etapa 5); los números que se ven, en cambio, ya son reales. */}
      <div className="flex items-center gap-4 text-xs text-gray-400 pt-4 border-t border-[#3b2f50]">
        <button
          onClick={() => onVotar?.("a-favor")}
          className={`flex items-center gap-1 transition-colors hover:text-emerald-400 ${
            miVoto === "a-favor" ? "text-emerald-400 font-bold" : ""
          }`}
        >
          <span className="material-symbols-outlined text-sm">thumb_up</span>
          <span>{votosAFavor}</span>
        </button>
        <button
          onClick={() => onVotar?.("en-contra")}
          className={`flex items-center gap-1 transition-colors hover:text-red-400 ${
            miVoto === "en-contra" ? "text-red-400 font-bold" : ""
          }`}
        >
          <span className="material-symbols-outlined text-sm">thumb_down</span>
          <span>{votosEnContra}</span>
        </button>
        <button
          onClick={onComentar}
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-sm">chat_bubble</span>
          <span>{comentarios}</span>
        </button>
      </div>
    </div>
  );
}
