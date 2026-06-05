"use client";

import { useState, useEffect } from "react";
import { 
  Briefcase, MapPin, DollarSign, BadgeCheck, Clock, 
  Target, TrendingUp, AlertTriangle, FileText, BarChart3,
  BrainCircuit, Sparkles, Bookmark, MessageCircle, ChevronRight,
  ExternalLink
} from "lucide-react";
import { obterAnaliseCompleta, atualizarVagaUsuario, type AnaliseCompleta } from "@/lib/api";
import { MatchBreakdown } from "@/components/ai/MatchBreakdown";
import { cn } from "@/lib/utils";

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5 text-[12px] text-ink-muted">
      <span className="text-ink-tertiary shrink-0">{icon}</span>
      <span className="shrink-0 text-ink-subtle">{label}:</span>
      <span className="text-ink line-clamp-1">{value}</span>
    </div>
  );
}

function SectionCard({ title, icon, children, className }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-surface border border-hairline rounded-xl p-4 card-glow", className)}>
      <h3 className="text-[12px] font-semibold text-ink-subtle uppercase tracking-wider mb-3 flex items-center gap-1.5">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

export function AnaliseCompletaView({ vagaId, onAction }: { vagaId: string; onAction: (action: string, id?: string) => void }) {
  const [data, setData] = useState<AnaliseCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!vagaId) return;
    setLoading(true);
    obterAnaliseCompleta(vagaId)
      .then((d) => {
        if (!d) throw new Error("Análise não encontrada");
        setData(d);
      })
      .catch((e) => setError(e.message || "Erro ao carregar análise"))
      .finally(() => setLoading(false));
  }, [vagaId]);

  const handleSalvar = async () => {
    if (!vagaId || saving || data?.status?.salva) return;
    setSaving(true);
    try {
      await atualizarVagaUsuario(vagaId, { salva: true });
      setData((prev) => prev ? { ...prev, status: { ...prev.status!, salva: true } } : prev);
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <BrainCircuit className="w-8 h-8 text-accent animate-pulse" />
        <p className="text-[12px] font-medium text-ink-subtle uppercase tracking-wider">Carregando análise...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <AlertTriangle className="w-8 h-8 text-danger" />
        <p className="text-[13px] text-ink-subtle">{error || "Vaga não encontrada ou ainda não analisada."}</p>
        <button onClick={() => onAction("analisar", vagaId)}
          className="mt-2 text-[12px] text-accent hover:underline">
          Iniciar nova análise
        </button>
      </div>
    );
  }

  const { vaga, analise, match, status, pipeline } = data;

  return (
    <div className="p-5 space-y-5 h-full overflow-y-auto">
      <div className="space-y-1.5 pb-4 border-b border-hairline">
        <h2 className="text-base font-semibold metallic-gradient font-heading leading-tight">{vaga.titulo}</h2>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-ink-subtle">{vaga.empresa}</p>
          {pipeline && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-accent/10 text-accent border border-accent/20">
              <ChevronRight className="w-2.5 h-2.5" />
              {pipeline.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      <SectionCard title="Match Score" icon={<TrendingUp className="w-3.5 h-3.5 text-accent" />}>
        {match && match.detalhes ? (
          <MatchBreakdown match={{
            id: vagaId,
            vaga_id: vagaId,
            score_geral: match.score || 0,
            score_tecnico: match.detalhes.score_tecnico,
            score_experiencia: match.detalhes.score_experiencia,
            score_soft_skills: match.detalhes.score_soft_skills,
            skills_match: match.detalhes.skills_match || [],
            missing_skills: match.detalhes.missing_skills || [],
            gaps: match.detalhes.gaps || [],
            chance_entrevista: match.detalhes.chance_entrevista || "media",
            created_at: match.analisado_em || "",
          }} />
        ) : (
          <div className="text-center py-2">
            <p className="text-[12px] text-ink-muted mb-3">O match ainda não foi calculado.</p>
            <button onClick={() => onAction("match", vagaId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors">
              <Target className="w-3.5 h-3.5" /> Calcular Match
            </button>
          </div>
        )}
      </SectionCard>

      {analise && (
        <>
          <SectionCard title="Análise da Vaga" icon={<Target className="w-3.5 h-3.5 text-accent" />}>
             {analise.resumo && (
                <p className="text-[12px] text-ink-muted leading-relaxed mb-4">{analise.resumo}</p>
             )}
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <p className="text-[11px] text-ink-subtle mb-1">Stack Principal</p>
                  <div className="flex flex-wrap gap-1">
                    {analise.stack_principal?.map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">{s}</span>
                    ))}
                  </div>
               </div>
               <div>
                  <p className="text-[11px] text-ink-subtle mb-1">Soft Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {analise.soft_skills?.map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">{s}</span>
                    ))}
                  </div>
               </div>
             </div>
          </SectionCard>

          <SectionCard title="Requisitos" icon={<FileText className="w-3.5 h-3.5 text-accent" />}>
             <div className="space-y-4">
                <div>
                   <p className="text-[11px] font-semibold text-danger uppercase tracking-wider mb-2">Obrigatórios</p>
                   <ul className="space-y-1">
                     {analise.requisitos_obrigatorios?.map((r, i) => (
                       <li key={i} className="text-[11px] text-ink-muted flex items-start gap-1.5">
                         <span className="text-danger mt-0.5">&bull;</span>
                         {typeof r === 'string' ? r : r.descricao}
                       </li>
                     ))}
                   </ul>
                </div>
                {analise.requisitos_desejaveis?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">Diferenciais</p>
                    <ul className="space-y-1">
                      {analise.requisitos_desejaveis.map((r, i) => (
                        <li key={i} className="text-[11px] text-ink-muted flex items-start gap-1.5">
                          <span className="text-accent mt-0.5">&bull;</span>
                          {typeof r === 'string' ? r : r.descricao}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
             </div>
          </SectionCard>
        </>
      )}

      <SectionCard title="Detalhes" icon={<Briefcase className="w-3.5 h-3.5 text-accent" />}>
        <div className="space-y-2">
          <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Local" value={vaga.localizacao} />
          <InfoRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Salário" value={vaga.salario_min || vaga.salario_max ? `R$ ${vaga.salario_min?.toLocaleString("pt-BR") || "—"} — R$ ${vaga.salario_max?.toLocaleString("pt-BR") || "—"}` : null} />
          {vaga.tipo_contrato && <InfoRow icon={<BadgeCheck className="w-3.5 h-3.5" />} label="Tipo" value={vaga.tipo_contrato} />}
          <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Data" value={vaga.data_publicacao ? new Date(vaga.data_publicacao).toLocaleDateString("pt-BR") : null} />
        </div>
      </SectionCard>

      <div className="flex flex-col gap-2 pt-2">
        <button onClick={handleSalvar} disabled={status?.salva || saving}
          className={cn("w-full inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors", status?.salva ? "bg-success/10 text-success border-success/20 cursor-default" : "bg-surface-2 text-ink-subtle hover:text-accent border-hairline")}>
          <Bookmark className={cn("w-3.5 h-3.5", status?.salva && "fill-current")} />
          {status?.salva ? "Salva no Pipeline" : "Salvar no Pipeline"}
        </button>
        <a href={vaga.url} target="_blank" rel="noopener noreferrer"
          className="w-full inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-ink-subtle bg-surface-2 border border-hairline hover:border-accent/30 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> Acessar vaga original
        </a>
      </div>
    </div>
  );
}
