interface QuickActionChipProps {
  label: string;
  icon: string;
  onClick?: () => void;
}

export default function QuickActionChip({ label, icon, onClick }: QuickActionChipProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-secondary-container hover:bg-secondary-container/80 text-primary-fixed text-xs font-medium rounded-full transition-all border border-primary/10 flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {label}
    </button>
  );
}
