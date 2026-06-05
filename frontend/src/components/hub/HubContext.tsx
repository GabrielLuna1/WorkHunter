"use client";

import { Loader2, BrainCircuit, MapPin, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { WelcomeView } from "@/app/hub/views/WelcomeView";
import { VagaView } from "@/app/hub/views/VagaView";
import { AnalysisView } from "@/app/hub/views/AnalysisView";
import { MatchView } from "@/app/hub/views/MatchView";
import { PipelineView } from "@/app/hub/views/PipelineView";
import { CoverLetterView } from "@/app/hub/views/CoverLetterView";
import { AnaliseCompletaView } from "@/app/hub/views/AnaliseCompletaView";
import { VagaBrowserView } from "@/components/hub/VagaBrowserView";
import type { Vaga, VagaAnalysisResult, MatchResult } from "@/lib/api";

export type HubView =
  | "welcome"
  | "vaga"
  | "analyze_vaga"
  | "calcular_match"
  | "pipeline_status"
  | "analisar_match"
  | "gerar_cover_letter"
  | "waiting"
  | "vagas_browser"
  | "buscar_vagas"
  | "analise_completa";

export interface HubViewData {
  vaga?: Vaga;
  analise?: VagaAnalysisResult;
  match?: MatchResult;
  pipeline?: Record<string, number>;
  coverLetter?: { text: string; assunto?: string };
  curriculo?: { changes: string[] };
  vagasRecentes?: { titulo: string; empresa: string; score: number }[];
  vagasBusca?: {
    id: string;
    titulo: string;
    empresa: string;
    score: number;
    localizacao: string | null;
    modelo_trabalho: string | null;
    fonte: string;
    url: string;
    no_pipeline: boolean;
    status_pipeline: string | null;
  }[];
  pipelineResumo?: { total: number; salvas: number; aplicadas: number; em_analise: number };
  matchScore?: number | null;
  vagaId?: string;
  toolName?: string;
}

export function HubContext({ view, data, onAction, loading, onSelectVaga }: {
  view: HubView;
  data: HubViewData;
  onAction: (action: string, vagaId?: string) => void;
  loading?: boolean;
  onSelectVaga?: (vaga: Vaga) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-sm text-ink-subtle">Processando...</p>
      </div>
    );
  }

  switch (view) {
    case "welcome":
      return (
        <WelcomeView
          onAction={onAction}
          vagasRecentes={data.vagasRecentes || []}
          pipelineResumo={data.pipelineResumo || { total: 0, salvas: 0, aplicadas: 0, em_analise: 0 }}
        />
      );

    case "vaga":
      return data.vaga ? (
        <VagaView vaga={data.vaga} matchScore={data.matchScore} onAction={onAction} />
      ) : (
        <EmptyView />
      );

    case "analyze_vaga":
      return data.analise ? (
        <AnalysisView analise={data.analise} onAction={onAction} />
      ) : (
        <EmptyView />
      );

    case "calcular_match":
      return data.match ? (
        <MatchView match={data.match} vagaId={data.vagaId} onAction={onAction} />
      ) : (
        <EmptyView />
      );

    case "pipeline_status":
      return data.pipeline ? (
        <PipelineView data={data.pipeline} onAction={onAction} />
      ) : (
        <EmptyView />
      );

    case "gerar_cover_letter":
      return data.coverLetter ? (
        <CoverLetterView text={data.coverLetter.text} assunto={data.coverLetter.assunto} onAction={onAction} />
      ) : (
        <EmptyView />
      );

    case "analisar_match":
      return (
        <div className="p-6 space-y-4">
          <h2 className="text-base font-semibold metallic-gradient font-heading mb-1">Currículo Otimizado</h2>
          {data.curriculo?.changes && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">Alterações</p>
              {data.curriculo.changes.map((c, i) => (
                <div key={i} className="text-[13px] text-ink-muted bg-surface-2 border border-hairline rounded-lg px-4 py-2.5">
                  {c}
                </div>
              ))}
            </div>
          )}
          <p className="text-[12px] text-ink-tertiary">Versão salva em histórico. Confira em Currículo → Versões.</p>
        </div>
      );

    case "buscar_vagas":
      return data.vagasBusca && data.vagasBusca.length > 0 ? (
        <div className="p-4 space-y-3">
          <h2 className="text-base font-semibold metallic-gradient font-heading mb-1">
            Resultados da Busca ({data.vagasBusca.length})
          </h2>
          <div className="space-y-2">
            {data.vagasBusca.map((v, i) => (
              <button
                key={v.id}
                onClick={() => onSelectVaga?.({ id: v.id, titulo: v.titulo, empresa: v.empresa, score: v.score, localizacao: v.localizacao, modelo_trabalho: v.modelo_trabalho, fonte: v.fonte } as any)}
                className="w-full text-left px-3 py-2.5 rounded-lg bg-surface-2 border border-hairline hover:bg-surface-3 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink font-medium truncate group-hover:text-accent transition-colors">
                      {i + 1}. {v.titulo}
                    </p>
                    <p className="text-[12px] text-ink-muted truncate">{v.empresa}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {v.localizacao && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-ink-tertiary">
                          <MapPin className="w-3 h-3" />
                          {v.localizacao}
                        </span>
                      )}
                      {v.modelo_trabalho && (
                        <span className="text-[11px] text-ink-tertiary">{v.modelo_trabalho}</span>
                      )}
                      {v.url && (
                        <a href={v.url} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-accent hover:text-accent-hover underline font-medium">
                          Abrir vaga ↗
                        </a>
                      )}
                      {v.no_pipeline && (
                        <span className="text-[11px] text-accent font-medium">no pipeline</span>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold shrink-0",
                    v.score >= 80 ? "bg-success/10 text-success" :
                    v.score >= 60 ? "bg-accent/10 text-accent" :
                    "bg-surface-2 text-ink-muted"
                  )}>
                    <Target className="w-3 h-3" />
                    {v.score}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <EmptyView />
      );

    case "analise_completa":
      return data.vagaId ? (
        <AnaliseCompletaView vagaId={data.vagaId} onAction={onAction} />
      ) : (
        <EmptyView />
      );

    case "vagas_browser":
      return onSelectVaga ? (
        <VagaBrowserView onSelectVaga={onSelectVaga} onClose={() => onAction("close_browser")} />
      ) : (
        <EmptyView />
      );

    default:
      return <EmptyView />;
  }
}

function EmptyView() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <BrainCircuit className="w-12 h-12 text-ink-tertiary" />
      <p className="text-sm text-ink-subtle">Nada para mostrar ainda</p>
      <p className="text-[12px] text-ink-tertiary">Use o chat ao lado ou as ações rápidas para começar.</p>
    </div>
  );
}
