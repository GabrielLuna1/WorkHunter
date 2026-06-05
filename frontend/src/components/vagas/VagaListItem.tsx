"use client";

import { MapPin, DollarSign, BadgeCheck, ExternalLink, Heart, Sparkles, SendHorizonal, Bookmark, MessageCircle, BarChart3, Target } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Vaga } from "@/lib/api";

function formatSalario(min: number | null, max: number | null): string {
  if (!min && !max) return "—";
  const fmt = (v: number) => `R$ ${Math.round(v / 1000)}k`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  return min ? `a partir de ${fmt(min)}` : `até ${fmt(max!)}`;
}

export default function VagaListItem({
  vaga,
  matchScore,
  onFavoritar,
  onAnalisar,
  onAplicar,
  onSalvar,
}: {
  vaga: Vaga;
  matchScore?: number | null;
  onFavoritar: (id: string) => void;
  onAnalisar: (id: string) => void;
  onAplicar: (id: string) => void;
  onSalvar: (id: string) => void;
}) {
  const favoritada = vaga.usuario_status?.favoritada ?? false;
  const aplicada = vaga.usuario_status?.aplicada ?? false;
  const salva = vaga.usuario_status?.salva ?? false;
  const nivel = vaga.analise?.nivel_estimado;
  const salario = formatSalario(vaga.salario_min, vaga.salario_max);
  const fakeJunior = vaga.analise?.fake_junior;

  const scoreColor = vaga.score >= 80 ? "text-success" : vaga.score >= 60 ? "text-accent" : vaga.score >= 40 ? "text-warning" : "text-danger";

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 bg-surface border border-hairline rounded-lg hover:bg-surface-2 transition-colors card-glow animate-fade-in-up">
      <button
        onClick={() => onFavoritar(vaga.id)}
        className={cn(
          "p-1 rounded-md transition-colors shrink-0",
          favoritada ? "text-danger" : "text-ink-tertiary hover:text-ink-subtle"
        )}
        title={favoritada ? "Remover dos favoritos" : "Favoritar"}
      >
        <Heart className={cn("w-4 h-4", favoritada && "fill-current")} />
      </button>

      <span className={cn("text-[13px] font-bold tabular-nums w-10 shrink-0", scoreColor)}>
        {vaga.score}
      </span>
      {matchScore !== undefined && matchScore !== null && (
        <span
          className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0",
            matchScore >= 70 ? "bg-success/10 text-success border-success/20" :
            matchScore >= 50 ? "bg-accent/10 text-accent border-accent/20" :
            "bg-danger/10 text-danger border-danger/20"
          )}
        >
          <Target className="w-2.5 h-2.5 inline mr-0.5" />
          {matchScore}
        </span>
      )}

      <div className="min-w-0 flex-1 grid grid-cols-12 gap-2 items-center">
        <div className="col-span-3 min-w-0">
          <p className="text-[12px] text-ink-subtle truncate">{vaga.empresa}</p>
        </div>
        <div className="col-span-4 min-w-0">
          <p className="text-[14px] font-medium text-ink truncate">{vaga.titulo}</p>
        </div>
        <div className="col-span-2 flex items-center gap-1 text-[12px] text-ink-muted truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{vaga.localizacao || "—"}</span>
          {vaga.modelo_trabalho === "remoto" && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-success/10 text-success border border-success/20 uppercase shrink-0">
              R
            </span>
          )}
          {vaga.modelo_trabalho === "hibrido" && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-accent/10 text-accent border border-accent/20 uppercase shrink-0">
              H
            </span>
          )}
        </div>
        <div className="col-span-1 text-[12px] text-ink-muted truncate">
          {salario}
        </div>
        <div className="col-span-1 text-[12px] text-ink-muted capitalize truncate">
          {nivel?.replace(/_/g, " ") || "—"}
        </div>
        <div className="col-span-1 text-[12px] text-ink-muted truncate">
          {vaga.coletada_em ? new Date(vaga.coletada_em).toLocaleDateString("pt-BR") : "—"}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {fakeJunior && (
          <span className="text-[10px] font-semibold text-danger bg-danger/10 px-1.5 py-0.5 rounded border border-danger/20">
            Fake JR
          </span>
        )}
        <button
          onClick={() => onSalvar(vaga.id)}
          disabled={salva}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            salva ? "text-accent cursor-default" : "text-ink-tertiary hover:text-accent"
          )}
          title={salva ? "Já salva" : "Salvar no Pipeline"}
        >
          <Bookmark className={cn("w-3.5 h-3.5", salva && "fill-current")} />
        </button>
        <button
          onClick={() => onAplicar(vaga.id)}
          disabled={aplicada}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            aplicada ? "text-success cursor-default" : "text-ink-tertiary hover:text-success"
          )}
          title={aplicada ? "Já aplicada" : "Aplicar"}
        >
          <SendHorizonal className="w-3.5 h-3.5" />
        </button>
        <a
          href={vaga.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md text-ink-tertiary hover:text-accent transition-colors"
          title="Visitar vaga"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <Link
          href={`/analise/vaga/${vaga.id}`}
          className="p-1.5 rounded-md text-ink-tertiary hover:text-accent transition-colors"
          title="Ver análise completa"
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={() => onAnalisar(vaga.id)}
          className="p-1.5 rounded-md text-ink-tertiary hover:text-accent transition-colors"
          title="Analisar com IA"
        >
          <MessageCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
