"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Briefcase, MapPin, Target, Loader2, ExternalLink, ChevronDown } from "lucide-react";
import Link from "next/link";
import { listarVagasPaginado, type Vaga } from "@/lib/api";
import { cn } from "@/lib/utils";

export function VagaBrowserView({ onSelectVaga, onClose }: {
  onSelectVaga: (vaga: Vaga) => void;
  onClose: () => void;
}) {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadMore, setLoadMore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchVagas = useCallback(async (p: number, search?: string) => {
    try {
      if (p === 1) setLoading(true);
      else setLoadMore(true);
      const params: Record<string, any> = { page: p, limit: 20, ativa: true };
      if (search?.trim()) params.busca = search.trim();
      const res = await listarVagasPaginado(params);
      if (p === 1) setVagas(res.data);
      else setVagas((prev) => [...prev, ...res.data]);
      setTotalPages(res.total_pages);
    } catch {}
    setLoading(false);
    setLoadMore(false);
  }, []);

  useEffect(() => { fetchVagas(1); }, [fetchVagas]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchVagas(1, busca);
    }, 300);
    return () => clearTimeout(timer);
  }, [busca, fetchVagas]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchVagas(next, busca);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-hairline flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 bg-surface border border-hairline rounded-lg px-3 py-1.5 focus-within:border-accent/50 transition-colors">
          <Search className="w-4 h-4 text-ink-tertiary shrink-0" />
          <input
            ref={inputRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar vagas..."
            className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-tertiary outline-none"
          />
        </div>
        <button onClick={onClose}
          className="text-[11px] text-ink-subtle hover:text-accent px-2 py-1 rounded-md hover:bg-surface-2 transition-colors">
          Fechar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          </div>
        ) : vagas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-[13px] text-ink-subtle">Nenhuma vaga encontrada</p>
          </div>
        ) : (
          <div className="py-1">
            {vagas.map((vaga) => (
              <button
                key={vaga.id}
                onClick={() => onSelectVaga(vaga)}
                className="w-full text-left px-4 py-2.5 hover:bg-surface-2/80 transition-colors border-b border-hairline/50 last:border-b-0 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink font-medium truncate group-hover:text-accent transition-colors">
                      {vaga.titulo}
                    </p>
                    <p className="text-[12px] text-ink-muted truncate mt-0.5">{vaga.empresa}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {vaga.localizacao && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-ink-tertiary">
                          <MapPin className="w-3 h-3" />
                          {vaga.localizacao}
                        </span>
                      )}
                      {vaga.fonte && (
                        <span className="text-[11px] text-ink-tertiary uppercase">{vaga.fonte}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold",
                      vaga.score >= 80 ? "bg-success/10 text-success" :
                      vaga.score >= 60 ? "bg-accent/10 text-accent" :
                      "bg-surface-2 text-ink-muted"
                    )}>
                      <Target className="w-3 h-3" />
                      {vaga.score}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-ink-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {page < totalPages && !loading && (
        <div className="px-4 py-2 border-t border-hairline">
          <button onClick={handleLoadMore} disabled={loadMore}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] text-ink-subtle hover:text-accent hover:bg-surface-2 transition-colors disabled:opacity-50">
            {loadMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
            Carregar mais
          </button>
        </div>
      )}
    </div>
  );
}
