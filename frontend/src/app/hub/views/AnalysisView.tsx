"use client";

import { Target, FileText, CheckCircle2, Sparkles, BarChart3, BrainCircuit } from "lucide-react";
import type { VagaAnalysisResult } from "@/lib/api";

export function AnalysisView({ analise, onAction }: {
  analise: VagaAnalysisResult;
  onAction: (action: string) => void;
}) {
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-base font-semibold metallic-gradient font-heading mb-1">Análise da Vaga</h2>
      <p className="text-[12px] text-ink-subtle">Realizada em {new Date(analise.created_at).toLocaleString("pt-BR")}</p>

      {analise.resumo && (
        <div className="bg-surface-2 border border-hairline rounded-xl p-4">
          <p className="text-[13px] text-ink-muted leading-relaxed">{analise.resumo}</p>
        </div>
      )}

      {analise.stack_principal?.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Target className="w-3 h-3 text-accent" /> Stack Principal
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analise.stack_principal.map((s) => (
              <span key={s} className="text-[12px] px-2.5 py-1 rounded-lg bg-accent/10 text-accent border border-accent/20">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {(analise.salario_estimado_min || analise.salario_estimado_max) && (
        <div className="flex items-center justify-between bg-surface-2 border border-hairline rounded-xl px-4 py-3">
          <span className="text-[12px] text-ink-subtle">Faixa Salarial Estimada</span>
          <span className="text-[15px] font-bold metallic-gradient tabular-nums">
            {analise.salario_estimado_min ? `R$ ${analise.salario_estimado_min.toLocaleString("pt-BR")}` : "—"}
            {analise.salario_estimado_max && analise.salario_estimado_min !== analise.salario_estimado_max
              ? ` — R$ ${analise.salario_estimado_max.toLocaleString("pt-BR")}` : ""}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-danger" /> Obrigatórios
          </p>
          {analise.requisitos_obrigatorios?.length > 0 ? (
            <ul className="space-y-1.5">
              {analise.requisitos_obrigatorios.map((r, i) => (
                <li key={i} className="text-[12px] text-ink-muted flex items-start gap-2">
                  <span className="text-danger mt-0.5">&bull;</span>
                  <span>{typeof r === 'string' ? r : r.descricao}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-ink-tertiary">Nenhum destacado</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-accent" /> Diferenciais
          </p>
          {analise.requisitos_desejaveis?.length > 0 ? (
            <ul className="space-y-1.5">
              {analise.requisitos_desejaveis.map((r, i) => (
                <li key={i} className="text-[12px] text-ink-muted flex items-start gap-2">
                  <span className="text-accent mt-0.5">&bull;</span>
                  <span>{typeof r === 'string' ? r : r.descricao}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-ink-tertiary">Nenhum destacado</p>
          )}
        </div>
      </div>

      {analise.soft_skills?.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-2">Soft Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {analise.soft_skills.map((s) => (
              <span key={s} className="text-[12px] px-2.5 py-1 rounded-lg bg-warning/10 text-warning border border-warning/20">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {analise.palavras_chave_ats?.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3 text-accent" /> Palavras-chave ATS
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analise.palavras_chave_ats.map((p) => (
              <span key={p} className="text-[11px] px-2 py-0.5 rounded bg-surface-2 text-ink-subtle border border-hairline">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-hairline">
        <button onClick={() => onAction("match")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-success/10 text-success hover:bg-success/20 border border-success/20 transition-colors">
          <Target className="w-3.5 h-3.5" /> Calcular Match
        </button>
        <button onClick={() => onAction("cover_letter")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors">
          <FileText className="w-3.5 h-3.5" /> Cover Letter
        </button>
      </div>
    </div>
  );
}
