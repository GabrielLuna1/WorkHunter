"use client";

import { BarChart3, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "salva", label: "Salvas", color: "var(--color-ink-muted)" },
  { key: "aplicada", label: "Aplicadas", color: "var(--color-accent)" },
  { key: "em_analise", label: "Em Análise", color: "var(--color-accent)" },
  { key: "entrevista_rh", label: "Entrevista RH", color: "var(--color-warning)" },
  { key: "entrevista_tecnica", label: "Entrevista Técnica", color: "var(--color-warning)" },
  { key: "teste_tecnico", label: "Teste Técnico", color: "#3b82f6" },
  { key: "contratado", label: "Contratado", color: "var(--color-success)" },
  { key: "rejeitado", label: "Rejeitado", color: "var(--color-danger)" },
];

export function PipelineView({ data, onAction }: {
  data: Record<string, number>;
  onAction: (action: string) => void;
}) {
  const total = data.total ?? Object.values(data).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  const maxVal = Math.max(...STAGES.map(s => data[s.key] ?? 0), 1);

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-base font-semibold metallic-gradient font-heading mb-1">Pipeline</h2>
      <p className="text-[12px] text-ink-subtle">{total} candidaturas no total</p>

      <div className="space-y-2">
        {STAGES.map((s) => {
          const count = data[s.key] ?? 0;
          const pct = (count / maxVal) * 100;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-[110px] text-[12px] text-ink-subtle shrink-0">{s.label}</span>
              <div className="flex-1 h-5 bg-surface-3 rounded-full overflow-hidden border border-hairline">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: s.color }} />
              </div>
              <span className="w-8 text-right text-[12px] font-medium text-ink tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>

      <button onClick={() => onAction("pipeline_status")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors">
        <BarChart3 className="w-3.5 h-3.5" /> Atualizar
      </button>
    </div>
  );
}
