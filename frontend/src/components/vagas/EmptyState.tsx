"use client";

import { Search, Inbox, Filter, Loader2 } from "lucide-react";

interface EmptyStateProps {
  type: "busca" | "filtro" | "geral";
  busca?: string;
  onColetar?: () => void;
  coletando?: boolean;
}

export default function EmptyState({ type, busca, onColetar, coletando }: EmptyStateProps) {
  const config = {
    busca: {
      icon: Search,
      title: "Nenhum resultado encontrado",
      desc: busca
        ? `Nenhuma vaga corresponde a "${busca}".`
        : "Nenhuma vaga encontrada para esta busca.",
    },
    filtro: {
      icon: Filter,
      title: "Nenhuma vaga com esses filtros",
      desc: "Tente remover alguns filtros para ver mais resultados.",
    },
    geral: {
      icon: Inbox,
      title: "O Radar está vazio",
      desc: "Nenhuma vaga cadastrada. Inicie uma coleta para mapear o mercado.",
    },
  };

  const { icon: Icon, title, desc } = config[type];

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-xl bg-surface flex items-center justify-center border border-hairline mb-4">
        <Icon className="w-8 h-8 text-ink-subtle" />
      </div>
      <h3 className="font-heading text-lg text-ink mb-1">{title}</h3>
      <p className="text-sm text-ink-subtle max-w-sm mb-6">{desc}</p>
      {onColetar && busca && (
        <button
          onClick={onColetar}
          disabled={coletando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {coletando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {coletando ? "Coletando..." : `Coletar vagas para "${busca}"`}
        </button>
      )}
    </div>
  );
}
