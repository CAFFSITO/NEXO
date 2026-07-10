import { useState } from "react";

interface SearchAndFilterProps {
  onSearch?: (query: string) => void;
  onFilter?: () => void;
}

export default function SearchAndFilter({ onSearch, onFilter }: SearchAndFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <div className="bg-[#2D1B4E]/30 p-2 rounded-full mb-8 flex items-center gap-4 border border-[#2D1B4E]">
      <div className="flex-1 flex items-center gap-3 px-4">
        <span className="material-symbols-outlined text-gray-400">search</span>
        <input
          className="bg-transparent border-none text-sm text-on-surface focus:ring-0 w-full placeholder-gray-500"
          placeholder="Buscar documentos, guías o enlaces..."
          type="text"
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>
      <div className="h-6 w-px bg-[#2D1B4E]"></div>
      <button
        onClick={onFilter}
        className="flex items-center gap-2 px-4 py-2 bg-[#2D1B4E] rounded-full text-xs font-bold text-on-surface hover:bg-[#4900a6] transition-colors"
      >
        <span className="material-symbols-outlined text-sm">filter_list</span>
        <span>Filtrar</span>
      </button>
    </div>
  );
}
