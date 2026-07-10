interface TarjetaPosteoProps {
  autor: string;
  rol: "estudiante" | "profesor" | "admin";
  contenido: string;
  fecha: string;
  avatarUrl?: string;
  likes: number;
  comments: number;
  shares: number;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

export default function TarjetaPosteo({
  autor,
  rol,
  contenido,
  fecha,
  avatarUrl,
  likes,
  comments,
  shares,
  onLike,
  onComment,
  onShare,
}: TarjetaPosteoProps) {
  const rolColor = {
    estudiante: "text-green-400",
    profesor: "text-blue-400",
    admin: "text-purple-400",
  };

  const rolBg = {
    estudiante: "bg-green-500/20",
    profesor: "bg-blue-500/20",
    admin: "bg-purple-500/20",
  };

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
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rolBg[rol]}`}>
                <span className={rolColor[rol]}>{rol.charAt(0).toUpperCase() + rol.slice(1)}</span>
              </span>
              <span className="text-xs text-gray-500">{fecha}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-gray-300 text-sm leading-relaxed">{contenido}</p>

      {/* Engagement Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-400 pt-4 border-t border-[#3b2f50]">
        <button
          onClick={onLike}
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-sm">favorite</span>
          <span>{likes}</span>
        </button>
        <button
          onClick={onComment}
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-sm">chat_bubble</span>
          <span>{comments}</span>
        </button>
        <button
          onClick={onShare}
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-sm">share</span>
          <span>{shares}</span>
        </button>
      </div>
    </div>
  );
}
