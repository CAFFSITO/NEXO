interface TopBarProps {
  title: string;
  subtitle?: string;
  onHelpClick?: () => void;
  onMenuClick?: () => void;
}

export default function TopBar({ title, subtitle, onHelpClick, onMenuClick }: TopBarProps) {
  return <header className="nexo-topbar">
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-on-surface-variant/45 text-sm hidden sm:inline">Mi espacio</span>
      <span className="text-on-surface-variant/30 hidden sm:inline" aria-hidden="true">/</span>
      <h2 className="font-headline text-sm font-semibold truncate">{title}</h2>
      {subtitle && <span className="nexo-pill hidden sm:inline-flex">{subtitle}</span>}
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs text-on-surface-variant/65 hidden lg:inline mr-3">{new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" }).format(new Date())}</span>
      <button className="nexo-icon-button" aria-label="Buscar sección" title="Buscar sección (Ctrl K)" onClick={() => window.dispatchEvent(new Event("nexo:buscar"))}><span className="material-symbols-outlined">search</span></button>
      {onHelpClick && <button onClick={onHelpClick} className="nexo-icon-button" aria-label="Ayuda"><span className="material-symbols-outlined">help_outline</span></button>}
      {onMenuClick && <button onClick={onMenuClick} className="nexo-icon-button" aria-label="Más opciones"><span className="material-symbols-outlined">more_vert</span></button>}
    </div>
  </header>;
}
