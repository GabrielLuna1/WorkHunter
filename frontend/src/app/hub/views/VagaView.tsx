"use client";

import { MapPin, DollarSign, BadgeCheck, ExternalLink, Clock, Briefcase, Target } from "lucide-react";
import Link from "next/link";
import type { Vaga } from "@/lib/api";
import { cn } from "@/lib/utils";

export function VagaView({ vaga, matchScore, onAction }: {
  vaga: Vaga;
  matchScore?: number | null;
  onAction: (action: string, vagaId?: string) => void;
}) {
  const salario = vaga.salario_min || vaga.salario_max
    ? `R$ ${vaga.salario_min?.toLocaleString("pt-BR") || "—"} — R$ ${vaga.salario_max?.toLocaleString("pt-BR") || "—"}`
    : null;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink font-heading mb-0.5">{vaga.titulo}</h2>
          <p className="text-[13px] text-ink-subtle">{vaga.empresa}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border",
            vaga.score >= 80 ? "bg-success/10 text-success border-success/20" :
            vaga.score >= 60 ? "bg-accent/10 text-accent border-accent/20" :
            "bg-danger/10 text-danger border-danger/20"
          )}>
            <Target className="w-3 h-3" />
            {vaga.score}
          </span>
          {matchScore !== undefined && matchScore !== null && (
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border",
              matchScore >= 70 ? "bg-success/10 text-success border-success/20" :
              matchScore >= 50 ? "bg-accent/10 text-accent border-accent/20" :
              "bg-danger/10 text-danger border-danger/20"
            )}>
              Match {matchScore}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {vaga.localizacao && (
          <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted bg-surface-2 px-2 py-1 rounded border border-hairline">
            <MapPin className="w-3 h-3" />{vaga.localizacao}
          </span>
        )}
        {salario && (
          <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted bg-surface-2 px-2 py-1 rounded border border-hairline">
            <DollarSign className="w-3 h-3" />{salario}
          </span>
        )}
        {vaga.analise?.nivel_estimado && (
          <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted bg-surface-2 px-2 py-1 rounded border border-hairline capitalize">
            <BadgeCheck className="w-3 h-3" />{vaga.analise.nivel_estimado.replace(/_/g, " ")}
          </span>
        )}
        {vaga.tipo_contrato && (
          <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted bg-surface-2 px-2 py-1 rounded border border-hairline">
            <Briefcase className="w-3 h-3" />{vaga.tipo_contrato}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted bg-surface-2 px-2 py-1 rounded border border-hairline">
          <Clock className="w-3 h-3" />
          {vaga.coletada_em ? new Date(vaga.coletada_em).toLocaleDateString("pt-BR") : "—"}
        </span>
      </div>

      {vaga.analise?.fake_junior && (
        <div className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-danger/10 text-danger border border-danger/20">
          Alerta Fake Júnior
        </div>
      )}

      {vaga.descricao && (
        <div>
          <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-1.5">Descrição</p>
          <p className="text-[13px] text-ink-muted leading-relaxed line-clamp-5">{vaga.descricao}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-hairline">
        <button onClick={() => onAction("analisar", vaga.id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors">
          <BrainIcon /> Analisar
        </button>
        <button onClick={() => onAction("match", vaga.id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-success/10 text-success hover:bg-success/20 border border-success/20 transition-colors">
          <TargetIcon /> Calcular Match
        </button>
        <button onClick={() => onAction("analise_completa", vaga.id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-ink-subtle hover:text-accent bg-surface-2 border border-hairline hover:border-accent/30 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> Análise completa
        </button>
      </div>
    </div>
  );
}

function BrainIcon() { return (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M12 22a4 4 0 0 1-4-4v-2a4 4 0 0 1 8 0v2a4 4 0 0 1-4 4z"/><path d="M2 12h2a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H2"/><path d="M22 12h-2a4 4 0 0 0-4 4v0a4 4 0 0 0 4 4h2"/></svg>
); }
function TargetIcon() { return (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
); }

