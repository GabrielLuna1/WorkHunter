"use client";

import { Briefcase, Clock, MapPin, DollarSign, BadgeCheck, ExternalLink, Sparkles, Heart, BarChart3, Target } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Vaga } from "@/lib/api";

function ScoreRing({ score, size = 36 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score, 100) / 100;
  const color = score >= 80 ? "var(--color-success)" : score >= 60 ? "var(--color-accent)" : score >= 40 ? "var(--color-warning)" : "var(--color-danger)";
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-hairline-strong" strokeWidth={3} />
        <circle
          strokeDashoffset={circ * (1 - pct)}
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray={circ} strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

function formatSalario(min: number | null, max: number | null): string {
  if (!min && !max) return "";
  const fmt = (v: number) => `R$ ${Math.round(v / 1000)}k`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  return min ? `a partir de ${fmt(min)}` : `até ${fmt(max!)}`;
}

import { SendHorizonal, Bookmark, MessageCircle } from "lucide-react";

export default function VagaCard({
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

  return (
    <div className="bg-surface border border-hairline rounded-xl p-5 flex flex-col card-glow animate-fade-in-up h-full">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-surface-2 border border-hairline flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-ink-tertiary" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink-subtle truncate">{vaga.empresa}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-2 text-ink-muted border border-hairline uppercase">
                {vaga.fonte}
              </span>
              {vaga.modelo_trabalho === "remoto" && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-success/10 text-success border border-success/20 uppercase">
                  Remoto
                </span>
              )}
              {vaga.modelo_trabalho === "hibrido" && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent/10 text-accent border border-accent/20 uppercase">
                  Híbrido
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onFavoritar(vaga.id)}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              favoritada ? "text-danger hover:text-danger/80" : "text-ink-tertiary hover:text-ink-subtle"
            )}
            title={favoritada ? "Remover dos favoritos" : "Favoritar"}
          >
            <Heart className={cn("w-4 h-4", favoritada && "fill-current")} />
          </button>
          <ScoreRing score={vaga.score} />
          {matchScore !== undefined && matchScore !== null && (
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                matchScore >= 70 ? "bg-success/10 text-success border-success/20" :
                matchScore >= 50 ? "bg-accent/10 text-accent border-accent/20" :
                "bg-danger/10 text-danger border-danger/20"
              )}
              title="Match score"
            >
              <Target className="w-2.5 h-2.5 inline mr-0.5" />
              {matchScore}
            </span>
          )}
        </div>
      </div>

      <h3 className="font-heading text-[15px] font-medium text-ink leading-snug mb-3 line-clamp-2">
        {vaga.titulo}
      </h3>

      <div className="space-y-1.5 mb-3 flex-1">
        {vaga.localizacao && (
          <div className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{vaga.localizacao}</span>
          </div>
        )}
        {salario && (
          <div className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            <DollarSign className="w-3.5 h-3.5 shrink-0" />
            <span>{salario}</span>
          </div>
        )}
        {nivel && (
          <div className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="capitalize">{nivel.replace(/_/g, " ")}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[12px] text-ink-muted">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{vaga.coletada_em ? new Date(vaga.coletada_em).toLocaleDateString("pt-BR") : "—"}</span>
        </div>
      </div>

      {fakeJunior && (
        <div className="mb-3 inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-danger/10 text-danger border border-danger/20 w-fit">
          Alerta Fake Júnior
        </div>
      )}

      <div className="pt-3 border-t border-hairline flex items-center justify-between">
        <div className="flex items-center gap-1">
          <a
            href={vaga.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Visitar
          </a>
          <button
            onClick={() => onSalvar(vaga.id)}
            disabled={salva}
            className={cn(
              "inline-flex items-center gap-1 text-[12px] font-medium transition-colors ml-2",
              salva
                ? "text-accent cursor-default"
                : "text-ink-subtle hover:text-accent"
            )}
            title={salva ? "Já salva no Pipeline" : "Salvar no Pipeline"}
          >
            <Bookmark className={cn("w-3.5 h-3.5", salva && "fill-current")} />
            {salva ? "Salva" : "Salvar"}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAplicar(vaga.id)}
            disabled={aplicada}
            className={cn(
              "inline-flex items-center gap-1 text-[12px] font-medium transition-colors",
              aplicada
                ? "text-success cursor-default"
                : "text-ink-subtle hover:text-success"
            )}
            title={aplicada ? "Já aplicada" : "Aplicar"}
          >
            <SendHorizonal className="w-3.5 h-3.5" />
            {aplicada ? "Aplicada" : "Aplicar"}
          </button>
          <Link
            href={`/analise/vaga/${vaga.id}`}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-subtle hover:text-accent transition-colors"
            title="Ver análise completa"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Análise
          </Link>
          <button
            onClick={() => onAnalisar(vaga.id)}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-subtle hover:text-accent transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            IA
          </button>
        </div>
      </div>
    </div>
  );
}
