interface TopBarProps {
  title: string;
  subtitle?: string;
  onHelpClick?: () => void;
  onMenuClick?: () => void;
}

export default function TopBar({ title, subtitle, onHelpClick, onMenuClick }: TopBarProps) {
  return (
    <header className="flex justify-between items-center h-16 px-6 border-b border-purple-900/30">
      <div className="flex items-center gap-4">
        <h2 className="font-headline text-lg font-bold text-white">{title}</h2>
        {subtitle && (
          <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] rounded-full font-bold uppercase tracking-wider">
            {subtitle}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onHelpClick && (
          <button
            onClick={onHelpClick}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-opacity active:opacity-70"
          >
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        )}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-opacity active:opacity-70"
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        )}
      </div>
    </header>
  );
}
