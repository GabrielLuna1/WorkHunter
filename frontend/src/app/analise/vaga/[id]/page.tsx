"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Briefcase, MapPin, DollarSign, BadgeCheck, Clock,
  Target, TrendingUp, AlertTriangle, FileText, BarChart3,
  BrainCircuit, Sparkles, Bookmark, SendHorizonal, MessageCircle,
  Loader2, ExternalLink, ChevronRight, CheckCircle2, XCircle, Zap, Check,
} from "lucide-react";
import {
  obterAnaliseCompleta, atualizarVagaUsuario,
  type AnaliseCompleta,
} from "@/lib/api";
import { PageTransition } from "@/components/ui/PageTransition";
import { MatchBreakdown } from "@/components/ai/MatchBreakdown";
import { useChat } from "@/lib/chat-context";
import { cn } from "@/lib/utils";

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-ink-muted">
      <span className="text-ink-tertiary shrink-0">{icon}</span>
      <span className="shrink-0 text-ink-subtle">{label}:</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function SectionCard({ title, icon, children, className }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-surface border border-hairline rounded-xl p-5 card-glow", className)}>
      <h3 className="text-[13px] font-semibold text-ink-subtle uppercase tracking-wider mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function AnaliseVagaPage() {
  const params = useParams();
  const id = params?.id as string;
  const { openChatWithVaga } = useChat();

  const [data, setData] = useState<AnaliseCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    obterAnaliseCompleta(id)
      .then((d) => {
        if (!d) throw new Error("Análise não encontrada");
        setData(d);
      })
      .catch((e) => setError(e.message || "Erro ao carregar análise"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSalvar = async () => {
    if (!id || saving) return;
    setSaving(true);
    try {
      await atualizarVagaUsuario(id, { salva: true });
      setData((prev) => prev ? { ...prev, status: { ...prev.status!, salva: true } } : prev);
    } catch {}
    setSaving(false);
  };

  const handleAnalisarIA = () => {
    openChatWithVaga({
      vagaId: id,
      titulo: data?.vaga?.titulo || "",
      empresa: data?.vaga?.empresa || "",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <BrainCircuit className="w-8 h-8 text-accent animate-pulse" />
          <p className="text-sm font-medium text-ink-subtle uppercase tracking-wider">Carregando análise...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <PageTransition className="min-h-screen bg-canvas flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 px-8 py-8 rounded-2xl bg-danger/5 border border-danger/20 text-center max-w-lg">
          <AlertTriangle className="w-8 h-8 text-danger mb-2" />
          <div>
            <h2 className="font-heading text-lg font-medium text-ink mb-2">Análise não disponível</h2>
            <p className="text-[14px] text-ink-subtle leading-relaxed">{error || "Vaga não encontrada ou ainda não analisada."}</p>
            <p className="text-[13px] text-ink-tertiary mt-2">Use o botão IA no card da vaga para iniciar a análise.</p>
          </div>
          <Link
            href="/vagas"
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para vagas
          </Link>
        </div>
      </PageTransition>
    );
  }

  const { vaga, analise, match, status, pipeline } = data;

  return (
    <PageTransition className="min-h-screen bg-canvas pb-12">
      <header className="border-b border-hairline bg-canvas/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="px-8 py-6">
          <Link
            href="/vagas"
            className="inline-flex items-center gap-1.5 text-[12px] text-ink-subtle hover:text-accent transition-colors w-fit mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Vagas
          </Link>
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold metallic-gradient tracking-tight font-heading mb-1">
                {vaga.titulo}
              </h1>
              <p className="text-[14px] text-ink-subtle">{vaga.empresa}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleAnalisarIA}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Conversar
              </button>
              <button
                onClick={handleSalvar}
                disabled={status?.salva || saving}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors",
                  status?.salva
                    ? "bg-success/10 text-success border-success/20 cursor-default"
                    : "bg-surface-2 text-ink-subtle hover:text-accent border-hairline"
                )}
              >
                <Bookmark className={cn("w-3.5 h-3.5", status?.salva && "fill-current")} />
                {status?.salva ? "Salva" : "Salvar"}
              </button>
              {pipeline && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-accent/10 text-accent border border-accent/20">
                  <ChevronRight className="w-3 h-3" />
                  {pipeline.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-8 py-8 max-w-6xl mx-auto space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">

            <SectionCard title="Informações da Vaga" icon={<Briefcase className="w-3.5 h-3.5 text-accent" />}>
              <div className="space-y-2.5">
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Local" value={vaga.localizacao} />
                <InfoRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Salário"
                  value={vaga.salario_min || vaga.salario_max
                    ? `R$ ${vaga.salario_min?.toLocaleString("pt-BR") || "—"} — R$ ${vaga.salario_max?.toLocaleString("pt-BR") || "—"}`
                    : null} />
                {vaga.tipo_contrato && (
                  <InfoRow icon={<BadgeCheck className="w-3.5 h-3.5" />} label="Tipo" value={vaga.tipo_contrato} />
                )}
                <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Publicada"
                  value={vaga.data_publicacao ? new Date(vaga.data_publicacao).toLocaleDateString("pt-BR") : null} />
                <InfoRow icon={<ExternalLink className="w-3.5 h-3.5" />} label="Fonte" value={vaga.fonte} />
              </div>
              {vaga.descricao && (
                <div className="mt-4 pt-4 border-t border-hairline">
                  <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-2">Descrição</p>
                  <p className="text-[13px] text-ink-muted leading-relaxed whitespace-pre-wrap line-clamp-6">{vaga.descricao}</p>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-hairline">
                <a
                  href={vaga.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver vaga original
                </a>
              </div>
            </SectionCard>

            {analise && (
              <>
                <SectionCard title="Análise de Requisitos" icon={<Target className="w-3.5 h-3.5 text-accent" />}>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      {analise.stack_principal?.length > 0 && (
                        <div>
                          <p className="text-[11px] text-ink-subtle mb-1.5">Stack principal</p>
                          <div className="flex flex-wrap gap-1">
                            {analise.stack_principal.map((s) => (
                              <span key={s} className="text-[11px] px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {analise.soft_skills?.length > 0 && (
                        <div>
                          <p className="text-[11px] text-ink-subtle mb-1.5">Soft skills</p>
                          <div className="flex flex-wrap gap-1">
                            {analise.soft_skills.map((s) => (
                              <span key={s} className="text-[11px] px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {analise.resumo && (
                      <div className="pt-3 border-t border-hairline">
                        <p className="text-[11px] text-ink-subtle mb-1.5">Resumo</p>
                        <p className="text-[13px] text-ink-muted leading-relaxed">{analise.resumo}</p>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Requisitos vs Diferenciais" icon={<FileText className="w-3.5 h-3.5 text-accent" />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-danger" />
                        Obrigatórios
                      </p>
                      {analise.requisitos_obrigatorios?.length > 0 ? (
                        <ul className="space-y-1.5">
                          {analise.requisitos_obrigatorios.map((r, i) => (
                            <li key={i} className="text-[12px] text-ink-muted flex items-start gap-2">
                              <span className="text-danger mt-0.5">&bull;</span>
                              {r.descricao}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[12px] text-ink-tertiary">Nenhum requisito obrigatório destacado.</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-accent" />
                        Diferenciais
                      </p>
                      {analise.requisitos_desejaveis?.length > 0 ? (
                        <ul className="space-y-1.5">
                          {analise.requisitos_desejaveis.map((r, i) => (
                            <li key={i} className="text-[12px] text-ink-muted flex items-start gap-2">
                              <span className="text-accent mt-0.5">&bull;</span>
                              {r.descricao}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[12px] text-ink-tertiary">Nenhum diferencial destacado.</p>
                      )}
                    </div>
                  </div>
                </SectionCard>

                {analise.palavras_chave_ats?.length > 0 && (
                  <SectionCard title="Palavras-chave ATS" icon={<BarChart3 className="w-3.5 h-3.5 text-accent" />}>
                    <div className="flex flex-wrap gap-1.5">
                      {analise.palavras_chave_ats.map((p) => (
                        <span key={p} className="text-[11px] px-2 py-0.5 rounded bg-surface-2 text-ink-subtle border border-hairline">
                          {p}
                        </span>
                      ))}
                    </div>
                  </SectionCard>
                )}
              </>
            )}
          </div>

          <div className="space-y-6">

            {match && match.detalhes ? (
              <SectionCard title="Match Score" icon={<TrendingUp className="w-3.5 h-3.5 text-accent" />}>
                <MatchBreakdown match={{
                  id: id,
                  vaga_id: id,
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
                <div className="mt-4 pt-3 border-t border-hairline">
                  <button
                    onClick={handleAnalisarIA}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Otimizar currículo para esta vaga
                  </button>
                </div>
              </SectionCard>
            ) : (
              <SectionCard title="Match Score" icon={<TrendingUp className="w-3.5 h-3.5 text-ink-tertiary" />}>
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <BrainCircuit className="w-8 h-8 text-ink-tertiary" />
                  <p className="text-[13px] text-ink-subtle">Nenhum match calculado ainda.</p>
                  <button
                    onClick={handleAnalisarIA}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Calcular match
                  </button>
                </div>
              </SectionCard>
            )}

            {analise && (
              <SectionCard title="Estimativa Salarial" icon={<DollarSign className="w-3.5 h-3.5 text-accent" />}>
                <div className="text-center py-2">
                  {analise.salario_estimado_min || analise.salario_estimado_max ? (
                    <>
                      <p className="text-2xl font-bold metallic-gradient tabular-nums">
                        {analise.salario_estimado_min ? `R$ ${analise.salario_estimado_min.toLocaleString("pt-BR")}` : "—"}
                        {analise.salario_estimado_max && analise.salario_estimado_min !== analise.salario_estimado_max
                          ? ` — R$ ${analise.salario_estimado_max.toLocaleString("pt-BR")}`
                          : ""}
                      </p>
                      <p className="text-[11px] text-ink-subtle mt-1">Estimativa de faixa salarial</p>
                    </>
                  ) : (
                    <p className="text-[13px] text-ink-muted">Salário não estimado para esta vaga.</p>
                  )}
                </div>
                {analise.nivel && (
                  <div className="mt-3 pt-3 border-t border-hairline flex items-center justify-between">
                    <span className="text-[12px] text-ink-subtle">Nível estimado</span>
                    <span className="text-[13px] font-medium text-ink capitalize">{analise.nivel.replace(/_/g, " ")}</span>
                  </div>
                )}
              </SectionCard>
            )}

            <SectionCard title="Ações" icon={<Sparkles className="w-3.5 h-3.5 text-accent" />}>
              <div className="space-y-2">
                <button
                  onClick={handleSalvar}
                  disabled={status?.salva || saving}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors",
                    status?.salva
                      ? "bg-success/10 text-success border-success/20 cursor-default"
                      : "bg-surface-2 text-ink-subtle hover:text-accent border-hairline"
                  )}
                >
                  <Bookmark className={cn("w-3.5 h-3.5", status?.salva && "fill-current")} />
                  {status?.salva ? "Salva no Pipeline" : "Salvar no Pipeline"}
                </button>
                <button
                  onClick={handleAnalisarIA}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Abrir no Chat IA
                </button>
              </div>
            </SectionCard>

          </div>
        </div>
      </main>
    </PageTransition>
  );
}
