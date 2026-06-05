"use client";

import { BrainCircuit } from "lucide-react";
import { MatchBreakdown } from "@/components/ai/MatchBreakdown";
import type { MatchResult } from "@/lib/api";

export function MatchView({ match, vagaId, onAction }: {
  match: MatchResult;
  vagaId?: string;
  onAction: (action: string) => void;
}) {
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-base font-semibold metallic-gradient font-heading mb-1">Match Score</h2>
      <p className="text-[12px] text-ink-subtle">Compatibilidade calculada em {new Date(match.created_at).toLocaleString("pt-BR")}</p>

      <div className="bg-surface-2 border border-hairline rounded-xl p-5">
        <MatchBreakdown match={match} />
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-hairline">
        <button onClick={() => onAction("cover_letter")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors">
          <BrainCircuit className="w-3.5 h-3.5" /> Cover Letter
        </button>
      </div>
    </div>
  );
}
