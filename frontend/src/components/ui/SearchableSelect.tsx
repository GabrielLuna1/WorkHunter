import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  id: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  className = ""
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = options.find(o => o.id === value)?.label || placeholder;

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg bg-surface border border-hairline text-sm text-ink outline-none hover:border-hairline-strong transition-colors focus:border-accent"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className="w-4 h-4 text-ink-subtle ml-2 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[200px] max-h-60 overflow-y-auto rounded-lg bg-surface-2 border border-hairline shadow-xl flex flex-col p-1 animate-fade-in">
          <div className="px-2 py-1.5 border-b border-hairline mb-1 sticky top-0 bg-surface-2 z-10">
             <input
               type="text"
               placeholder="Buscar..."
               className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-tertiary"
               value={search}
               onChange={e => setSearch(e.target.value)}
               autoFocus
               onClick={e => e.stopPropagation()}
             />
          </div>
          <button
            onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
            className={`flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-surface-3 transition-colors text-left ${value === '' ? 'text-accent font-medium bg-accent/5' : 'text-ink'}`}
          >
            {placeholder}
          </button>
          {filtered.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); setSearch(''); }}
              className={`flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover:bg-surface-3 transition-colors text-left ${value === opt.id ? 'text-accent font-medium bg-accent/5' : 'text-ink'}`}
            >
              <span className="truncate">{opt.label}</span>
              {value === opt.id && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-xs text-ink-tertiary text-center">Nenhum resultado</div>
          )}
        </div>
      )}
    </div>
  );
}
