// src/components/shared/NexoLogo.tsx
// Componente reutilizable del logo NEXO con ícono + nombre + slogan

interface NexoLogoProps {
  size?: "sm" | "md" | "lg";
  showSlogan?: boolean;
}

export default function NexoLogo({ size = "md", showSlogan = true }: NexoLogoProps) {
  const iconSizes = {
    sm: "w-10 h-10 text-2xl",
    md: "w-14 h-14 text-4xl",
    lg: "w-18 h-18 text-5xl",
  };

  const titleSizes = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl",
  };

  return (
    <div className="flex flex-col items-center text-center">
      {/* Ícono nodos */}
      <div
        className={`${iconSizes[size]} bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20`}
      >
        <span className="material-symbols-outlined text-primary">hub</span>
      </div>

      {/* Nombre */}
      <h1
        className={`${titleSizes[size]} font-headline font-extrabold tracking-tighter text-white mb-1`}
      >
        NEXO
      </h1>

      {/* Slogan */}
      {showSlogan && (
        <p className="text-[10px] font-headline font-bold tracking-[0.2em] text-on-surface-variant/70 uppercase">
          Conectando el aprendizaje que importa
        </p>
      )}
    </div>
  );
}
