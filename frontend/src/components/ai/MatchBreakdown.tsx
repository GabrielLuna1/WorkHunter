"use client";

import { cn } from "@/lib/utils";
import type { MatchResult } from "@/lib/api";

function ScoreBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min(value / max, 1);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-ink-subtle w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[13px] font-semibold tabular-nums w-10 text-right" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export function MatchBreakdown({ match, className }: { match: MatchResult; className?: string }) {
  const chanceColor =
    match.chance_entrevista === "alta" ? "var(--color-success)" :
    match.chance_entrevista === "baixa" ? "var(--color-danger)" :
    "var(--color-accent)";

  const emoji =
    match.chance_entrevista === "alta" ? "🟢" :
    match.chance_entrevista === "baixa" ? "🔴" : "🟡";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold tabular-nums" style={{ color: "var(--color-accent)" }}>
          {match.score_geral}/100
        </span>
        <span className="text-[13px] font-medium" style={{ color: chanceColor }}>
          {emoji} {match.chance_entrevista.toUpperCase()}
        </span>
      </div>

      <div className="space-y-2">
        <ScoreBar label="Técnico" value={match.score_tecnico} color={match.score_tecnico >= 60 ? "var(--color-success)" : "var(--color-accent)"} />
        <ScoreBar label="Experiência" value={match.score_experiencia} color={match.score_experiencia >= 60 ? "var(--color-success)" : "var(--color-accent)"} />
        <ScoreBar label="Soft Skills" value={match.score_soft_skills} color={match.score_soft_skills >= 60 ? "var(--color-success)" : "var(--color-accent)"} />
      </div>

      {match.skills_match.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-1.5">Skills compatíveis</p>
          <div className="flex flex-wrap gap-1">
            {match.skills_match.slice(0, 8).map((s, i) => (
              <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20">
                {s.skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {match.missing_skills.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-1.5">Skills em falta</p>
          <div className="flex flex-wrap gap-1">
            {match.missing_skills.slice(0, 6).map((s, i) => (
              <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-danger/10 text-danger border border-danger/20">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {match.gaps.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-1.5">Gaps</p>
          <ul className="space-y-1">
            {match.gaps.slice(0, 3).map((g, i) => (
              <li key={i} className="text-[12px] text-ink-muted flex items-start gap-1.5">
                <span className={g.impacto === "alto" ? "text-danger" : "text-warning"}>&bull;</span>
                {g.descricao}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
