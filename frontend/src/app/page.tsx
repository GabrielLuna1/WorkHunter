"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Sparkles, ExternalLink, Send, Search, AlertCircle, LayoutGrid, Briefcase, Clock, TrendingUp, AlertTriangle, Users, ArrowRight } from "lucide-react";
import { listarVagas, coletarAgora, analisarVagaIA, criarPipeline, getOverview, Overview, pipelineEstatisticas, syncPipelineEventos, obterPerfil, limparVagasIrrelevantes, api } from "@/lib/api";
import type { Vaga, PerfilUsuario } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/ui/PageTransition";
import Link from "next/link";

function ScoreRing({ score, size = 32 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score, 100) / 100;
  const color = score >= 80 ? "var(--color-success)" : score >= 60 ? "var(--color-accent)" : score >= 40 ? "var(--color-warning)" : "var(--color-danger)";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-hairline-strong" strokeWidth={3} />
        <circle
          strokeDashoffset={circ * (1 - pct)}
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray={circ} strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold" style={{ color }}>{score}</span>
    </div>
  );
}

function Card({ titulo, valor, cor, icone: Icon, desc }: { titulo: string; valor: string | number; cor: string; icone: React.ElementType; desc?: string }) {
  return (
    <div className="bg-surface border border-hairline rounded-xl p-5 flex flex-col justify-between h-full stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className="text-[12px] text-ink-subtle uppercase tracking-wider font-semibold">{titulo}</div>
        <div className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center">
          <Icon className="w-4 h-4 text-ink-tertiary" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-heading font-semibold" style={{ color: cor }}>{valor}</div>
        {desc && <div className="text-[13px] text-ink-muted mt-2 leading-relaxed">{desc}</div>}
      </div>
    </div>
  );
}

export default function Home() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [pipelineStats, setPipelineStats] = useState<Record<string, number> | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [coletando, setColetando] = useState(false);
  const [statusColeta, setStatusColeta] = useState<any>(null);
  const [analisando, setAnalisando] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [termoBusca, setTermoBusca] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [vagasData, overviewData, pipeStats, perfilData, statusRes] = await Promise.all([
        listarVagas({ limit: 20 }),
        getOverview().catch(() => null),
        pipelineEstatisticas().catch(() => null),
        obterPerfil().catch(() => null),
        api.get("/api/v1/sistema/coleta/status").catch(() => null),
      ]);
      setVagas(vagasData);
      setOverview(overviewData);
      setPipelineStats(pipeStats as unknown as Record<string, number> | null);
      setPerfil(perfilData);

      if (statusRes && statusRes.data && statusRes.data.status === "rodando") {
        setStatusColeta(statusRes.data);
        setColetando(true);
      }
    } catch {
      setErro("Backend indisponível. Verifique se o servidor FastAPI está rodando (porta 8070).");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Polling em background para acompanhar o status detalhado da coleta
  useEffect(() => {
    if (!coletando) return;
    let timer: NodeJS.Timeout;
    
    async function verificarProgresso() {
      try {
        const res = await api.get("/api/v1/sistema/coleta/status");
        const data = res.data;
        setStatusColeta(data);
        
        if (data.status === "concluido" || data.status === "erro" || data.status === "ocioso" || data.status === "cancelado") {
          setColetando(false);
          await carregar();
          if (data.status === "concluido") {
            setMsg(data.mensagem);
          } else if (data.status === "erro") {
            setErro(data.mensagem);
          }
        } else {
          timer = setTimeout(verificarProgresso, 1500);
        }
      } catch {
        timer = setTimeout(verificarProgresso, 2000);
      }
    }

    verificarProgresso();
    return () => clearTimeout(timer);
  }, [coletando, carregar]);

  const handleColetar = async () => {
    setColetando(true);
    setMsg(null);
    setErro(null);
    setStatusColeta({
      status: "rodando",
      mensagem: "Iniciando a busca de vagas...",
      progresso: 5,
      coletor_atual: "Inicializando",
      detalhes: ["Iniciando motores de busca de vagas..."]
    });
    try {
      await api.post("/api/v1/sistema/coletar-agora", {
        termo_busca: termoBusca.trim() || undefined
      });
    } catch {
      setErro("Falha ao iniciar a coleta de vagas.");
      setColetando(false);
    }
  };

  const handleCancelarColeta = async () => {
    try {
      await api.post("/api/v1/sistema/coletar-agora/cancelar");
      setStatusColeta((prev) => prev ? { ...prev, status: "cancelado", mensagem: "Cancelando..." } : prev);
    } catch {
      // silent
    }
  };

  const handleAnalisar = async (vagaId: string) => {
    setAnalisando(vagaId);
    setErro(null);
    try {
      await analisarVagaIA(vagaId);
      await carregar();
    } catch {
      setErro("Falha de comunicação com o LLM Local.");
    } finally {
      setAnalisando(null);
    }
  };

  const handleCandidatar = async (vagaId: string) => {
    setErro(null);
    try {
      await criarPipeline(vagaId, "salva");
      await syncPipelineEventos().catch(() => {});
      setMsg("Vaga movida para o Pipeline!");
      await carregar();
    } catch {
      setErro("Vaga já está no Pipeline.");
    }
  };

  return (
    <PageTransition className="min-h-screen">
      <header className="border-b border-hairline bg-canvas/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="px-8 py-6 flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold metallic-gradient tracking-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
              Discovery
            </h1>
            <p className="text-sm text-ink-subtle flex items-center gap-2 animate-fade-in-up delay-100">
              <Search className="w-4 h-4" />
              {overview
                ? `${overview.total_vagas} oportunidades mapeadas — ${vagas.length} mais recentes`
                : "Explorando oportunidades..."}
            </p>
            {perfil && perfil.cargos_alvo && perfil.cargos_alvo.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 animate-fade-in-up delay-200">
                {perfil.cargos_alvo.map((cargo) => (
                  <span key={cargo} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent border border-accent/20">
                    {cargo}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 animate-fade-in-up delay-200">
            <Link
              href="/vagas"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-surface border border-hairline text-sm font-medium text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors"
            >
              Explorar Todas as Vagas
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="flex gap-2">
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Ex: React Developer, Full Stack, Next.js..."
              className={cn(
                'flex-1 rounded-lg border border-hairline bg-surface',
                'px-4 py-2 text-sm text-ink placeholder-ink-muted',
                'focus:outline-none focus:border-accent/50'
              )}
              onKeyDown={(e) => e.key === 'Enter' && handleColetar()}
            />
            <button
              onClick={handleColetar}
              disabled={coletando}
              className={cn(
                "flex items-center gap-2 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-md shadow-sm transition-all shadow-accent/20 border border-accent hover:bg-accent-hover active:scale-95",
                coletando && "opacity-70 cursor-not-allowed scale-100"
              )}
            >
              {coletando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Coletando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Iniciar Coleta</span>
                </>
              )}
            </button>
          </div>
          </div>
        </div>
      </header>

      <main className="px-8 py-8 space-y-8">
        {(msg || erro) && (
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-md border text-sm font-medium animate-fade-in-up",
              msg ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"
            )}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{msg || erro}</span>
            <button onClick={() => { setMsg(null); setErro(null); }} className="ml-auto opacity-70 hover:opacity-100 transition-opacity">
              &times;
            </button>
          </div>
        )}

        {coletando && statusColeta && (
          <section className="bg-surface border border-accent/20 rounded-xl p-6 space-y-4 animate-fade-in-up shadow-lg shadow-accent/5 relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink font-heading" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Radar de Coleta Ativo
                  </h3>
                  <p className="text-[13px] text-accent animate-pulse font-medium mt-0.5">
                    {statusColeta.mensagem}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancelarColeta}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                >
                  Cancelar
                </button>
                <div className="text-right">
                  <span className="text-2xl font-bold metallic-gradient font-heading">
                    {statusColeta.progresso}%
                  </span>
                  <p className="text-[10px] text-ink-tertiary uppercase tracking-wider font-semibold">Progresso</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden border border-hairline relative">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-accent/60 via-accent to-accent-hover transition-all duration-500 ease-out"
                style={{ width: `${statusColeta.progresso}%` }}
              />
            </div>

            {/* Steps log */}
            {statusColeta.detalhes && statusColeta.detalhes.length > 0 && (
              <div className="space-y-2 mt-4 pt-4 border-t border-hairline/50">
                <h4 className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider">
                  Etapas e Portais Consultados
                </h4>
                <div className="bg-surface-2/60 border border-hairline/50 rounded-lg p-3 max-h-[160px] overflow-y-auto space-y-1.5 font-mono text-[11px] scrollbar-thin text-ink-muted">
                  {statusColeta.detalhes.map((detalhe: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-accent shrink-0">›</span>
                      <span className={cn(
                        detalhe.includes('✓') && "text-success font-medium",
                        detalhe.includes('❌') && "text-danger"
                      )}>
                        {detalhe}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {overview && (
          <section className="animate-fade-in-up delay-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card titulo="Total Radar" valor={overview.total_vagas} cor="var(--color-ink)" icone={Briefcase} desc="Volume total processado." />
              <Card titulo="Match Score" valor={overview.score_medio} cor="var(--color-success)" icone={TrendingUp} desc="Índice médio de afinidade." />
              <Card titulo="Fake Junior" valor={overview.fake_junior_count} cor="var(--color-danger)" icone={AlertTriangle} desc="Anomalias de sênioridade detectadas." />
              <Card titulo="Top Matches" valor={overview.alertas.length} cor="var(--color-accent)" icone={Users} desc="Vagas com score ≥ 85." />
            </div>
          </section>
        )}

        {pipelineStats && (pipelineStats.total ?? 0) > 0 && (
          <section className="animate-fade-in-up delay-150">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-[12px] font-semibold text-ink-subtle uppercase tracking-wider">
                Pipeline
              </h2>
              <Link
                href="/kanban"
                className="text-[12px] font-medium text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
              >
                Ver Kanban <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { key: "salva", label: "Salvas", color: "var(--color-ink-muted)" },
                { key: "aplicada", label: "Aplicadas", color: "var(--color-accent)" },
                { key: "em_analise", label: "Em Análise", color: "var(--color-accent)" },
                { key: "entrevista_rh", label: "Entrevista RH", color: "var(--color-warning)" },
                { key: "entrevista_tecnica", label: "Entrevista Técnica", color: "var(--color-warning)" },
                { key: "teste_tecnico", label: "Teste Técnico", color: "var(--color-warning)" },
                { key: "contratado", label: "Contratado", color: "var(--color-success)" },
                { key: "rejeitado", label: "Rejeitado", color: "var(--color-danger)" },
              ].map((s) => (
                <div key={s.key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-hairline">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[13px] font-medium text-ink">{pipelineStats[s.key] ?? 0}</span>
                  <span className="text-[11px] text-ink-subtle">{s.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {overview && overview.alertas.length > 0 && (
          <section className="animate-fade-in-up delay-200">
            <h2 className="text-[12px] font-semibold text-ink-subtle uppercase tracking-wider mb-3">
              Oportunidades High-Score
            </h2>
            <div className="bg-surface border border-hairline rounded-xl overflow-hidden">
              <div className="divide-y divide-hairline">
                {overview.alertas.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors group">
                    <div className="min-w-0 pr-4">
                      <p className="text-[14px] font-medium text-ink truncate">{a.titulo}</p>
                      <p className="text-[12px] text-ink-muted">{a.empresa}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded tracking-wide">
                        {a.score} MATCH
                      </span>
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-accent hover:text-accent-hover transition-colors opacity-0 group-hover:opacity-100">
                        Investigar ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="animate-fade-in-up delay-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[12px] font-semibold text-ink-subtle uppercase tracking-wider">
              Últimas Vagas Detectadas
            </h2>
            <Link
              href="/vagas"
              className="text-[12px] font-medium text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-surface border border-hairline rounded-xl p-6 h-[200px] animate-pulse">
                  <div className="flex gap-4 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-surface-2" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-surface-2 rounded-md w-3/4" />
                      <div className="h-3 bg-surface-2 rounded-md w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-surface-2 rounded-md w-full" />
                    <div className="h-3 bg-surface-2 rounded-md w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : vagas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-xl bg-surface flex items-center justify-center border border-hairline mb-4">
                <LayoutGrid className="w-8 h-8 text-ink-subtle" />
              </div>
              <h3 className="font-heading text-lg text-ink mb-1">O Radar está vazio</h3>
              <p className="text-sm text-ink-subtle max-w-sm">
                Nenhuma oportunidade encontrada. Inicie uma coleta para mapear o mercado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {vagas.map((vaga, i) => (
                <div
                  key={vaga.id}
                  className="bg-surface border border-hairline rounded-xl p-5 flex flex-col card-glow animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-2 border border-hairline flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-ink-tertiary" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-ink-subtle">{vaga.empresa}</p>
                        <span className="inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded text-[10px] font-semibold bg-surface-2 text-ink-muted border border-hairline uppercase">
                          {vaga.fonte}
                        </span>
                      </div>
                    </div>
                    <ScoreRing score={vaga.score} />
                  </div>

                  <h3 className="font-heading text-[15px] font-medium text-ink leading-snug mb-2 line-clamp-2">
                    {vaga.titulo}
                  </h3>

                  <p className="text-[13px] text-ink-muted leading-relaxed line-clamp-2 flex-1 mb-4">
                    {vaga.descricao}
                  </p>

                  {vaga.analise?.fake_junior && (
                    <div className="mb-4 inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-danger/10 text-danger border border-danger/20 w-fit">
                      Alerta Fake Júnior
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-hairline flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-ink-subtle">
                      <Clock className="w-3.5 h-3.5" />
                      {vaga.coletada_em ? new Date(vaga.coletada_em).toLocaleDateString() : "Hoje"}
                    </div>

                    <div className="flex items-center gap-1">
                      <a
                        href={vaga.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md text-ink-subtle hover:text-ink hover:bg-surface-2 transition-colors quick-action"
                        title="Visitar Vaga"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleAnalisar(vaga.id)}
                        disabled={analisando === vaga.id || !!vaga.analise_ia}
                        className={cn(
                          "p-1.5 rounded-md transition-colors quick-action",
                          vaga.analise_ia
                            ? "text-accent bg-accent/10 cursor-default"
                            : "text-ink-subtle hover:text-ink hover:bg-surface-2",
                          analisando === vaga.id && "animate-pulse"
                        )}
                        title={vaga.analise_ia ? "Análise IA concluída" : "Analisar com IA"}
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCandidatar(vaga.id)}
                        className="p-1.5 rounded-md text-ink-subtle hover:text-success hover:bg-success/10 transition-colors quick-action"
                        title="Salvar no Pipeline"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
