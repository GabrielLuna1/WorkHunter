"use client";

import { Search, X, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { listarLocais } from "@/lib/api";

interface FilterBarProps {
  busca: string;
  onBuscaChange: (v: string) => void;
  onBuscaSubmit: () => void;
  fonte: string;
  onFonteChange: (v: string) => void;
  scoreMin: number;
  onScoreChange: (v: number) => void;
  status: string;
  onStatusChange: (v: string) => void;
  modeloTrabalho: string;
  onModeloTrabalhoChange: (v: string) => void;
  uf: string[];
  onUfChange: (v: string[]) => void;
  orderBy: string;
  onOrderByChange: (v: string) => void;
  orderDir: string;
  onOrderDirToggle: () => void;
}

const FONTES = [
  { value: "", label: "Todas as Fontes" },
  { value: "gupy", label: "Gupy" },
  { value: "infojobs", label: "InfoJobs" },
  { value: "vagasbr", label: "Vagas.com.br" },
  { value: "apinfo", label: "APInfo" },
];

const SCORES = [
  { value: 0, label: "Qualquer Score" },
  { value: 80, label: "Match Supremo (≥ 80)" },
  { value: 60, label: "Bom Match (≥ 60)" },
  { value: 40, label: "Match Médio (≥ 40)" },
];

const STATUS = [
  { value: "", label: "Todas" },
  { value: "favoritada", label: "Favoritadas" },
  { value: "aplicada", label: "Aplicadas" },
  { value: "analisada", label: "Analisadas" },
  { value: "ignorada", label: "Ignoradas" },
  { value: "arquivada", label: "Arquivadas" },
];

const MODELOS = [
  { value: "", label: "Todos os Modelos" },
  { value: "remoto", label: "Remoto" },
  { value: "hibrido", label: "Híbrido" },
  { value: "presencial", label: "Presencial" },
];

const ORDENACAO = [
  { value: "coletada_em", label: "Data" },
  { value: "score", label: "Score" },
  { value: "salario_max", label: "Salário" },
  { value: "empresa", label: "Empresa" },
  { value: "titulo", label: "Título" },
];

function MultiSelectUF({ value, onChange }: { value: string[]; onClose?: () => void; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [ufs, setUfs] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listarLocais().then((r) => setUfs(r.ufs)).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (uf: string) => {
    if (value.includes(uf)) {
      onChange(value.filter((v) => v !== uf));
    } else {
      onChange([...value, uf]);
    }
  };

  const label = value.length === 0
    ? "Todos os Estados"
    : value.length === 1
      ? value[0]
      : `${value.length} estados`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 bg-surface border border-hairline text-sm text-ink hover:border-hairline-strong focus:border-accent focus:outline-none px-3 py-1.5 rounded-md cursor-pointer transition-colors",
          value.length > 0 && "border-accent text-accent"
        )}
      >
        <span>{label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-ink-tertiary transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-48 bg-surface border border-hairline rounded-lg shadow-xl max-h-72 overflow-y-auto">
          {ufs.map((uf) => (
            <button
              key={uf}
              onClick={() => toggle(uf)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-surface-2 transition-colors text-left"
            >
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                value.includes(uf) ? "bg-accent border-accent" : "border-hairline-strong"
              )}>
                {value.includes(uf) && <Check className="w-3 h-3 text-white" />}
              </div>
              <span>{uf}</span>
            </button>
          ))}
          {ufs.length === 0 && (
            <div className="px-3 py-2 text-xs text-ink-subtle">Carregando...</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FilterBar(props: FilterBarProps) {
  const activeFilters: { label: string; onRemove: () => void }[] = [];
  if (props.busca) activeFilters.push({ label: `"${props.busca}"`, onRemove: () => props.onBuscaChange("") });
  if (props.fonte) {
    const f = FONTES.find(f => f.value === props.fonte);
    if (f) activeFilters.push({ label: f.label, onRemove: () => props.onFonteChange("") });
  }
  if (props.scoreMin > 0) {
    const s = SCORES.find(s => s.value === props.scoreMin);
    if (s) activeFilters.push({ label: s.label, onRemove: () => props.onScoreChange(0) });
  }
  if (props.status) {
    const st = STATUS.find(s => s.value === props.status);
    if (st) activeFilters.push({ label: st.label, onRemove: () => props.onStatusChange("") });
  }
  if (props.modeloTrabalho) {
    const md = MODELOS.find(m => m.value === props.modeloTrabalho);
    if (md) activeFilters.push({ label: md.label, onRemove: () => props.onModeloTrabalhoChange("") });
  }
  if (props.uf.length > 0) {
    activeFilters.push({ label: `Estados: ${props.uf.join(", ")}`, onRemove: () => props.onUfChange([]) });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
          <input
            type="text"
            value={props.busca}
            onChange={(e) => props.onBuscaChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); props.onBuscaSubmit(); } }}
            placeholder="Buscar vagas..."
            className="w-full bg-surface border border-hairline text-sm text-ink placeholder:text-ink-tertiary hover:border-hairline-strong focus:border-accent focus:outline-none pl-9 pr-8 py-1.5 rounded-md transition-colors"
          />
          <button
            onClick={props.onBuscaSubmit}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-ink-tertiary hover:text-accent hover:bg-surface-2 transition-colors"
            title="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        <select
          value={props.fonte}
          onChange={(e) => props.onFonteChange(e.target.value)}
          className="bg-surface border border-hairline text-sm text-ink hover:border-hairline-strong focus:border-accent focus:outline-none px-3 py-1.5 rounded-md cursor-pointer transition-colors"
        >
          {FONTES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <MultiSelectUF value={props.uf} onChange={props.onUfChange} />

        <select
          value={props.modeloTrabalho}
          onChange={(e) => props.onModeloTrabalhoChange(e.target.value)}
          className="bg-surface border border-hairline text-sm text-ink hover:border-hairline-strong focus:border-accent focus:outline-none px-3 py-1.5 rounded-md cursor-pointer transition-colors"
        >
          {MODELOS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        <select
          value={props.scoreMin}
          onChange={(e) => props.onScoreChange(Number(e.target.value))}
          className="bg-surface border border-hairline text-sm text-ink hover:border-hairline-strong focus:border-accent focus:outline-none px-3 py-1.5 rounded-md cursor-pointer transition-colors"
        >
          {SCORES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={props.status}
          onChange={(e) => props.onStatusChange(e.target.value)}
          className="bg-surface border border-hairline text-sm text-ink hover:border-hairline-strong focus:border-accent focus:outline-none px-3 py-1.5 rounded-md cursor-pointer transition-colors"
        >
          {STATUS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <select
            value={props.orderBy}
            onChange={(e) => props.onOrderByChange(e.target.value)}
            className="bg-surface border border-hairline text-sm text-ink hover:border-hairline-strong focus:border-accent focus:outline-none px-3 py-1.5 rounded-md cursor-pointer transition-colors"
          >
            {ORDENACAO.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={props.onOrderDirToggle}
            className="px-2 py-1.5 rounded-md bg-surface border border-hairline text-sm text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors"
            title={props.orderDir === "desc" ? "Mais recentes primeiro" : "Mais antigos primeiro"}
          >
            {props.orderDir === "desc" ? "↓" : "↑"}
          </button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-ink-subtle font-medium uppercase tracking-wider">Filtros:</span>
          {activeFilters.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-surface-2 border border-hairline text-ink-muted"
            >
              {f.label}
              <button onClick={f.onRemove} className="hover:text-ink transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
